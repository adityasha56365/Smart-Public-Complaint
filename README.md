<div align="center">

# 🏛️ JanSeva (Civicly)
### Next-Gen AI-Powered Public Grievance Redressal & Transport Challan Dispute Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*A full-stack, enterprise-grade civic grievance redressal and municipal administration platform.*

[🌟 Live Web App](https://smart-public-complaint-o894-eight.vercel.app) • [📖 API Documentation](https://smart-public-complaint-o894-eight.vercel.app/docs) • [🚀 Quickstart](#-quickstart-guide)

---

</div>

## 📌 1. Project Overview & Problem Statement

### ⚠️ The Problem We Are Solving
Traditional municipal complaint and traffic dispute management in Indian cities suffers from serious structural flaws:
1. **Opaque Grievance Tracking:** Citizens report civic problems (potholes, garbage, broken streetlights) into closed portals with zero visibility into which officer or department is handling their issue.
2. **Slow Inter-Departmental Routing:** Complaints frequently bounce between Roads, Sanitation, and Water boards without ownership or SLA timelines.
3. **Flawed Traffic Challan Dispute Workflow:** Wrongful or camera-error challans (wrong vehicle detected, duplicate fines, OCR mismatches) lack a formal digitized appeals workflow, forcing citizens to make repeated physical visits to traffic police headquarters.
4. **Lack of Evidence Standards:** Challan dispute submissions often lack crucial evidence (such as registration plate photos or RC copies), causing huge rejection rates and administrative backlogs.
5. **Language & Accessibility Barriers:** Government portals often lack bilingual support (English/Hindi) and assistive tools for diverse citizens.

---

### 💡 The Solution: JanSeva (Civicly)
**JanSeva (Civicly)** provides a modern, transparent, end-to-end digital ecosystem built across **three specialized, role-guarded portals**:

1. **Citizen Portal (`/`):**
   - 5-step guided reporting with pinpoint OpenStreetMap coordinate pinning.
   - Smart AI Priority Prediction (auto-identifies critical hazards vs. routine maintenance).
   - **Dedicated Challan Dispute Filing** with strict evidence standards (Vehicle front/back photos, RC copy, payment proof).
   - In-app bilingual switching (English/Hindi) and floating AI Assistant (*JanSahayak* powered by Google Gemini).

2. **Transport Department Portal (`/transport-admin`):**
   - Dedicated jurisdiction workbench isolated from general civic complaints.
   - Complete audit trail of traffic citations, photographic evidence comparison, and structured dispute verdicts (Approve Waiver, Reject Dispute, Request Citizen Info).

3. **Municipal Admin & Staff Portal (`/admin`):**
   - Real-time queue management across civic departments (Roads, Sanitation, Water, Electricity).
   - Strict Finite State Machine (FSM) enforcing valid status transitions (`submitted` ➔ `under_review` ➔ `assigned` ➔ `in_progress` ➔ `resolved`).
   - SLA breach alerts, officer workbenches, and system-wide audit logs.

---

## 🏛️ 2. System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client (React 19 + TypeScript + Vite)"]
        CitizenPortal["Citizen Portal (Grievances, Challans, Map)"]
        TransportPortal["Transport Admin Portal (Challan Dispute Workbench)"]
        AdminPortal["Public Admin Portal (Queue, SLA, Staff Assignments)"]
        JanSahayak["JanSahayak AI Chatbot (Google Gemini)"]
        AuthContext["Auth State (JWT Expiry Watcher + RBAC Guard)"]
    end

    subgraph APILayer["FastAPI REST Backend (/api/v1)"]
        AuthMiddleware["JWT Authentication & RBAC Dependency Guard"]
        ComplaintsAPI["/complaints (CRUD, Lifecycle, State Machine)"]
        ChallanAPI["/challan-complaints & /transport (Disputes & Evidence)"]
        ChatAPI["/chat (Gemini AI Integration)"]
        OfficesAPI["/offices & /departments (Civic Infrastructure)"]
    end

    subgraph DataLayer["Relational Database (PostgreSQL / Neon)"]
        T_Users[(users - Citizens & Staff)]
        T_Complaints[(complaints & complaint_attachments)]
        T_Challans[(challan_complaints & challan_evidence)]
        T_Audit[(complaint_status_history & audit_logs)]
    end

    CitizenPortal & TransportPortal & AdminPortal & JanSahayak --> AuthMiddleware
    AuthMiddleware --> ComplaintsAPI & ChallanAPI & ChatAPI & OfficesAPI
    ComplaintsAPI --> T_Complaints & T_Audit
    ChallanAPI --> T_Challans & T_Audit
    AuthMiddleware --> T_Users
```

---

## 🚗 3. Challan Complaint & Dispute Module

The platform features a dedicated, structured traffic challan appeal engine designed to eliminate fraud and streamline verification:

### Key Form Fields & Rules:
- **Vehicle Particulars:**
  - `Challan Number` *(e.g., DL123456789012 - Uppercase validated)*
  - `Vehicle Registration Number` *(e.g., DL 01 AB 1234)*
  - `Owner Name as per RC` *(Compulsory field matching Registration Certificate)*
  - `Vehicle Type` *(Dropdown: Two Wheeler, Four Wheeler, Others: Bus, Truck, Auto, etc.)*
  - `Challan Issue Date` & `Issuing Authority / Jurisdiction`
- **Applicant / Contact Information:**
  - `Full Name`, `Email Address`, and `Contact Phone Number` *(Auto-populated from logged-in account, fully editable)*
- **Dispute Reason & Justification:**
  - Standardized dispute categories: Wrong Vehicle, Incorrect Reg No, Photo Mismatch, Already Paid, Duplicate Challan, Operational Mistake, etc.
  - Detailed written justification.
- **Categorized Multi-File Supporting Evidence:**
  - 📸 **Front Image of Vehicle (Compulsory):** Clear photo showing front view and number plate.
  - 📸 **Back Image of Vehicle (Compulsory / Recommended):** Clear rear view showing vehicle make and plate.
  - 📄 **RC Book Copy (Optional):** Official Registration Certificate or Smart Card scan.
  - 💳 **Payment Proof / Receipt (Optional):** Bank transaction slip or online portal receipt.
  - 🪪 **Aadhar Card / Identity Proof (Optional):** Citizen identity verification.
  - 📎 **Other Supporting Documents (Optional):** Toll receipts, parking slips, GPS logs.
  - **Multiple Uploads Supported:** Upload multiple images or PDFs at once with individual category tagging and instant preview.

---

## 🛠️ 4. Technology Stack

| Layer | Technology | Key Highlights |
|---|---|---|
| **Frontend** | React 19, TypeScript 5.7, Vite 8 | Ultra-fast rendering, strict type safety, zero build latency |
| **Styling** | Tailwind CSS v4, Vanilla CSS Design System | Modern design tokens, sleek dashboard aesthetics, responsive |
| **Mapping & GIS** | Leaflet, React-Leaflet, OpenStreetMap | Interactive coordinates picker, area filters, nearest offices |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2 | High-concurrency async endpoints, auto Swagger UI docs |
| **Database & ORM** | PostgreSQL 14+, SQLAlchemy 2.0, Alembic | 14 relational tables, foreign key cascades, auto-migrations |
| **Security & Auth** | JWT (HS256), Passlib, Bcrypt (72-byte safe) | Role-Based Access Control, token expiry auto-logout |
| **Artificial Intelligence** | Google Gemini 3.1 Flash / Heuristics | Real-time chat assistant (*JanSahayak*) + Smart Priority Predictor |

---

## 🔑 5. Default Test Accounts

Reviewers can test each distinct user experience using these pre-seeded accounts:

| Portal | Role | Email | Password | Access Path |
|---|---|---|---|---|
| 👑 **Public Administration** | Super Administrator | `admin@civicly.app` | `AdminSecure2026!` | `/admin` |
| 🚦 **Transport Department** | Transport Admin | `transport.admin@civicly.app` | `Transport@123` | `/transport-admin` |
| 👤 **Citizen Portal** | Citizen User | Register in 10s via UI | Custom | `/` |

---

## ⚡ 6. Quickstart Guide (Local Setup)

### Prerequisites
- **Node.js** (v18+) and **npm**
- **Python** (v3.11+ / v3.13)
- **PostgreSQL** running on port 5432 (or a free cloud database on [Neon.tech](https://neon.tech))

---

### Step 1: Clone Repository
```powershell
git clone https://github.com/adityasha56365/Smart-Public-Complaint.git
cd "Smart-Public-Complaint"
```

---

### Step 2: Backend Setup
1. Open a terminal in `backend/`:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
2. Install Python dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Create `.env` in `backend/`:
   ```ini
   APP_ENV=development
   DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/smart_public_complaint
   SECRET_KEY=generate_with_python_secrets_token_hex_32
   ACCESS_TOKEN_EXPIRE_MINUTES=120
   FRONTEND_ORIGINS=http://localhost:8443,http://localhost:5173
   GEMINI_API_KEY=YOUR_OPTIONAL_GEMINI_API_KEY
   ```
4. Run migrations and seed database:
   ```powershell
   alembic upgrade head
   python seed.py
   ```
5. Start FastAPI development server:
   ```powershell
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Swagger API Documentation is live at:* `http://127.0.0.1:8000/docs`

---

### Step 3: Frontend Setup
1. In a new terminal from project root:
   ```powershell
   cd frontend
   npm install
   ```
2. Start Vite development server:
   ```powershell
   npm run dev -- --port 8443
   ```
3. Open in browser: `http://localhost:8443/`

---

## 🧪 7. Automated Test Suite

Backend integrity is protected by 21 automated tests covering authentication, citizen ownership security, state machine transitions, and dispute workflows:

```powershell
cd backend
pytest -v
```

---

## 👥 Contributors & Contact

- **Lead Developer:** Aditya Sharma ([@adityasha56365](https://github.com/adityasha56365))
- **GitHub Repository:** [Smart-Public-Complaint](https://github.com/adityasha56365/Smart-Public-Complaint)
