# Lab Booking System - System Architecture

## Overview

A production-grade, real-time lab booking system built for Tata Motors. The system enables employees to book meeting rooms and labs across multiple buildings with live availability updates, conflict detection, and comprehensive admin management.

**Tech Stack:**
- **Frontend:** React 18 + Vite + Tailwind CSS + Socket.IO Client
- **Backend:** Node.js + Express + Socket.IO + MySQL
- **Database:** MySQL with InnoDB engine
- **Real-time:** WebSocket via Socket.IO

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Browser   │  │   Browser   │  │   Browser   │  │   Admin Panel   │  │
│  │  (User 1)   │  │  (User 2)   │  │  (User 3)   │  │                 │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                │                   │        │
│         └────────────────┴────────────────┘                   │        │
│                          │                                    │        │
│                    ┌─────┴────────────────────────────────────┘        │
│                    │                                                    │
└────────────────────┼────────────────────────────────────────────────────┘
                     │ HTTPS / WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND LAYER                              │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     React SPA (Vite)                            │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │   │
│  │  │    Auth      │ │  Bookings    │ │  Timeline    │              │   │
│  │  │   Context    │ │    System    │ │    View      │              │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘              │   │
│  │                                                                  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │   │
│  │  │   Lab Map    │ │  Admin Panel │ │  Dashboard   │              │   │
│  │  │   (Grid)     │ │              │ │              │              │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘              │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │              Production-Grade Custom Hooks                  │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │   │
│  │  │  │useSocket│ │useLabs  │ │useBookin│ │useTime  │          │ │   │
│  │  │  │         │ │         │ │   gs    │ │  line   │          │ │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │   │
│  │  │  ┌─────────┐ ┌─────────┐                                    │ │   │
│  │  │  │useDashbo│ │useAuth  │                                    │ │   │
│  │  │  │   ard   │ │         │                                    │ │   │
│  │  │  └─────────┘ └─────────┘                                    │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Key Features:                                                           │
│  • Optimistic UI updates                                                 │
│  • Socket event debouncing (150ms)                                       │
│  • State normalization (deduplication + sorting)                        │
│  • Time-aware recomputation (1-min interval)                          │
│  • Memoized derived stats                                               │
│  • Error boundaries                                                     │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ API Calls / WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      Express Server (Node.js)                     │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │                      Middleware Stack                       │  │   │
│  │  │  • Helmet (security headers)                                │  │   │
│  │  │  • CORS (cross-origin)                                     │  │   │
│  │  │  • Rate Limiting (API protection)                           │  │   │
│  │  │  • JWT Authentication                                      │  │   │
│  │  │  • Request Validation                                      │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │                       API Routes                            │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │   │
│  │  │  │  /auth  │ │ /labs   │ │/bookings│ │ /users  │            │  │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │  │   │
│  │  │  ┌─────────┐ ┌─────────┐                                    │  │   │
│  │  │  │/notifica│ │ /admin  │                                    │  │   │
│  │  │  │ tions   │ │         │                                    │  │   │
│  │  │  └─────────┘ └─────────┘                                    │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │              Socket.IO Real-time Engine                      │  │   │
│  │  │                                                              │  │   │
│  │  │  Events:                                                     │  │   │
│  │  │  • booking-created    → Broadcast to lab room              │  │   │
│  │  │  • booking-updated    → Notify affected users              │  │   │
│  │  │  • booking-cancelled  → Update lab availability            │  │   │
│  │  │  • room-status-update → Real-time occupancy changes        │  │   │
│  │  │  • user-*             → Admin dashboard updates            │  │   │
│  │  │                                                              │  │   │
│  │  │  Room Management:                                          │  │   │
│  │  │  • Users join lab-specific rooms for targeted updates      │  │   │
│  │  │  • Automatic room switching when navigating timeline       │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ MySQL Protocol
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        MySQL Database                            │   │
│  │                                                                  │   │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │   │
│  │   │    users     │◄───│   bookings   │───►│    labs      │      │   │
│  │   │  (1 admin +  │    │  (junction)  │    │  (19 rooms)  │      │   │
│  │   │  13 staff)   │    │              │    │              │      │   │
│  │   └──────────────┘    └──────────────┘    └──────────────┘      │   │
│  │          │                   │                   │              │   │
│  │          └───────────────────┴───────────────────┘              │   │
│  │                              │                                 │   │
│  │   ┌──────────────┐    ┌──────┴───────┐    ┌──────────────┐     │   │
│  │   │notifications │    │blocked_slots│    │ audit_logs   │     │   │
│  │   └──────────────┘    └──────────────┘    └──────────────┘     │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Relationships:                                                          │
│  • users 1:N bookings (one user, many bookings)                         │
│  • labs 1:N bookings (one lab, many bookings over time)               │
│  • bookings N:1 users, N:1 labs                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

### 1. Booking Creation Flow

```
User Action          Frontend                    Backend                    Database
    │                  │                           │                           │
    ▼                  ▼                           ▼                           ▼
┌────────┐    ┌──────────────┐           ┌──────────────────┐         ┌──────────────┐
│Click   │───►│Optimistic    │           │  POST /bookings  │         │  INSERT INTO │
│Book    │    │Update (hooks)│           │                  │         │   bookings   │
└────────┘    └──────────────┘           └──────────────────┘         └──────────────┘
                     │                           │                           │
                     │ ◄───────────────────────────┤  Return booking object    │
                     │                           │                           │
                     ▼                           ▼                           ▼
              ┌──────────────┐           ┌──────────────────┐
              │  Toast:      │           │  Socket Emit:    │
              │  "Confirmed" │           │  booking-created │
              └──────────────┘           └──────────────────┘
                                                  │
                                                  ▼
                                           ┌──────────────┐
                                           │ Broadcast to │
                                           │ lab room     │
                                           └──────────────┘
                                                  │
                           ┌────────────────────────┼────────────────────────┐
                           │                        │                        │
                           ▼                        ▼                        ▼
                    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
                    │Timeline View │       │   Lab Map    │       │Admin Dashboard│
                    │  (useTimeline)│       │  (useLabs)   │       │(useDashboard)│
                    └──────────────┘       └──────────────┘       └──────────────┘
```

### 2. Real-time Update Flow

```
Source          Socket Event          Hook Processing               UI Update
  │                 │                       │                           │
  ▼                 ▼                       ▼                           ▼
┌────────┐   ┌──────────────┐       ┌──────────────────┐         ┌──────────────┐
│ User A │   │ booking-     │       │ 1. Queue Update  │         │  Re-render   │
│books   │──►│ created      │──────►│ 2. Debounce 150ms│────────►│  with new    │
│Lab 5   │   │ (room: lab5) │       │ 3. Normalize    │         │  data        │
└────────┘   └──────────────┘       │ 4. Merge state  │         └──────────────┘
                                    └──────────────────┘
```

---

## Key Architectural Decisions

### 1. State Management Strategy

| Hook | Purpose | Normalization | Real-time |
|------|---------|---------------|-----------|
| `useBookings` | User's bookings | deduplicate + sort by time | Socket events |
| `useLabs` | Lab availability | deduplicate + compute status | Socket + 1-min recompute |
| `useTimeline` | Day view bookings | UTC normalization | Socket with debounce |
| `useDashboard` | Admin stats | Unified bookings+labs+users | All entity events |

### 2. Production-Grade Features

**Optimistic Updates:**
- UI updates immediately on user action
- Reverts on API failure
- Confirms on socket acknowledgment

**Socket Debouncing:**
- 150ms batch window for rapid events
- Prevents UI thrashing during busy periods
- Atomic state updates

**Time-Aware Computation:**
- 1-minute interval for status updates
- `visibilitychange` handler for tab focus
- Real-time occupancy calculation

**Error Isolation:**
- Error boundaries per major component
- Graceful degradation
- Automatic retry with backoff

### 3. Security Model

```
Request Flow:
Client → HTTPS → Helmet Headers → Rate Limit → JWT Verify → Route Handler → DB

Authentication:
├── JWT tokens (httpOnly cookies)
├── Role-based access (user/admin)
├── BC number validation
└── Department-based restrictions

Authorization:
├── Users: Own bookings only
├── Admins: Full system access
└── Labs: Building-based visibility
```

---

## API Design

### REST Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | No | User authentication |
| `/api/auth/me` | GET | Yes | Current user profile |
| `/api/labs` | GET | Yes | List all labs |
| `/api/labs/:id/availability` | GET | Yes | Get availability for date |
| `/api/bookings` | GET | Yes | User's bookings |
| `/api/bookings` | POST | Yes | Create new booking |
| `/api/bookings/:id/cancel` | PUT | Yes | Cancel booking |
| `/api/bookings/all` | GET | Admin | All system bookings |
| `/api/users` | GET | Admin | User management |
| `/api/admin/stats` | GET | Admin | Dashboard statistics |

### Socket Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `booking-created` | Server → Client | `{booking, lab_id}` | Notify new booking |
| `booking-updated` | Server → Client | `{booking, lab_id}` | Update existing |
| `booking-cancelled` | Server → Client | `{bookingId, lab_id}` | Remove/cancel |
| `room-status-update` | Server → Client | `{lab_id, status}` | Occupancy change |
| `user-created` | Server → Client | `{user}` | New user signup |
| `lab-updated` | Server → Client | `{lab}` | Lab config change |
| `join-labs` | Client → Server | `[labIds]` | Subscribe to rooms |

---

## How to Run the Project

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Backend Setup

```bash
# 1. Navigate to backend
cd bac

# 2. Install dependencies
npm install

# 3. Create environment file
cat > .env << EOF
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lab_booking_system
JWT_SECRET=your_jwt_secret_key_here
PORT=3000
EOF

# 4. Initialize database
npm run db:init

# 5. Start server
npm run dev
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
cat > .env << EOF
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
EOF

# 4. Start development server
npm run dev
```

### Default Credentials

| Role | Username | Password | BC Number |
|------|----------|----------|-----------|
| Admin | admin | admin123 | BC101 |
| Staff | staff1 | staff123 | BC101 |
| Staff | staff2-staff13 | staff123 | BC101 |

---

## Performance Characteristics

| Metric | Target | Implementation |
|--------|--------|----------------|
| Initial Load | < 2s | Code splitting, lazy loading |
| API Response | < 200ms | Indexed queries, connection pooling |
| Socket Latency | < 50ms | Room-based broadcasting |
| UI Updates | 150ms debounce | Batched state updates |
| Memory | < 100MB | Normalized state, pagination |

---

## Interview Talking Points

1. **"Why Socket.IO over WebRTC?"**
   - Server-authoritative state, easier conflict resolution
   - Built-in room management for targeted updates
   - Automatic reconnection handling

2. **"How do you handle race conditions?"**
   - Timestamp comparison (`updated_at`)
   - Debounced queue processing
   - Optimistic updates with rollback

3. **"What's your approach to state normalization?"**
   - Deduplication by ID with "newest wins"
   - Consistent sorting (time-based)
   - Computed properties (status, availability)

4. **"How would you scale this?"**
   - Horizontal scaling with Redis adapter for Socket.IO
   - Database read replicas for GET requests
   - CDN for static assets
   - Microservices split by domain (bookings, labs, users)

---

## License

Internal use only - Tata Motors SDC Team
