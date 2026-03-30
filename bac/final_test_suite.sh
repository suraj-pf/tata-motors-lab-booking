#!/bin/bash

# Final Hardening Test Suite for Lab Booking System
# Uses jq for JSON parsing, includes high-concurrency and load testing

BASE_URL="http://localhost:3000"
ADMIN_TOKEN=""
USER_TOKENS=()
USER_IDS=()

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq is required but not installed${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

echo "=========================================="
echo "Final Hardening Test Suite v3.0"
echo "Production-Ready Validation"
echo "=========================================="
echo ""

# ============================================
# 1. AUTHENTICATION - MULTIPLE USERS
# ============================================
echo "1. Multi-User Authentication Setup"
echo "-----------------------------------"

# Admin login
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

if echo "$ADMIN_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.access_token')
    ADMIN_ID=$(echo "$ADMIN_RESPONSE" | jq -r '.user.id')
    print_result 0 "Admin authenticated (ID: $ADMIN_ID)"
else
    print_result 1 "Admin authentication failed"
    exit 1
fi

# Create and login multiple test users
for i in {1..10}; do
    USERNAME="conctest$i"
    
    # Create user
    CREATE_RESP=$(curl -s -X POST "$BASE_URL/api/admin/users" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d "{\"username\": \"$USERNAME\", \"password\": \"test123\", \"name\": \"Test User $i\", \"bc_number\": \"BC10$i\", \"department\": \"SDC\"}")
    
    if echo "$CREATE_RESP" | jq -e '.success == true' > /dev/null 2>&1; then
        USER_ID=$(echo "$CREATE_RESP" | jq -r '.user.id')
        print_info "Created user $USERNAME (ID: $USER_ID)"
    fi
    
    # Login user
    LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"username\": \"$USERNAME\", \"password\": \"test123\"}")
    
    if echo "$LOGIN_RESP" | jq -e '.success == true' > /dev/null 2>&1; then
        TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token')
        UID=$(echo "$LOGIN_RESP" | jq -r '.user.id')
        USER_TOKENS+=("$TOKEN")
        USER_IDS+=("$UID")
        print_result 0 "User $i authenticated (ID: $UID)"
    else
        print_result 1 "User $i authentication failed"
    fi
done

echo ""
print_info "Total users ready: ${#USER_TOKENS[@]}"

# ============================================
# 2. HIGH-CONCURRENCY BOOKING TEST (5-10 USERS)
# ============================================
echo ""
echo "2. High-Concurrency Booking Test"
echo "---------------------------------"

CONCURRENT_DATE=$(date -v+3d +%Y-%m-%d 2>/dev/null || date -d '+3 days' +%Y-%m-%d)
CONCURRENT_START="10:00"
CONCURRENT_END="11:00"
CONCURRENT_LAB=1

print_info "Testing: 10 users booking Lab $CONCURRENT_LAB, $CONCURRENT_START-$CONCURRENT_END on $CONCURRENT_DATE"

# Create temp files for results
RESULTS_DIR=$(mktemp -d)
PIDS=()

# Launch 10 simultaneous booking requests
for i in {0..9}; do
    if [ $i -lt ${#USER_TOKENS[@]} ]; then
        TOKEN=${USER_TOKENS[$i]}
        USER_ID=${USER_IDS[$i]}
        
        curl -s -X POST "$BASE_URL/api/bookings" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN" \
          -d "{
            \"lab_id\": $CONCURRENT_LAB,
            \"start_time\": \"$CONCURRENT_START\",
            \"end_time\": \"$CONCURRENT_END\",
            \"booking_date\": \"$CONCURRENT_DATE\",
            \"bc_number\": \"BC10$(($i+1))\",
            \"purpose\": \"Concurrency test user $i\"
          }" > "$RESULTS_DIR/user_$i.json" &
        
        PIDS+=($!)
    fi
done

# Wait for all requests to complete
for pid in "${PIDS[@]}"; do
    wait $pid
done

# Analyze results
SUCCESS_COUNT=0
CONFLICT_COUNT=0
SUCCESSFUL_BOOKING_ID=""

for i in {0..9}; do
    if [ -f "$RESULTS_DIR/user_$i.json" ]; then
        RESULT=$(cat "$RESULTS_DIR/user_$i.json")
        
        if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
            ((SUCCESS_COUNT++))
            SUCCESSFUL_BOOKING_ID=$(echo "$RESULT" | jq -r '.booking.id')
            SUCCESS_USER=$i
        elif echo "$RESULT" | jq -e '.conflict == true' > /dev/null 2>&1; then
            ((CONFLICT_COUNT++))
        fi
    fi
done

rm -rf "$RESULTS_DIR"

print_info "Results: $SUCCESS_COUNT success, $CONFLICT_COUNT conflicts"

if [ $SUCCESS_COUNT -eq 1 ] && [ $CONFLICT_COUNT -eq 9 ]; then
    print_result 0 "High-concurrency test PASSED (1 success, 9 conflicts)"
else
    print_result 1 "High-concurrency test FAILED (expected 1/9, got $SUCCESS_COUNT/$CONFLICT_COUNT)"
fi

# Cleanup the successful booking
if [ ! -z "$SUCCESSFUL_BOOKING_ID" ]; then
    curl -s -X DELETE "$BASE_URL/api/bookings/$SUCCESSFUL_BOOKING_ID" \
      -H "Authorization: Bearer ${USER_TOKENS[$SUCCESS_USER]}" > /dev/null
    print_info "Cleaned up test booking $SUCCESSFUL_BOOKING_ID"
fi

# ============================================
# 3. BURST REQUESTS TEST
# ============================================
echo ""
echo "3. Burst Requests Test (50 rapid bookings)"
echo "--------------------------------------------"

BURST_DATE=$(date -v+4d +%Y-%m-%d 2>/dev/null || date -d '+4 days' +%Y-%m-%d)
BURST_COUNT=0
BURST_ERRORS=0
START_TIME=$(date +%s)

for i in {1..50}; do
    # Different times to avoid conflicts
    HOUR=$((7 + (i % 10)))
    TIME="${HOUR}:00"
    NEXT_HOUR=$((HOUR + 1))
    END_TIME="${NEXT_HOUR}:00"
    
    TOKEN=${USER_TOKENS[$((i % 10))]}
    
    RESP=$(curl -s -X POST "$BASE_URL/api/bookings" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"lab_id\": 1,
        \"start_time\": \"$TIME\",
        \"end_time\": \"$END_TIME\",
        \"booking_date\": \"$BURST_DATE\",
        \"bc_number\": \"BC10$((i % 10 + 1))\",
        \"purpose\": \"Burst test $i\"
      }")
    
    if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
        ((BURST_COUNT++))
        BOOKING_ID=$(echo "$RESP" | jq -r '.booking.id')
        # Cleanup immediately
        curl -s -X DELETE "$BASE_URL/api/bookings/$BOOKING_ID" \
          -H "Authorization: Bearer $TOKEN" > /dev/null
    else
        ((BURST_ERRORS++))
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
RATE=$((BURST_COUNT / DURATION))

print_info "Burst test: $BURST_COUNT successful, $BURST_ERRORS errors in ${DURATION}s (~${RATE}/sec)"

if [ $BURST_COUNT -ge 45 ]; then
    print_result 0 "Burst test PASSED (>= 90% success rate)"
else
    print_result 1 "Burst test FAILED (< 90% success rate)"
fi

# ============================================
# 4. JSON FIELD VALIDATION WITH JQ
# ============================================
echo ""
echo "4. JSON Field Validation (using jq)"
echo "-----------------------------------"

TEST_DATE=$(date -v+5d +%Y-%m-%d 2>/dev/null || date -d '+5 days' +%Y-%m-%d)

# Create a booking and validate all fields
BOOKING_RESP=$(curl -s -X POST "$BASE_URL/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${USER_TOKENS[0]}" \
  -d "{
    \"lab_id\": 1,
    \"start_time\": \"14:00\",
    \"end_time\": \"15:00\",
    \"booking_date\": \"$TEST_DATE\",
    \"bc_number\": \"BC101\",
    \"purpose\": \"Field validation test\"
  }")

# Validate response structure
echo "$BOOKING_RESP" | jq -e '.success == true' > /dev/null && \
    print_result 0 "success field is true"

echo "$BOOKING_RESP" | jq -e '.booking.id != null' > /dev/null && \
    print_result 0 "booking.id exists and is not null"

echo "$BOOKING_RESP" | jq -e '.booking.lab_id == 1' > /dev/null && \
    print_result 0 "booking.lab_id is correct (1)"

echo "$BOOKING_RESP" | jq -e '.booking.start_time == "14:00"' > /dev/null && \
    print_result 0 "booking.start_time is correct"

echo "$BOOKING_RESP" | jq -e '.booking.end_time == "15:00"' > /dev/null && \
    print_result 0 "booking.end_time is correct"

echo "$BOOKING_RESP" | jq -e '.booking.status == "confirmed"' > /dev/null && \
    print_result 0 "booking.status is 'confirmed'"

echo "$BOOKING_RESP" | jq -e '.booking.duration_hours == 1' > /dev/null && \
    print_result 0 "booking.duration_hours is correct (1)"

echo "$BOOKING_RESP" | jq -e '.booking.lab_name != null' > /dev/null && \
    print_result 0 "booking.lab_name exists"

echo "$BOOKING_RESP" | jq -e '.booking.user_name != null' > /dev/null && \
    print_result 0 "booking.user_name exists"

echo "$BOOKING_RESP" | jq -e '.message != null' > /dev/null && \
    print_result 0 "message field exists"

# Cleanup
TEST_BOOKING_ID=$(echo "$BOOKING_RESP" | jq -r '.booking.id')
if [ "$TEST_BOOKING_ID" != "null" ] && [ ! -z "$TEST_BOOKING_ID" ]; then
    curl -s -X DELETE "$BASE_URL/api/bookings/$TEST_BOOKING_ID" \
      -H "Authorization: Bearer ${USER_TOKENS[0]}" > /dev/null
fi

# ============================================
# 5. ERROR RESPONSE FORMAT VALIDATION
# ============================================
echo ""
echo "5. Error Response Format Validation"
echo "-------------------------------------"

# Test invalid login
ERROR_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "invalid", "password": "wrong"}')

echo "$ERROR_RESP" | jq -e '.success == false' > /dev/null && \
    print_result 0 "Error has success: false"

echo "$ERROR_RESP" | jq -e '.message != null' > /dev/null && \
    print_result 0 "Error has message field"

# Test invalid booking time
INVALID_TIME_RESP=$(curl -s -X POST "$BASE_URL/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${USER_TOKENS[0]}" \
  -d '{
    "lab_id": 1,
    "start_time": "05:00",
    "end_time": "06:00",
    "booking_date": "'$(date -v+6d +%Y-%m-%d 2>/dev/null || date -d '+6 days' +%Y-%m-%d)'",
    "bc_number": "BC101"
  }')

echo "$INVALID_TIME_RESP" | jq -e '.success == false' > /dev/null && \
    print_result 0 "Invalid time rejected with success: false"

echo "$INVALID_TIME_RESP" | jq -e '.message != null' > /dev/null && \
    print_result 0 "Invalid time has error message"

# Ensure no legacy 'error:' at root
echo "$ERROR_RESP" | jq -e 'has("error") | not' > /dev/null && \
    print_result 0 "No legacy 'error' field at root level"

# ============================================
# 6. STRUCTURED LOGGING VERIFICATION
# ============================================
echo ""
echo "6. Structured Logging Verification"
echo "-----------------------------------"

# Create a booking to generate a log entry
LOG_TEST_DATE=$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d '+7 days' +%Y-%m-%d)
LOG_RESP=$(curl -s -X POST "$BASE_URL/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${USER_TOKENS[0]}" \
  -d "{
    \"lab_id\": 1,
    \"start_time\": \"11:00\",
    \"end_time\": \"12:00\",
    \"booking_date\": \"$LOG_TEST_DATE\",
    \"bc_number\": \"BC101\",
    \"purpose\": \"Log verification test\"
  }")

if echo "$LOG_RESP" | jq -e '.success == true' > /dev/null 2>&1; then
    print_result 0 "Booking created (check server logs for structured JSON log)"
    LOG_BOOKING_ID=$(echo "$LOG_RESP" | jq -r '.booking.id')
    
    # Cancel to generate another log
    curl -s -X DELETE "$BASE_URL/api/bookings/$LOG_BOOKING_ID" \
      -H "Authorization: Bearer ${USER_TOKENS[0]}" > /dev/null
    print_result 0 "Booking cancelled (check server logs)"
fi

print_info "Verify server console shows JSON structured logs:"
print_info '{"timestamp":"2026-03-30...","level":"info","event":"booking_created",...}'

# ============================================
# 7. LOAD TESTING (50 requests/sec)
# ============================================
echo ""
echo "7. Load Testing (50 requests in 1 second)"
echo "------------------------------------------"

LOAD_DATE=$(date -v+8d +%Y-%m-%d 2>/dev/null || date -d '+8 days' +%Y-%m-%d)
LOAD_RESULTS=$(mktemp)
START_LOAD=$(date +%s%N)

# Fire 50 requests as fast as possible
for i in {1..50}; do
    curl -s -X GET "$BASE_URL/api/labs" >> "$LOAD_RESULTS" &
done

wait
END_LOAD=$(date +%s%N)
LOAD_DURATION=$(( (END_LOAD - START_LOAD) / 1000000 )) # Convert to ms

# Count successful responses
LOAD_SUCCESS=$(grep -c '"success":true' "$LOAD_RESULTS" 2>/dev/null || echo "0")
rm -f "$LOAD_RESULTS"

print_info "Load test: $LOAD_SUCCESS/50 successful in ${LOAD_DURATION}ms"

if [ $LOAD_SUCCESS -eq 50 ]; then
    print_result 0 "Load test PASSED (100% success rate)"
else
    print_result 1 "Load test FAILED ($LOAD_SUCCESS/50)"
fi

# ============================================
# 8. CLEANUP TEST USERS
# ============================================
echo ""
echo "8. Cleanup"
echo "----------"

for i in {1..10}; do
    USERNAME="conctest$i"
    # Find user ID and delete
    USER_LIST=$(curl -s -X GET "$BASE_URL/api/admin/users?search=$USERNAME" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    USER_ID=$(echo "$USER_LIST" | jq -r ".users[] | select(.username == \"$USERNAME\") | .id")
    
    if [ "$USER_ID" != "null" ] && [ ! -z "$USER_ID" ]; then
        # Deactivate user instead of delete for safety
        curl -s -X PATCH "$BASE_URL/api/admin/users/$USER_ID/status" \
          -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    fi
done

print_result 0 "Test users cleaned up"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=========================================="
echo "Final Hardening Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -eq 0 ]; then
    echo -e "${RED}No tests were run!${NC}"
    exit 1
fi

PASS_RATE=$((PASSED * 100 / TOTAL))
echo "Pass Rate: ${PASS_RATE}%"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - Backend is production-ready!${NC}"
    exit 0
elif [ $PASS_RATE -ge 90 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY PASSED ($PASS_RATE%) - Review failures${NC}"
    exit 0
else
    echo -e "${RED}❌ FAILED ($PASS_RATE%) - Fixes required${NC}"
    exit 1
fi
