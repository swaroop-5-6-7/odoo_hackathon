<div align="center">
</div>

# 🏥 MediFlow: Clinical Equipment & Resource Management Hub

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-teal?style=flat-square&logo=vercel)](https://mediflow-two-teal.vercel.app)

**Live Link:** [https://mediflow-two-teal.vercel.app](https://mediflow-two-teal.vercel.app)

MediFlow is a comprehensive Clinical Equipment Analysis, Allocation, and Audit Discrepancy Reporting dashboard designed for hospitals. It streamlines biomedical engineering, asset tracking, sterilization compliance, ward bookings, and audit workflows while leveraging Google Gemini AI to analyze equipment health and maintenance risks.

---

## 🌟 Key Features

### 1. 🗂️ Asset Directory & Management
* **Clinical Registry:** Add and track high-value biomedical assets, complete with serial numbers, departments, locations, and condition ratings.
* **Sterilization Compliance:** Track surgical instruments and other equipment requiring regular sterilization. Easily log completed sterilization cycles to maintain clinical safety.
* **Smart Status Indicators:** Real-time visibility into whether assets are *Available*, *In-Use*, *Under Maintenance*, *Sterilization Due*, or *Retired*.

### 2. 🔄 Allocation & Transfer Workflows
* **Immediate & Scheduled Requests:** Staff can request equipment for immediate use or schedule future slots with automated overlap validation to prevent double-booking.
* **Superintendent Approvals:** Request state machine ensuring proper authorization before dispatch.
* **Departmental Transfers:** Easily request peer-to-peer equipment transfers directly from the dashboard.
* **Return & Condition Inspection:** Log returned items with condition notes to maintain a history of wear and tear.

### 3. 📅 Resource & Ward Booking
* **Shared Space Reservation:** Book clinical rooms, diagnostic spaces, or shared medical devices.
* **Schedule Controls:** Instantly reschedule, cancel, or modify bookings with built-in conflict prevention.

### 4. 🔧 Maintenance Workbench
* **Ticket Lifecycle:** Staff can raise tickets with priority tags (*Critical*, *High*, *Medium*, *Low*).
* **Technician Allocation:** Assign work orders to technicians with estimated completion times.
* **Resolution Reporting:** Keep detailed logs of all maintenance resolutions, repairs, and calibration details.

### 5. 🔍 Audits & Discrepancy Reports
* **Clinical Audits:** Launch structured audits for specific departments to verify asset locations.
* **Discrepancy Logging:** Mark items as *Verified*, *Missing*, or *Damaged* during physical inspections.
* **Audit Closing:** Generate compliance summaries and lock findings histories.

### 6. 🧠 Google Gemini AI-Powered Health Checks
* **Asset Summaries:** AI-generated operational health checklists.
* **Maintenance Risk Profile:** Predicts wear-and-tear risk using historic ticket frequencies and asset conditions.
* **Optimized Recommendations:** Provides actionable suggestions for inspection intervals and retirement planning using the **Gemini 3.5 Flash** model.

---

## 🛠️ Technology Stack

* **Frontend:** React (TypeScript), Vite, Tailwind CSS, Lucide React, Motion
* **Backend:** Express (TypeScript), tsx
* **Database:** In-memory Mock DB (`server/db.ts`) with disk persistence simulation (`data/db.json`)
* **AI Service:** `@google/genai` (Gemini 3.5 Flash)

---

## 🚀 Getting Started & Local Setup

### Prerequisites
Make sure you have **Node.js** installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/swaroop-5-6-7/odoo_hackathon.git
cd odoo_hackathon
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Secrets
Create a `.env` file in the root directory (or copy `.env.example` to `.env`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```
The server will start up, by default running at: **http://localhost:3000**

---

## 🏢 Role-based Access Levels

MediFlow simulates role-based access control for different clinical users:
* **Superintendent:** Full administration permissions (add departments, manage staff roles, register new assets, approve allocations/transfers, launch audits).
* **Department Head (HOD):** View department reports, raise requests, and approve/manage booking requests for their department's shared resources.
* **Nurse:** Search the asset directory, book shared spaces, raise maintenance requests, and initiate equipment allocation workflows.
* **Technician:** Access the maintenance workbench, start repairs, resolve tickets, and record calibration findings.
