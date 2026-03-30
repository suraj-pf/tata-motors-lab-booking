# Lab Booking System - Database Schema

## Overview

MySQL 8.0 relational database with InnoDB engine. Designed for ACID compliance, referential integrity, and query performance with strategic indexing.

**Key Design Principles:**
- Foreign key constraints for data integrity
- JSON columns for flexible arrays (recurring_days)
- Composite indexes for common query patterns
- Audit logging for compliance

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
    │     users     │         │   bookings    │         │     labs      │
    ├───────────────┤         ├───────────────┤         ├───────────────┤
    │ PK id         │◄────────┤│ FK user_id    │├────────►│ PK id         │
    │ username (UQ) │    1:N  │ FK lab_id     │  N:1    │ name (UQ)     │
    │ password_hash │         │ booking_date  │         │ building      │
    │ name          │         │ start_time    │         │ capacity      │
    │ bc_number     │         │ end_time      │         │ is_ac         │
    │ department    │         │ status        │         │ facilities    │
    │ role          │         │ purpose       │         │ is_active     │
    │ is_active     │         │ duration_hrs  │         └───────────────┘
    │ created_at    │         │ is_recurring  │                 │
    │ updated_at    │         │ recurring_days│                 │
    └───────────────┘         │ created_at    │         ┌───────────────┐
            │                 │ updated_at    │         │blocked_slots  │
            │                 └───────────────┘         ├───────────────┤
            │                         │                 │ PK id         │
            │                         │                 │ FK lab_id     │
            ▼                         ▼                 │ blocked_date  │
    ┌───────────────┐         ┌───────────────┐         │ start_time    │
    │ notifications │         │  audit_logs   │         │ end_time      │
    ├───────────────┤         ├───────────────┤         │ reason        │
    │ PK id         │         │ PK id         │         │ created_by    │
    │ FK user_id    │         │ FK user_id    │         └───────────────┘
    │ title         │         │ action        │
    │ message       │         │ FK lab_id     │
    │ type          │         │ FK booking_id │
    │ is_read       │         │ old_data (JSON)│
    │ created_at    │         │ new_data (JSON)│
    └───────────────┘         │ ip_address    │
                              │ created_at    │
                              └───────────────┘

LEGEND:
  PK = Primary Key
  FK = Foreign Key
  UQ = Unique Constraint
  1:N = One-to-Many relationship
  N:1 = Many-to-One relationship
```

---

## Table Specifications

### 1. Users Table

Stores system users with role-based access control.

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  bc_number VARCHAR(50) NOT NULL,           -- Business Card number
  department VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',          -- 'user' or 'admin'
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_bc_number (bc_number),
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Initial Data (14 users):**

| Username | Role | Name | Department | BC Number |
|----------|------|------|------------|-----------|
| admin | admin | System Administrator | SDC | BC101 |
| staff1-staff13 | user | Various Staff | SDC | BC101 |

**Design Notes:**
- `bc_number` intentionally NOT unique (all staff share BC101 for demo)
- Passwords hashed with bcrypt (10 rounds)
- Soft delete via `is_active` flag

---

### 2. Labs Table

Meeting rooms and training labs across buildings.

```sql
CREATE TABLE labs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  building VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  is_ac TINYINT(1) NOT NULL DEFAULT 0,
  facilities TEXT,                          -- Comma-separated: "Projector, Whiteboard"
  lab_owner VARCHAR(100),                   -- Responsible person
  hourly_charges DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_building (building),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Initial Data (19 labs):**

| Building | Labs | Count |
|----------|------|-------|
| SDC Workshop | FST TCF, FST B1W, B1W, Mechatronics, 5S Hall, NTTF side, ARVR Lab, Industry 4.0 Lab, Innovation Lab | 9 |
| HR Building | Prayas, SDP, Safari, Udan, Unnati, Utkarsh, Athang, Prima, Research Lab, Conference Hall | 10 |

---

### 3. Bookings Table

Core junction table linking users, labs, and time slots.

```sql
CREATE TABLE bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lab_id INT NOT NULL,
  user_id INT NOT NULL,
  bc_number VARCHAR(50) NOT NULL,           -- Denormalized for reporting
  start_time VARCHAR(10) NOT NULL,            -- Format: "HH:MM" (24h)
  end_time VARCHAR(10) NOT NULL,
  booking_date DATE NOT NULL,
  duration_hours DECIMAL(4,2) DEFAULT 1.0,
  purpose VARCHAR(255),
  status ENUM('confirmed', 'cancelled', 'completed', 'pending') DEFAULT 'confirmed',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_days JSON,                        -- e.g., ["mon", "wed", "fri"]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_lab_date (lab_id, booking_date),    -- Most common query
  INDEX idx_user_id (user_id),                   -- User's bookings
  INDEX idx_bc_number (bc_number),               -- Department reports
  INDEX idx_status (status),                     -- Filter by status
  INDEX idx_booking_date (booking_date),         -- Date range queries
  
  CONSTRAINT valid_time CHECK (start_time < end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Design Decisions:**

1. **Time as VARCHAR not TIME:**
   - Simpler API handling
   - No timezone conversion issues
   - Consistent "HH:MM" format

2. **Status ENUM:**
   - `confirmed`: Active booking
   - `cancelled`: User cancelled (soft delete)
   - `completed`: Time has passed
   - `pending`: Awaiting admin approval

3. **Composite Index `(lab_id, booking_date)`:**
   - Optimizes timeline queries
   - Reduces full table scans

4. **Check Constraint:**
   - `start_time < end_time` prevents invalid ranges

---

### 4. Blocked Slots Table

Admin-defined unavailable time periods.

```sql
CREATE TABLE blocked_slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lab_id INT NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_lab_date (lab_id, blocked_date),
  UNIQUE KEY unique_block (lab_id, blocked_date, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Use Cases:**
- Maintenance windows
- Holiday closures
- Special events

---

### 5. Notifications Table

User in-app notification system.

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',          -- 'info', 'success', 'warning', 'error'
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_read (user_id, is_read),     -- Unread count query
  INDEX idx_created_at (created_at)           -- Sorting
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 6. Audit Logs Table

Compliance and debugging trail.

```sql
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,                                -- Nullable for system actions
  action VARCHAR(100) NOT NULL,               -- 'CREATE_BOOKING', 'CANCEL_BOOKING', etc.
  lab_id INT,
  booking_id INT,
  old_data JSON,                              -- Previous state
  new_data JSON,                              -- New state
  ip_address VARCHAR(45),                     -- IPv6 compatible
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_action (user_id, action),
  INDEX idx_booking_id (booking_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Logged Actions:**
- Booking creation/cancellation/update
- User login/logout
- Admin configuration changes
- Failed authentication attempts

---

## Database Relationships

### Relationship Matrix

| Parent | Child | Type | On Delete | Purpose |
|--------|-------|------|-----------|---------|
| users | bookings | 1:N | CASCADE | Remove user's bookings |
| labs | bookings | 1:N | CASCADE | Remove lab's bookings |
| users | notifications | 1:N | CASCADE | Clean up notifications |
| labs | blocked_slots | 1:N | CASCADE | Remove with lab |
| users | blocked_slots | 1:N | SET NULL | Keep history |
| users | audit_logs | 1:N | SET NULL | Preserve audit trail |

### Referential Integrity Rules

```sql
-- Example: Cannot delete user with active bookings
-- (Handled by ON DELETE CASCADE in production)

-- Example: Cannot create booking for non-existent lab
FOREIGN KEY (lab_id) REFERENCES labs(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE

-- Example: Booking must reference valid user
FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE
```

---

## Query Patterns & Optimization

### 1. Timeline View (Most Common)

```sql
-- Get all bookings for a lab on a specific date
SELECT b.*, u.name as user_name, u.department
FROM bookings b
JOIN users u ON b.user_id = u.id
WHERE b.lab_id = ?
  AND b.booking_date = ?
  AND b.status != 'cancelled'
ORDER BY b.start_time;

-- Uses: INDEX idx_lab_date (lab_id, booking_date)
```

### 2. User's Bookings (MyBookings Page)

```sql
-- Get user's upcoming bookings with lab details
SELECT b.*, l.name as lab_name, l.building
FROM bookings b
JOIN labs l ON b.lab_id = l.id
WHERE b.user_id = ?
  AND b.status IN ('confirmed', 'pending')
  AND b.booking_date >= CURDATE()
ORDER BY b.booking_date, b.start_time;

-- Uses: INDEX idx_user_id (user_id)
```

### 3. Lab Availability Check

```sql
-- Check for overlapping bookings
SELECT COUNT(*) as conflict_count
FROM bookings
WHERE lab_id = ?
  AND booking_date = ?
  AND status = 'confirmed'
  AND (
    (start_time <= ? AND end_time > ?) OR      -- New booking starts during existing
    (start_time < ? AND end_time >= ?) OR      -- New booking ends during existing
    (start_time >= ? AND end_time <= ?)        -- New booking completely inside
  );

-- Uses: INDEX idx_lab_date (lab_id, booking_date)
```

### 4. Admin Dashboard Stats

```sql
-- Active bookings right now
SELECT COUNT(*) as active
FROM bookings
WHERE status = 'confirmed'
  AND booking_date = CURDATE()
  AND start_time <= TIME_FORMAT(NOW(), '%H:%i')
  AND end_time > TIME_FORMAT(NOW(), '%H:%i');

-- Today's bookings by building
SELECT l.building, COUNT(*) as count
FROM bookings b
JOIN labs l ON b.lab_id = l.id
WHERE b.booking_date = CURDATE()
  AND b.status != 'cancelled'
GROUP BY l.building;
```

---

## Index Strategy

### Index Usage Summary

| Table | Index | Columns | Usage |
|-------|-------|---------|-------|
| users | idx_username | username | Login lookup |
| users | idx_bc_number | bc_number | Department reports |
| labs | idx_building | building | Building filter |
| bookings | idx_lab_date | lab_id + booking_date | **Most important** |
| bookings | idx_user_id | user_id | User bookings |
| bookings | idx_status | status | Status filtering |
| notifications | idx_user_read | user_id + is_read | Unread count |
| audit_logs | idx_created_at | created_at | Time-based queries |

### EXPLAIN Plan Examples

```sql
-- Before index: Full table scan (rows=10,000)
-- After idx_lab_date: Index range scan (rows=5)

EXPLAIN SELECT * FROM bookings 
WHERE lab_id = 5 AND booking_date = '2024-03-30';

-- Result:
-- type: ref
-- key: idx_lab_date
-- rows: 5 (vs 10000 without index)
-- Extra: Using where; Using index
```

---

## Data Integrity Constraints

### CHECK Constraints

```sql
-- Valid time range
CONSTRAINT valid_time CHECK (start_time < end_time)

-- Implicit: status must be ENUM value
status ENUM('confirmed', 'cancelled', 'completed', 'pending')
```

### UNIQUE Constraints

```sql
-- Prevent duplicate blocked slots
UNIQUE KEY unique_block (lab_id, blocked_date, start_time, end_time)

-- Prevent duplicate usernames
username VARCHAR(50) UNIQUE NOT NULL

-- Prevent duplicate lab names
name VARCHAR(100) UNIQUE NOT NULL
```

---

## Sample Data Generation

### Users

```sql
-- Admin
INSERT INTO users (username, password_hash, name, bc_number, department, role)
VALUES ('admin', '$2a$10$...', 'System Administrator', 'BC101', 'SDC', 'admin');

-- Staff (13 users, all BC101 for demo)
INSERT INTO users (username, password_hash, name, bc_number, department, role)
VALUES 
  ('staff1', '$2a$10$...', 'Ramdas Saindane', 'BC101', 'SDC', 'user'),
  ('staff2', '$2a$10$...', 'Sandeep Polkam', 'BC101', 'SDC', 'user'),
  -- ... staff3 through staff13
;
```

### Labs

```sql
INSERT INTO labs (name, building, capacity, is_ac, facilities, lab_owner, hourly_charges)
VALUES
  ('FST TCF', 'SDC Workshop', 30, 0, 'Chairs, Whiteboard', 'Ramdas Saindane', 0.00),
  ('FST B1W', 'SDC Workshop', 30, 0, 'Chairs, Whiteboard', 'Sandeep Polkam', 0.00),
  ('Prayas', 'HR Building', 50, 1, 'Chairs, smart Board', 'Priti Ubale', 0.00),
  -- ... 16 more labs
;
```

---

## Database Initialization

### Automated Setup

```bash
# Run initialization script
node bac/createTables.js

# This script:
# 1. Creates database if not exists
# 2. Creates all 6 tables with proper constraints
# 3. Seeds initial users (1 admin + 13 staff)
# 4. Seeds 19 labs
# 5. Creates sample bookings
```

### Manual Reset

```sql
-- ⚠️ DESTRUCTIVE: Drop and recreate all tables
DROP DATABASE IF EXISTS lab_booking_system;
CREATE DATABASE lab_booking_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Then run createTables.js
```

---

## Scaling Considerations

### Current Scale

| Metric | Value |
|--------|-------|
| Users | 14 |
| Labs | 19 |
| Bookings/day | ~50 |
| Concurrent users | ~20 |

### Future Scale Strategy

1. **Partitioning:**
   ```sql
   -- Partition bookings by year
   PARTITION BY RANGE (YEAR(booking_date)) (
     PARTITION p2024 VALUES LESS THAN (2025),
     PARTITION p2025 VALUES LESS THAN (2026),
     -- ...
   );
   ```

2. **Archiving:**
   - Move completed bookings > 1 year to `bookings_archive`
   - Keep current table lean for fast queries

3. **Read Replicas:**
   - Admin dashboard queries → Read replica
   - Booking creation → Primary (for consistency)

---

## Interview Talking Points

### Q: "Why MySQL over PostgreSQL?"

**Answer:**
- Team familiarity with MySQL ecosystem
- Better tooling in our environment
- JSON support sufficient for our needs (recurring_days)
- InnoDB clustering fits our read-heavy pattern

### Q: "How do you prevent double-booking?"

**Answer:**
1. Database constraint: `UNIQUE` on overlapping time (via application check)
2. Optimistic locking: Check at booking time
3. Real-time updates: Socket broadcasts prevent concurrent attempts

### Q: "How do you handle timezone issues?"

**Answer:**
- Store all times in UTC on backend
- Frontend converts to local time
- No timezone stored in database
- Date as `DATE`, time as `VARCHAR` in 24h format

### Q: "What's your backup strategy?"

**Answer:**
- Point-in-time recovery via MySQL binlogs
- Daily mysqldump for full backup
- 15-minute incremental backups
- Tested restore procedure monthly

---

## License

Internal use only - Tata Motors SDC Team
