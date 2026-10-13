# Civicly — Smart Public Complaint Management System

A production-ready, full-stack citizen engagement and grievance redressal platform. Built with a React 19 + TypeScript frontend preserving the Figma design system, backed by FastAPI, PostgreSQL, Alembic database migrations, and role-based access control (RBAC).

---

## 1. System Architecture

```
smart-public-complaint/
├── src/                          # React + TypeScript Modular Frontend
│   ├── App.tsx                   # Lightweight root router (~60 lines)
│   ├── index.css                 # Clean design tokens and responsive styles
│   ├── components/
│   │   ├── common/               # Reusable UI (Icon, Brand, Status, Spinner, ErrorBanner)
│   │   ├── layout/               # Navigation & topbars (Sidebar, Topbar, AdminSidebar, AdminTopbar)
│   │   ├── auth/                 # Route guards (RequireAuth, RequireAdmin)
│   │   ├── chat/                 # Floating AI chatbot (JanSahayakChat)
│   │   ├── map/                  # OpenStreetMap components (ComplaintsMapView, LocationPickerMap)
│   │   └── profile/              # Modals (EditProfile, Language, Notification, Privacy, Help, Terms)
│   ├── pages/
│   │   ├── auth/                 # Auth pages (AuthPage - Login & Register)
│   │   ├── citizen/              # Citizen portal (Home, Complaints, Details, Map, Notifications, Profile, ReportFlow)
│   │   └── admin/                # Admin portal (Overview, Queue, Details, Depts, Reports, Audit, Staff, Citizens, Escalations, Map, Settings, Help)
│   ├── utils/                    # Helper utilities (csvExport, priorityPredictor)
│   ├── hooks/                    # React Context & custom hooks (useAuth, usePreferences)
│   ├── services/                 # Centralized Axios API services
│   └── types/                    # TypeScript interfaces & domain types
├── backend/                      # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint, CORS, exception handlers
│   │   ├── core/                 # Config (Pydantic Settings), security (JWT, bcrypt)
│   │   ├── db/                   # SQLAlchemy engine & session factory
│   │   ├── models/               # Relational database models
│   │   ├── schemas/              # Pydantic validation schemas
│   │   └── api/v1/               # API routes (auth, complaints, admin, chat)
│   ├── alembic/                  # Alembic database migration scripts
│   ├── seed.py                   # Administrative and category seed script
│   ├── tests/                    # Automated Pytest suite
│   ├── requirements.txt          # Backend dependencies
│   ├── .env.example              # Environment variables template (No secrets)
│   └── uploads/                  # Secure file evidence storage directory (.gitkeep)
├── vite.config.ts                # Vite 8 build configuration
├── package.json                  # Frontend dependencies and scripts
└── README.md                     # Documentation and setup guide
```

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4, React Router 7, Axios
- **Backend:** Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn
- **Database:** PostgreSQL (with SQLite in-memory fallback for testing)
- **Security:** bcrypt password hashing (72-byte safe), JWT tokens (HS256), RBAC, parameterized ORM queries, secure CORS preflight validation

---

## 3. Database Schema

The database consists of 13 normalized relational tables:
1. `users` — Citizens, officers, supervisors, and administrators with role-based attributes
2. `departments` — Civic departments (Roads, Waste Management, Water Supply, etc.)
3. `complaint_categories` — Issue categories mapped to responsible departments
4. `complaints` — Core complaints with unique reference numbers (`SPC-YYYY-XXXXX`), status, priority, and geocoordinates
5. `complaint_attachments` — Metadata for uploaded evidence photos and videos
6. `complaint_assignments` — Officer and department assignment history
7. `complaint_status_history` — Immutable audit log of every status transition
8. `complaint_comments` — Citizen-visible remarks and updates
9. `complaint_internal_notes` — Internal officer-only notes
10. `complaint_feedback` — Citizen ratings (1–5 stars) and resolution feedback
11. `notifications` — In-app alerts for complaint submission, assignment, and resolution
12. `audit_logs` — Platform-wide administrative action logs
13. `alembic_version` — Database schema migration version tracker

---

## 4. Getting Started (Windows)

### Prerequisites
- Node.js (v18+) and npm
- Python 3.11+ (Python 3.13 supported)
- PostgreSQL 14+ running locally on port 5432

---

### Step 1: Database Setup
1. Ensure your PostgreSQL service is running.
2. Create the application database:
   ```powershell
   psql -U postgres -c "CREATE DATABASE smart_public_complaint;"
   ```

---

### Step 2: Backend Setup
1. Navigate to the backend directory:
   ```powershell
   cd "D:\Public Complain App\backend"
   ```
2. Create a virtual environment and activate it:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure environment variables in `backend/.env`:
   ```ini
   APP_ENV=development
   DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/smart_public_complaint
   SECRET_KEY=generate_with_python_secrets_token_hex_32
   ACCESS_TOKEN_EXPIRE_MINUTES=120
   REFRESH_TOKEN_EXPIRE_DAYS=7
   FRONTEND_ORIGINS=http://localhost:8443,http://localhost:5173,http://127.0.0.1:8443
   BACKEND_BASE_URL=http://localhost:8000
   UPLOAD_DIR=uploads
   MAX_UPLOAD_SIZE_MB=20
   ```
5. Run Alembic migrations:
   ```powershell
   .\venv\Scripts\alembic upgrade head
   ```
6. Seed default categories, departments, and create the Super Administrator:
   ```powershell
   .\venv\Scripts\python seed.py --email admin@civicly.app --password AdminSecure2026! --name "System Administrator"
   ```
7. Start the FastAPI development server:
   ```powershell
   .\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   Interactive Swagger documentation is available at: `http://127.0.0.1:8000/docs`

---

### Step 3: Frontend Setup
1. Open a new terminal in the project root:
   ```powershell
   cd "D:\Public Complain App"
   ```
2. Install frontend dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite development server on port 8443:
   ```powershell
   npm run dev -- --port 8443 --host 127.0.0.1
   ```
4. Access the application in your browser at:
   `http://127.0.0.1:8443/`

---

## 5. User Roles and Default Accounts

| Role | Email | Password | Access Portal |
|---|---|---|---|
| **Super Administrator** | `admin@civicly.app` | `AdminSecure2026!` | Admin Portal (`/admin`) |
| **Citizen** | Register via UI or use test account | Custom | Citizen Portal (`/`) |

---

## 6. Testing

### Run Backend Automated Tests
Backend tests use Pytest with in-memory SQLite fixtures to validate 21 critical workflows:
- User registration, duplicate prevention, and validation
- Authentication, invalid passwords, and token expiration
- Citizen complaint creation and reference number generation
- Ownership security (citizens cannot access other citizens' complaints)
- Officer status update transitions and rejection reason enforcement
- Admin statistics calculation and role-based access restrictions
- System health checks

Run tests with:
```powershell
cd "D:\Public Complain App\backend"
.\venv\Scripts\pytest -v
```
**Test Results:** `21 passed in ~20s`

---

## 7. Status Transition Rules

Complaints follow a verified state machine:
- `submitted` ➔ `under_review` or `rejected`
- `under_review` ➔ `assigned`, `awaiting_info`, or `rejected`
- `assigned` ➔ `in_progress` or `under_review`
- `in_progress` ➔ `awaiting_info`, `resolved`, or `under_review`
- `awaiting_info` ➔ `in_progress`, `under_review`, or `closed`
- `resolved` ➔ `reopened` or `closed`
- `reopened` ➔ `under_review` or `assigned`
- `rejected` ➔ `under_review` (upon appeal/re-evaluation)

Arbitrary status jumps (e.g., `submitted` directly to `resolved`) are strictly rejected with HTTP 422.
Rejections require a mandatory human-readable reason stored in the database.
All transitions are recorded in `complaint_status_history` along with the acting officer ID, timestamp, and notes.
