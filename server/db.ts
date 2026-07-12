import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Types
export type Role = "Superintendent" | "DepartmentHead" | "Nurse" | "Technician";
export type EmployeeStatus = "Active" | "Inactive";
export type EquipmentStatus = "Available" | "Reserved" | "Allocated" | "UnderMaintenance" | "Sterilizing" | "Lost" | "Retired";
export type EquipmentCondition = "Excellent" | "Good" | "Fair" | "Poor";
export type RequestMode = "scheduled" | "immediate";
export type RequestStatus = "Pending" | "Approved" | "Active" | "Returned" | "Rejected" | "Cancelled" | "Overdue";
export type MaintenancePriority = "Critical" | "High" | "Medium" | "Low";
export type MaintenanceStatus = "Pending" | "Approved" | "Rejected" | "InProgress" | "Resolved";
export type AuditStatus = "Scheduled" | "InProgress" | "Completed" | "Closed";
export type FindingStatus = "Verified" | "Missing" | "Damaged";

export interface Resource {
  id: string;
  name: string;
  type: "Room" | "Equipment" | "Vehicle";
  location: string;
  status: "Available" | "Maintenance" | "Inactive";
}

export interface ResourceBooking {
  id: string;
  resourceId: string;
  bookedBy: string; // Employee ID
  purpose: string;
  startTime: number;
  endTime: number;
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
  createdAt: number;
}

export interface Department {
  id: string;
  name: string;
  headId?: string;
  parentDepartment?: string;
  status: "Active" | "Inactive";
  createdAt: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  departmentId: string;
  role: Role;
  status: EmployeeStatus;
  phone?: string;
  createdAt: number;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  assetTag: string;
  serialNumber: string;
  status: EquipmentStatus;
  location: string;
  departmentId?: string; // Current assigned dept (cache of current request)
  isShared: boolean;
  requiresSterilization: boolean;
  lastSterilized?: number;
  expiryDate?: number;
  condition: EquipmentCondition;
  acquisitionDate: number;
  acquisitionCost: number;
  notes?: string;
  createdAt: number;
}

export interface EquipmentRequest {
  id: string;
  equipmentId: string;
  departmentId: string;
  requestedBy: string;
  approvedBy?: string;
  mode: RequestMode;
  scheduledStart?: number;
  scheduledEnd?: number;
  actualStart?: number;
  actualEnd?: number;
  status: RequestStatus;
  purpose: string;
  patientId?: string;
  conditionCheck?: string;
  createdAt: number;
}

export interface MaintenanceRequest {
  id: string;
  equipmentId: string;
  raisedBy: string;
  approvedBy?: string;
  priority: MaintenancePriority;
  issue: string;
  status: MaintenanceStatus;
  technicianAssigned?: string;
  estimatedCompletion?: number;
  resolutionNotes?: string;
  createdAt: number;
}

export interface Audit {
  id: string;
  name: string;
  scope: string; // Department name or "All"
  startDate: number;
  endDate: number;
  auditors: string[]; // employee IDs
  status: AuditStatus;
  discrepancyReport?: string;
  createdAt: number;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  equipmentId: string;
  status: FindingStatus;
  markedBy: string;
  notes?: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: number;
  metadata: {
    equipmentId?: string;
    requestId?: string;
    fromStatus?: string;
    toStatus?: string;
  };
}

interface DBState {
  departments: Department[];
  employees: Employee[];
  equipment: Equipment[];
  equipmentRequests: EquipmentRequest[];
  maintenanceRequests: MaintenanceRequest[];
  audits: Audit[];
  auditFindings: AuditFinding[];
  activityLogs: ActivityLog[];
  resources: Resource[];
  bookings: ResourceBooking[];
  counters: Record<string, number>;
}

const DB_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Default initial state (seed data)
function getInitialState(): DBState {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Departments
  const depts: Department[] = [
    { id: "dept_icu", name: "ICU", status: "Active", createdAt: now - 30 * dayMs },
    { id: "dept_er", name: "Emergency Room", status: "Active", createdAt: now - 30 * dayMs },
    { id: "dept_surg", name: "Surgical Suite", status: "Active", createdAt: now - 30 * dayMs },
    { id: "dept_gen", name: "General Ward", status: "Active", createdAt: now - 30 * dayMs },
    { id: "dept_maint", name: "Biomedical Engineering (Maintenance)", status: "Active", createdAt: now - 30 * dayMs },
  ];

  // Default password hash for all seeded employees: "mediflow123"
  const defaultHash = bcrypt.hashSync("mediflow123", 10);

  // 2. Employees
  const emps: Employee[] = [
    {
      id: "emp_super",
      name: "Dr. Helen Cho",
      email: "helen.cho@mediflow.org",
      passwordHash: defaultHash,
      departmentId: "dept_icu",
      role: "Superintendent",
      status: "Active",
      phone: "+1 (555) 019-2834",
      createdAt: now - 25 * dayMs,
    },
    {
      id: "emp_hod_icu",
      name: "Dr. Sarah Jenkins",
      email: "sarah.jenkins@mediflow.org",
      passwordHash: defaultHash,
      departmentId: "dept_icu",
      role: "DepartmentHead",
      status: "Active",
      phone: "+1 (555) 019-5832",
      createdAt: now - 20 * dayMs,
    },
    {
      id: "emp_nurse_er",
      name: "Nurse Alex Rivera",
      email: "alex.rivera@mediflow.org",
      passwordHash: defaultHash,
      departmentId: "dept_er",
      role: "Nurse",
      status: "Active",
      phone: "+1 (555) 019-9944",
      createdAt: now - 15 * dayMs,
    },
    {
      id: "emp_tech_maint",
      name: "Tech Dave Miller",
      email: "dave.miller@mediflow.org",
      passwordHash: defaultHash,
      departmentId: "dept_maint",
      role: "Technician",
      status: "Active",
      phone: "+1 (555) 019-1122",
      createdAt: now - 10 * dayMs,
    },
  ];

  // Link HODs to departments
  depts[0].headId = "emp_hod_icu"; // ICU Head
  depts[1].headId = "emp_nurse_er"; // Emergency Head (acting)
  depts[4].headId = "emp_tech_maint"; // Maintenance Head (acting)

  // 3. Equipment
  const equip: Equipment[] = [
    {
      id: "eq_vent_1",
      name: "Ventilator V-100 (High-Flow)",
      category: "Ventilator",
      assetTag: "MF-0001",
      serialNumber: "SN-882736",
      status: "Allocated",
      location: "ICU-Bed1",
      departmentId: "dept_icu",
      isShared: true,
      requiresSterilization: true,
      lastSterilized: now - 3 * dayMs,
      condition: "Excellent",
      acquisitionDate: now - 180 * dayMs,
      acquisitionCost: 45000,
      notes: "High-pressure oxygen settings. Flow rate up to 60 L/min. Last calibration excellent.",
      createdAt: now - 180 * dayMs,
    },
    {
      id: "eq_defib_1",
      name: "Lifepack Defibrillator D-200",
      category: "Defibrillator",
      assetTag: "MF-0002",
      serialNumber: "SN-443212",
      status: "Available",
      location: "Emergency-Room3",
      departmentId: "dept_er",
      isShared: true,
      requiresSterilization: false,
      condition: "Good",
      acquisitionDate: now - 120 * dayMs,
      acquisitionCost: 12000,
      notes: "Biphasic defibrillator, battery status at 95% charge.",
      createdAt: now - 120 * dayMs,
    },
    {
      id: "eq_mon_1",
      name: "Patient Monitor M-10 (Multi-Para)",
      category: "Patient Monitor",
      assetTag: "MF-0003",
      serialNumber: "SN-128734",
      status: "Available",
      location: "Surgical-Bed2",
      departmentId: "dept_surg",
      isShared: false,
      requiresSterilization: true,
      lastSterilized: now - 9 * dayMs, // > 7 days ago -> OVERDUE sterilization flag!
      condition: "Fair",
      acquisitionDate: now - 240 * dayMs,
      acquisitionCost: 8500,
      notes: "ECG, NIBP, SpO2 capability. Temperature channel 2 slightly noisy.",
      createdAt: now - 240 * dayMs,
    },
    {
      id: "eq_cyl_1",
      name: "Medical Oxygen Cylinder O2-A",
      category: "Oxygen Cylinder",
      assetTag: "MF-0004",
      serialNumber: "SN-998822",
      status: "Available",
      location: "Storage-Room2",
      isShared: true,
      requiresSterilization: false,
      expiryDate: now + 10 * dayMs, // Expires soon
      condition: "Good",
      acquisitionDate: now - 30 * dayMs,
      acquisitionCost: 450,
      notes: "Standard pressure check passed. Clean and sealed.",
      createdAt: now - 30 * dayMs,
    },
    {
      id: "eq_pump_1",
      name: "Infusion Pump IP-5 (Volumetric)",
      category: "Infusion Pump",
      assetTag: "MF-0005",
      serialNumber: "SN-334411",
      status: "Allocated",
      location: "General-Ward-Room12",
      departmentId: "dept_gen",
      isShared: true,
      requiresSterilization: true,
      lastSterilized: now - 1 * dayMs,
      condition: "Excellent",
      acquisitionDate: now - 90 * dayMs,
      acquisitionCost: 3200,
      notes: "Flow rate accuracy calibrated last month.",
      createdAt: now - 90 * dayMs,
    },
  ];

  return {
    departments: depts,
    employees: emps,
    equipment: equip,
    equipmentRequests: [
      {
        id: "req_seed_1",
        equipmentId: "eq_vent_1",
        departmentId: "dept_icu",
        requestedBy: "emp_nurse_er",
        approvedBy: "emp_super",
        mode: "immediate",
        actualStart: now - 2 * dayMs,
        status: "Active",
        purpose: "Severe acute respiratory distress in ICU Bed 3",
        patientId: "PAT-2041",
        createdAt: now - 2 * dayMs,
      },
      {
        id: "req_seed_2",
        equipmentId: "eq_pump_1",
        departmentId: "dept_gen",
        requestedBy: "emp_nurse_er",
        approvedBy: "emp_super",
        mode: "scheduled",
        scheduledStart: now - 3 * dayMs,
        scheduledEnd: now - 1 * dayMs,
        actualStart: now - 3 * dayMs,
        status: "Active",
        purpose: "Post-op IV continuous saline infusion",
        patientId: "PAT-1182",
        createdAt: now - 3 * dayMs,
      },
      {
        id: "req_seed_3",
        equipmentId: "eq_defib_1",
        departmentId: "dept_er",
        requestedBy: "emp_nurse_er",
        approvedBy: "emp_super",
        mode: "immediate",
        actualStart: now - 5 * dayMs,
        actualEnd: now - 4 * dayMs,
        status: "Returned",
        purpose: "Emergency cardiac arrest stabilization - ER Bay 2",
        patientId: "PAT-8831",
        conditionCheck: "Excellent",
        createdAt: now - 5 * dayMs,
      },
      {
        id: "req_seed_4",
        equipmentId: "eq_cyl_1",
        departmentId: "dept_icu",
        requestedBy: "emp_hod_icu",
        mode: "immediate",
        status: "Pending",
        purpose: "Urgent supplemental oxygen for clinical procedure",
        patientId: "PAT-4402",
        createdAt: now - 30 * 60 * 1000,
      },
      {
        id: "req_seed_5",
        equipmentId: "eq_mon_1",
        departmentId: "dept_surg",
        requestedBy: "emp_nurse_er",
        approvedBy: "emp_super",
        mode: "scheduled",
        scheduledStart: now + 4 * 60 * 60 * 1000,
        scheduledEnd: now + 8 * 60 * 60 * 1000,
        status: "Approved",
        purpose: "Post-op vitals monitoring in Ward A Room 3",
        patientId: "PAT-5120",
        createdAt: now - 5 * 60 * 60 * 1000,
      },
      {
        id: "req_seed_6",
        equipmentId: "eq_vent_1",
        departmentId: "dept_icu",
        requestedBy: "emp_nurse_er",
        approvedBy: "emp_super",
        mode: "immediate",
        actualStart: now - 15 * dayMs,
        actualEnd: now - 10 * dayMs,
        status: "Returned",
        purpose: "Severe COPD exacerbation support - Bed 1",
        patientId: "PAT-0092",
        conditionCheck: "Excellent",
        createdAt: now - 15 * dayMs,
      },
      {
        id: "req_seed_7",
        equipmentId: "eq_pump_1",
        departmentId: "dept_gen",
        requestedBy: "emp_nurse_er",
        approvedBy: "emp_super",
        mode: "scheduled",
        scheduledStart: now - 6 * dayMs,
        scheduledEnd: now - 4 * dayMs,
        actualStart: now - 6 * dayMs,
        actualEnd: now - 4 * dayMs,
        status: "Returned",
        purpose: "Pediatric antibiotic hydration loop",
        patientId: "PAT-3391",
        conditionCheck: "Good",
        createdAt: now - 7 * dayMs,
      },
    ],
    maintenanceRequests: [
      {
        id: "maint_seed_1",
        equipmentId: "eq_mon_1",
        raisedBy: "emp_nurse_er",
        priority: "High",
        issue: "Temperature channel has intermittent readings and high noise levels. Needs calibration.",
        status: "Pending",
        createdAt: now - 1 * dayMs,
      },
      {
        id: "maint_seed_2",
        equipmentId: "eq_defib_1",
        raisedBy: "emp_nurse_er",
        approvedBy: "emp_super",
        priority: "Critical",
        issue: "Defibrillator screen flicker during high discharge simulation.",
        status: "Resolved",
        technicianAssigned: "emp_tech_maint",
        estimatedCompletion: now - 2 * dayMs,
        resolutionNotes: "Power supply decoupling capacitor replaced. Discharge calibration re-verified. Diagnostic logs green.",
        createdAt: now - 4 * dayMs,
      },
    ],
    audits: [],
    auditFindings: [],
    activityLogs: [
      {
        id: "log_init",
        userId: "emp_super",
        action: "System Initialization",
        details: "MediFlow v2 system started. 5 equipment, 4 employees seeded with rich histories.",
        timestamp: now - 10 * dayMs,
        metadata: {},
      },
      {
        id: "log_seed_1",
        userId: "emp_nurse_er",
        action: "Allocation Requested",
        details: "Requested High-Flow Ventilator MF-0001 for urgent bedside support",
        timestamp: now - 2 * dayMs,
        metadata: { equipmentId: "eq_vent_1" },
      },
      {
        id: "log_seed_2",
        userId: "emp_super",
        action: "Request Approved",
        details: "Approved allocation request for Ventilator MF-0001",
        timestamp: now - 1.9 * dayMs,
        metadata: { equipmentId: "eq_vent_1" },
      },
      {
        id: "log_seed_3",
        userId: "emp_nurse_er",
        action: "Equipment Dispatched",
        details: "Ventilator MF-0001 successfully moved and connected in Ward Bed 3",
        timestamp: now - 1.8 * dayMs,
        metadata: { equipmentId: "eq_vent_1" },
      },
      {
        id: "log_seed_4",
        userId: "emp_nurse_er",
        action: "Maintenance Raised",
        details: "Raised high-priority maintenance ticket for Patient Monitor MF-0003",
        timestamp: now - 1 * dayMs,
        metadata: { equipmentId: "eq_mon_1" },
      },
    ],
    resources: [
      { id: "res_room_b2", name: "Operating Room B2", type: "Room", location: "Surgical-Suite-Floor2", status: "Available" },
      { id: "res_room_a1", name: "ICU Critical Care A1", type: "Room", location: "ICU-Floor1", status: "Available" },
      { id: "res_room_c3", name: "Emergency Care Room C3", type: "Room", location: "Emergency-Floor1", status: "Available" },
      { id: "res_conf_alpha", name: "Conference Room Alpha", type: "Room", location: "Admin-Block-Floor3", status: "Available" },
      { id: "res_lab_bio", name: "Biomedical Training Lab", type: "Room", location: "Maint-Annex", status: "Available" }
    ],
    bookings: [
      {
        id: "book_1",
        resourceId: "res_room_b2",
        bookedBy: "emp_super",
        purpose: "Urgent cardiovascular surgery reservation",
        startTime: now + 2 * 60 * 60 * 1000,
        endTime: now + 4 * 60 * 60 * 1000,
        status: "Upcoming",
        createdAt: now - 5 * 60 * 60 * 1000
      },
      {
        id: "book_2",
        resourceId: "res_room_a1",
        bookedBy: "emp_hod_icu",
        purpose: "ICU bed setup & monitoring calibration run",
        startTime: now - 3 * 60 * 60 * 1000,
        endTime: now - 1 * 60 * 60 * 1000,
        status: "Completed",
        createdAt: now - 10 * 60 * 60 * 1000
      }
    ],
    counters: {
      assetTag: 5,
    },
  };
}

class DBManager {
  private state: DBState;

  constructor() {
    this.state = this.load();
  }

  private load(): DBState {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (process.env.VERCEL && !fs.existsSync(DB_FILE)) {
        const originalPath = path.join(process.cwd(), "data", "db.json");
        if (fs.existsSync(originalPath)) {
          fs.copyFileSync(originalPath, DB_FILE);
        }
      }
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(data);
        let modified = false;
        if (parsed.employees && Array.isArray(parsed.employees)) {
          const defaultHash = bcrypt.hashSync("mediflow123", 10);
          parsed.employees.forEach((emp: any) => {
            if (!emp.passwordHash) {
              emp.passwordHash = defaultHash;
              modified = true;
            }
          });
        }
        if (!parsed.resources) {
          parsed.resources = [
            { id: "res_room_b2", name: "Operating Room B2", type: "Room", location: "Surgical-Suite-Floor2", status: "Available" },
            { id: "res_room_a1", name: "ICU Critical Care A1", type: "Room", location: "ICU-Floor1", status: "Available" },
            { id: "res_room_c3", name: "Emergency Care Room C3", type: "Room", location: "Emergency-Floor1", status: "Available" },
            { id: "res_conf_alpha", name: "Conference Room Alpha", type: "Room", location: "Admin-Block-Floor3", status: "Available" },
            { id: "res_lab_bio", name: "Biomedical Training Lab", type: "Room", location: "Maint-Annex", status: "Available" }
          ];
          modified = true;
        }
        if (!parsed.bookings) {
          const now = Date.now();
          parsed.bookings = [
            {
              id: "book_1",
              resourceId: "res_room_b2",
              bookedBy: "emp_super",
              purpose: "Urgent cardiovascular surgery reservation",
              startTime: now + 2 * 60 * 60 * 1000,
              endTime: now + 4 * 60 * 60 * 1000,
              status: "Upcoming",
              createdAt: now - 5 * 60 * 60 * 1000
            },
            {
              id: "book_2",
              resourceId: "res_room_a1",
              bookedBy: "emp_hod_icu",
              purpose: "ICU bed setup & monitoring calibration run",
              startTime: now - 3 * 60 * 60 * 1000,
              endTime: now - 1 * 60 * 60 * 1000,
              status: "Completed",
              createdAt: now - 10 * 60 * 60 * 1000
            }
          ];
          modified = true;
        }
        if (modified) {
          this.saveState(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error("Error reading db file, using seeds:", err);
    }
    const state = getInitialState();
    this.saveState(state);
    return state;
  }

  private save(): void {
    this.saveState(this.state);
  }

  private saveState(state: DBState): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing db file:", err);
    }
  }

  // --- QUERY APIS ---
  getDepartments() {
    return this.state.departments;
  }

  getEmployees() {
    return this.state.employees;
  }

  getEquipment() {
    return this.state.equipment;
  }

  getRequests() {
    return this.state.equipmentRequests;
  }

  getMaintenanceRequests() {
    return this.state.maintenanceRequests;
  }

  getAudits() {
    return this.state.audits;
  }

  getAuditFindings(auditId: string) {
    return this.state.auditFindings.filter((f) => f.auditId === auditId);
  }

  getActivityLogs() {
    return this.state.activityLogs;
  }

  // --- MUTATION APIS ---
  addDepartment(name: string, headId?: string, parentDepartment?: string) {
    const dept: Department = {
      id: "dept_" + Math.random().toString(36).substr(2, 9),
      name,
      headId,
      parentDepartment,
      status: "Active",
      createdAt: Date.now(),
    };
    this.state.departments.push(dept);
    this.save();
    return dept;
  }

  updateDepartment(id: string, updates: Partial<Omit<Department, "id" | "createdAt">>) {
    const idx = this.state.departments.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.state.departments[idx] = { ...this.state.departments[idx], ...updates };
      this.save();
      return this.state.departments[idx];
    }
    throw new Error("Department not found");
  }

  addEmployee(name: string, email: string, departmentId: string, role: Role, phone?: string, password?: string) {
    // Check for duplicate email
    const existing = this.state.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error("An account with this email already exists.");

    const passwordHash = password ? bcrypt.hashSync(password, 10) : undefined;
    const emp: Employee = {
      id: "emp_" + Math.random().toString(36).substr(2, 9),
      name,
      email,
      passwordHash,
      departmentId,
      role,
      status: "Active",
      phone,
      createdAt: Date.now(),
    };
    this.state.employees.push(emp);
    this.save();
    return emp;
  }

  verifyPassword(employeeId: string, password: string): boolean {
    const emp = this.state.employees.find(e => e.id === employeeId);
    if (!emp || !emp.passwordHash) return false;
    return bcrypt.compareSync(password, emp.passwordHash);
  }

  setPassword(employeeId: string, newPassword: string) {
    const idx = this.state.employees.findIndex(e => e.id === employeeId);
    if (idx === -1) throw new Error("Employee not found");
    this.state.employees[idx].passwordHash = bcrypt.hashSync(newPassword, 10);
    this.save();
  }

  updateEmployee(id: string, updates: Partial<Omit<Employee, "id" | "createdAt">>) {
    const idx = this.state.employees.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.state.employees[idx] = { ...this.state.employees[idx], ...updates };
      this.save();
      return this.state.employees[idx];
    }
    throw new Error("Employee not found");
  }

  registerEquipment(data: Omit<Equipment, "id" | "assetTag" | "status" | "createdAt">) {
    // Atomic asset tag generation using counters
    const currentVal = this.state.counters["assetTag"] ?? 0;
    const nextVal = currentVal + 1;
    this.state.counters["assetTag"] = nextVal;

    const equip: Equipment = {
      ...data,
      id: "eq_" + Math.random().toString(36).substr(2, 9),
      assetTag: `MF-${String(nextVal).padStart(4, "0")}`,
      status: "Available",
      createdAt: Date.now(),
    };
    this.state.equipment.push(equip);
    this.save();
    return equip;
  }

  updateEquipment(id: string, updates: Partial<Omit<Equipment, "id" | "assetTag" | "createdAt">>) {
    const idx = this.state.equipment.findIndex((eq) => eq.id === id);
    if (idx !== -1) {
      this.state.equipment[idx] = { ...this.state.equipment[idx], ...updates };
      this.save();
      return this.state.equipment[idx];
    }
    throw new Error("Equipment not found");
  }

  requestEquipment(data: {
    equipmentId: string;
    departmentId: string;
    requestedBy: string;
    mode: RequestMode;
    scheduledStart?: number;
    scheduledEnd?: number;
    purpose: string;
    patientId?: string;
  }) {
    const request: EquipmentRequest = {
      id: "req_" + Math.random().toString(36).substr(2, 9),
      ...data,
      status: "Pending",
      createdAt: Date.now(),
    };
    this.state.equipmentRequests.push(request);
    this.save();
    return request;
  }

  approveRequest(id: string, approverId: string) {
    const req = this.state.equipmentRequests.find((r) => r.id === id);
    if (!req) throw new Error("Request not found");
    if (req.status !== "Pending") throw new Error("Request is no longer pending");

    req.status = "Approved";
    req.approvedBy = approverId;

    // Set equipment to Reserved immediately
    const eq = this.state.equipment.find((e) => e.id === req.equipmentId);
    if (eq) {
      // Automatic return of previous active request on transfer approval
      this.state.equipmentRequests.forEach((oldReq) => {
        if (
          oldReq.equipmentId === eq.id &&
          oldReq.id !== id &&
          (oldReq.status === "Active" || oldReq.status === "Overdue" || oldReq.status === "Approved")
        ) {
          oldReq.status = "Returned";
          oldReq.actualEnd = Date.now();
          oldReq.conditionCheck = "Released via Transfer";
        }
      });
      eq.status = "Reserved";
    }

    this.save();
    return req;
  }

  rejectRequest(id: string, approverId: string, reason: string) {
    const req = this.state.equipmentRequests.find((r) => r.id === id);
    if (!req) throw new Error("Request not found");
    if (req.status !== "Pending") throw new Error("Request is no longer pending");

    req.status = "Rejected";
    req.approvedBy = approverId;
    req.conditionCheck = `Rejected: ${reason}`;

    this.save();
    return req;
  }

  cancelRequest(id: string) {
    const req = this.state.equipmentRequests.find((r) => r.id === id);
    if (!req) throw new Error("Request not found");
    if (req.status !== "Pending" && req.status !== "Approved") {
      throw new Error("Cannot cancel an active or completed request");
    }

    const prevStatus = req.status;
    req.status = "Cancelled";

    // If it was already approved, release the equipment status from Reserved back to Available
    if (prevStatus === "Approved") {
      const eq = this.state.equipment.find((e) => e.id === req.equipmentId);
      if (eq && eq.status === "Reserved") {
        eq.status = "Available";
      }
    }

    this.save();
    return req;
  }

  dispatchRequest(id: string) {
    const req = this.state.equipmentRequests.find((r) => r.id === id);
    if (!req) throw new Error("Request not found");
    if (req.status !== "Approved") throw new Error("Request must be approved first");

    req.status = "Active";
    req.actualStart = Date.now();

    // Mark equipment as Allocated and assign cache departmentId
    const eq = this.state.equipment.find((e) => e.id === req.equipmentId);
    if (eq) {
      eq.status = "Allocated";
      eq.departmentId = req.departmentId;
    }

    this.save();
    return req;
  }

  returnRequest(id: string, conditionNotes?: string) {
    const req = this.state.equipmentRequests.find((r) => r.id === id);
    if (!req) throw new Error("Request not found");
    if (req.status !== "Active" && req.status !== "Overdue") {
      throw new Error("Request is not currently active");
    }

    req.status = "Returned";
    req.actualEnd = Date.now();
    req.conditionCheck = conditionNotes;

    // Reset equipment status. If requires sterilization, set to Sterilizing, else Available
    const eq = this.state.equipment.find((e) => e.id === req.equipmentId);
    if (eq) {
      if (eq.requiresSterilization) {
        eq.status = "Sterilizing";
      } else {
        eq.status = "Available";
      }
      // Equipment remains at the location but is now un-allocated from the active department cache (or keep it as currently holding)
      // Actually, v2 plan says: departmentId is only ever written inside request-approve and return mutations.
      // On return, do we clear departmentId or keep it? The plan says "system-owned cache of who currently holds this".
      // When returned to storage or sterilized, it might go back to a generic pool, or stay. Let's keep it or clear depending on state.
      // Let's keep the department but make the status Available/Sterilizing.
    }

    this.save();
    return req;
  }

  raiseMaintenanceRequest(equipmentId: string, raisedById: string, priority: MaintenancePriority, issue: string) {
    const request: MaintenanceRequest = {
      id: "maint_" + Math.random().toString(36).substr(2, 9),
      equipmentId,
      raisedBy: raisedById,
      priority,
      issue,
      status: "Pending",
      createdAt: Date.now(),
    };
    this.state.maintenanceRequests.push(request);
    this.save();
    return request;
  }

  approveMaintenance(id: string, approverId: string, technicianId: string, estCompletionMs?: number) {
    const req = this.state.maintenanceRequests.find((r) => r.id === id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.status !== "Pending") throw new Error("Request is no longer pending");

    req.status = "Approved";
    req.approvedBy = approverId;
    req.technicianAssigned = technicianId;
    req.estimatedCompletion = estCompletionMs ? Date.now() + estCompletionMs : undefined;

    // Set equipment to UnderMaintenance
    const eq = this.state.equipment.find((e) => e.id === req.equipmentId);
    if (eq) {
      eq.status = "UnderMaintenance";
    }

    this.save();
    return req;
  }

  startMaintenance(id: string) {
    const req = this.state.maintenanceRequests.find((r) => r.id === id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.status !== "Approved") throw new Error("Request must be approved first");

    req.status = "InProgress";

    this.save();
    return req;
  }

  resolveMaintenance(id: string, notes: string) {
    const req = this.state.maintenanceRequests.find((r) => r.id === id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.status !== "InProgress" && req.status !== "Approved" && req.status !== "Pending") {
      throw new Error("Invalid state transition");
    }

    req.status = "Resolved";
    req.resolutionNotes = notes;

    // Set equipment back to Available
    const eq = this.state.equipment.find((e) => e.id === req.equipmentId);
    if (eq) {
      eq.status = "Available";
      eq.condition = "Excellent"; // Biomedical tech restores to Excellent/Good
    }

    this.save();
    return req;
  }

  rejectMaintenance(id: string, approverId: string, notes: string) {
    const req = this.state.maintenanceRequests.find((r) => r.id === id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.status !== "Pending") throw new Error("Request is no longer pending");

    req.status = "Rejected";
    req.approvedBy = approverId;
    req.resolutionNotes = notes;

    this.save();
    return req;
  }

  completeSterilization(equipmentId: string) {
    const eq = this.state.equipment.find((e) => e.id === equipmentId);
    if (!eq) throw new Error("Equipment not found");
    if (eq.status !== "Sterilizing") throw new Error("Equipment is not sterilizing");

    eq.status = "Available";
    eq.lastSterilized = Date.now();
    this.save();
    return eq;
  }

  createAudit(name: string, scope: string, auditors: string[], startDate: number, endDate: number) {
    const audit: Audit = {
      id: "audit_" + Math.random().toString(36).substr(2, 9),
      name,
      scope,
      startDate,
      endDate,
      auditors,
      status: "Scheduled",
      createdAt: Date.now(),
    };
    this.state.audits.push(audit);
    this.save();
    return audit;
  }

  startAudit(id: string) {
    const audit = this.state.audits.find((a) => a.id === id);
    if (!audit) throw new Error("Audit not found");
    if (audit.status !== "Scheduled") throw new Error("Audit already started or completed");

    audit.status = "InProgress";
    this.save();
    return audit;
  }

  markFinding(auditId: string, equipmentId: string, status: FindingStatus, markedBy: string, notes?: string) {
    const idx = this.state.auditFindings.findIndex((f) => f.auditId === auditId && f.equipmentId === equipmentId);
    const finding: AuditFinding = {
      id: "find_" + Math.random().toString(36).substr(2, 9),
      auditId,
      equipmentId,
      status,
      markedBy,
      notes,
      createdAt: Date.now(),
    };

    if (idx !== -1) {
      this.state.auditFindings[idx] = finding;
    } else {
      this.state.auditFindings.push(finding);
    }
    this.save();
    return finding;
  }

  closeAudit(id: string, reportText: string) {
    const audit = this.state.audits.find((a) => a.id === id);
    if (!audit) throw new Error("Audit not found");
    if (audit.status !== "InProgress") throw new Error("Audit is not in progress");

    audit.status = "Closed";
    audit.discrepancyReport = reportText;

    // Update equipment statuses based on audit findings
    const findings = this.getAuditFindings(id);
    for (const f of findings) {
      const eq = this.state.equipment.find((e) => e.id === f.equipmentId);
      if (eq) {
        if (f.status === "Missing") {
          eq.status = "Lost";
        } else if (f.status === "Damaged") {
          eq.status = "UnderMaintenance";
          // Create an automatic critical maintenance request
          this.raiseMaintenanceRequest(eq.id, f.markedBy, "High", `Found damaged during Audit "${audit.name}". Notes: ${f.notes || "None"}`);
        }
      }
    }

    this.save();
    return audit;
  }

  addActivityLog(userId: string, action: string, details: string, metadata: ActivityLog["metadata"]) {
    const log: ActivityLog = {
      id: "log_" + Math.random().toString(36).substr(2, 9),
      userId,
      action,
      details,
      timestamp: Date.now(),
      metadata,
    };
    this.state.activityLogs.push(log);
    // Keep logs size manageable (e.g., max 1000 items)
    if (this.state.activityLogs.length > 1000) {
      this.state.activityLogs.shift();
    }
    this.save();
    return log;
  }

  getResources() {
    return this.state.resources || [];
  }

  getBookings() {
    return this.state.bookings || [];
  }

  addBooking(resourceId: string, bookedBy: string, purpose: string, startTime: number, endTime: number) {
    if (!this.state.bookings) this.state.bookings = [];
    
    // Validate inputs
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time.");
    }

    // Overlap validation
    const hasOverlap = this.state.bookings.some(b => {
      if (b.resourceId !== resourceId) return false;
      if (b.status === "Cancelled") return false;
      return (startTime < b.endTime) && (endTime > b.startTime);
    });

    if (hasOverlap) {
      throw new Error("Overlap detected: This resource is already booked for the requested time slot.");
    }

    const booking: ResourceBooking = {
      id: "book_" + Math.random().toString(36).substr(2, 9),
      resourceId,
      bookedBy,
      purpose,
      startTime,
      endTime,
      status: "Upcoming",
      createdAt: Date.now()
    };

    this.state.bookings.push(booking);
    this.save();
    return booking;
  }

  cancelBooking(id: string) {
    if (!this.state.bookings) return null;
    const booking = this.state.bookings.find(b => b.id === id);
    if (!booking) throw new Error("Booking not found");
    
    booking.status = "Cancelled";
    this.save();
    return booking;
  }

  rescheduleBooking(id: string, startTime: number, endTime: number) {
    if (!this.state.bookings) return null;
    const booking = this.state.bookings.find(b => b.id === id);
    if (!booking) throw new Error("Booking not found");

    if (startTime >= endTime) {
      throw new Error("Start time must be before end time.");
    }

    // Overlap validation (excluding this booking)
    const hasOverlap = this.state.bookings.some(b => {
      if (b.id === id) return false;
      if (b.resourceId !== booking.resourceId) return false;
      if (b.status === "Cancelled") return false;
      return (startTime < b.endTime) && (endTime > b.startTime);
    });

    if (hasOverlap) {
      throw new Error("Overlap detected: This resource is already booked for the requested time slot.");
    }

    booking.startTime = startTime;
    booking.endTime = endTime;
    booking.status = "Upcoming"; // Reset status to upcoming when rescheduled
    this.save();
    return booking;
  }
}

export const db = new DBManager();
