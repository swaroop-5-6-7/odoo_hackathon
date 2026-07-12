import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { db, Role } from "./server/db";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("GEMINI_API_KEY environment variable is not defined.");
}

// Permission Matrix
const PERMISSIONS: Record<Role, string[]> = {
  Superintendent: [
    "manageDepartments",
    "manageCategories",
    "manageEmployees",
    "registerEquipment",
    "approveRequests",
    "approveMaintenance",
    "createAudits",
    "viewAllReports",
    "requestEquipment",
    "raiseMaintenance"
  ],
  DepartmentHead: [
    "requestEquipment",
    "approveDepartmentRequests",
    "bookSharedResources",
    "viewDepartmentReports",
    "raiseMaintenance"
  ],
  Nurse: [
    "requestEquipment",
    "bookResources",
    "raiseMaintenance"
  ],
  Technician: [
    "requestEquipment",
    "resolveMaintenance",
    "raiseMaintenance"
  ],
};

// Authentication & Authorization Helper Middleware
function getAuthEmployee(req: express.Request) {
  const userEmail = req.headers["x-user-email"] as string;
  if (!userEmail) {
    return null;
  }
  const employees = db.getEmployees();
  const emp = employees.find((e) => e.email.toLowerCase() === userEmail.toLowerCase() && e.status === "Active");
  return emp || null;
}

function checkPermission(req: express.Request, res: express.Response, next: express.NextFunction) {
  const emp = getAuthEmployee(req);
  if (!emp) {
    return res.status(401).json({ error: "Unauthorized. Please select an active employee profile." });
  }
  // Store authenticated employee on request context
  (req as any).employee = emp;
  next();
}

// In-memory password reset tokens store
const resetTokens = new Map<string, { employeeId: string; expiresAt: number }>();

// Auth endpoints
app.get("/api/auth/current", (req, res) => {
  const emp = getAuthEmployee(req);
  if (!emp) {
    return res.json({ employee: null });
  }
  // Strip passwordHash from response
  const { passwordHash, ...safe } = emp as any;
  return res.json({ employee: safe });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const employees = db.getEmployees();
  const emp = employees.find((e) => e.email.toLowerCase() === email.toLowerCase());
  if (!emp) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (emp.status === "Inactive") {
    return res.status(403).json({ error: "Your account is inactive. Contact the Superintendent." });
  }

  const valid = db.verifyPassword(emp.id, password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  db.addActivityLog(emp.id, "Employee Login", `${emp.name} logged in.`, {});
  const { passwordHash, ...safe } = emp as any;
  return res.json({ employee: safe });
});

app.post("/api/auth/signup", (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  // Signup always creates a Nurse (lowest privilege) - no self-elevation
  // Superintendent must promote roles from Clinical Staff Setup
  try {
    const newEmp = db.addEmployee(name, email, "", "Nurse", phone, password);
    db.addActivityLog(newEmp.id, "Account Created", `New Nurse account registered: ${name}`, {});
    const { passwordHash, ...safe } = newEmp as any;
    return res.status(201).json({ employee: safe });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  const employees = db.getEmployees();
  const emp = employees.find((e) => e.email.toLowerCase() === email.toLowerCase());

  // Always return success to prevent email enumeration
  if (!emp) {
    return res.json({ message: "If an account exists, a reset link has been generated." });
  }

  // Generate token, valid 10 minutes
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  resetTokens.set(token, { employeeId: emp.id, expiresAt: Date.now() + 10 * 60 * 1000 });

  // Log to server console for demo testing
  console.log(`\n=== PASSWORD RESET TOKEN ===`);
  console.log(`User: ${emp.name} (${emp.email})`);
  console.log(`Token: ${token}`);
  console.log(`Link: http://localhost:3000/?reset_token=${token}`);
  console.log(`Expires: ${new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString()}`);
  console.log(`===========================\n`);

  return res.json({
    message: "Reset link generated successfully.",
    // Return token in response for demo purposes (in prod this would be email only)
    resetToken: token,
    resetLink: `http://localhost:3000/?reset_token=${token}`,
  });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const entry = resetTokens.get(token);
  if (!entry) {
    return res.status(400).json({ error: "Invalid or expired reset token." });
  }
  if (Date.now() > entry.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ error: "This reset link has expired (10-minute limit). Please request a new one." });
  }

  try {
    db.setPassword(entry.employeeId, newPassword);
    resetTokens.delete(token);
    const employees = db.getEmployees();
    const emp = employees.find(e => e.id === entry.employeeId);
    db.addActivityLog(entry.employeeId, "Password Reset", `Password successfully reset for ${emp?.name}`, {});
    return res.json({ message: "Password reset successfully. You can now sign in." });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Employee endpoints
app.get("/api/employees", checkPermission, (req, res) => {
  res.json(db.getEmployees());
});

app.post("/api/employees", checkPermission, (req, res) => {
  const { name, email, departmentId, role, phone } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("manageEmployees")) {
    return res.status(403).json({ error: "Only Superintendents can add new employees." });
  }

  try {
    const newEmp = db.addEmployee(name, email, departmentId, role, phone);
    db.addActivityLog(currentEmp.id, "Employee Created", `Added employee ${name} (${role})`, {});
    res.json(newEmp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/employees/:id/role", checkPermission, (req, res) => {
  const employeeId = req.params.id;
  const { role } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("manageEmployees")) {
    return res.status(403).json({ error: "Only Superintendents can manage roles." });
  }

  try {
    const updated = db.updateEmployee(employeeId, { role });
    db.addActivityLog(currentEmp.id, "Employee Promoted", `Promoted ${updated.name} to ${role}`, {});
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/employees/promote", checkPermission, (req, res) => {
  const { employeeId, role } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("manageEmployees")) {
    return res.status(403).json({ error: "Only Superintendents can manage roles." });
  }

  try {
    const updated = db.updateEmployee(employeeId, { role });
    db.addActivityLog(currentEmp.id, "Employee Promoted", `Promoted ${updated.name} to ${role}`, {});
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/employees/:id/status", checkPermission, (req, res) => {
  const employeeId = req.params.id;
  const { status } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("manageEmployees")) {
    return res.status(403).json({ error: "Only Superintendents can manage employee status." });
  }

  try {
    const updated = db.updateEmployee(employeeId, { status });
    db.addActivityLog(currentEmp.id, "Employee Status Updated", `Changed ${updated.name} status to ${status}`, {});
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/employees/status", checkPermission, (req, res) => {
  const { employeeId, status } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("manageEmployees")) {
    return res.status(403).json({ error: "Only Superintendents can manage employee status." });
  }

  try {
    const updated = db.updateEmployee(employeeId, { status });
    db.addActivityLog(currentEmp.id, "Employee Status Updated", `Changed ${updated.name} status to ${status}`, {});
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Department endpoints
app.get("/api/departments", checkPermission, (req, res) => {
  res.json(db.getDepartments());
});

app.post("/api/departments", checkPermission, (req, res) => {
  const { name, headId, parentDepartment } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("manageDepartments")) {
    return res.status(403).json({ error: "Only Superintendents can manage departments." });
  }

  try {
    const dept = db.addDepartment(name, headId, parentDepartment);
    db.addActivityLog(currentEmp.id, "Department Created", `Created department "${name}"`, {});
    res.json(dept);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/departments/edit", checkPermission, (req, res) => {
  const { departmentId, name, headId, parentDepartment, status } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("manageDepartments")) {
    return res.status(403).json({ error: "Only Superintendents can manage departments." });
  }

  try {
    const updated = db.updateDepartment(departmentId, { name, headId, parentDepartment, status });
    db.addActivityLog(currentEmp.id, "Department Updated", `Updated department "${updated.name}"`, {});
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Equipment endpoints
app.get("/api/equipment", checkPermission, (req, res) => {
  res.json(db.getEquipment());
});

app.post("/api/equipment", checkPermission, (req, res) => {
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("registerEquipment")) {
    return res.status(403).json({ error: "Only Superintendents can register new equipment." });
  }

  const {
    name,
    category,
    serialNumber,
    location,
    isShared,
    requiresSterilization,
    condition,
    acquisitionCost,
    notes,
  } = req.body;

  try {
    const equip = db.registerEquipment({
      name,
      category,
      serialNumber,
      location,
      isShared: !!isShared,
      requiresSterilization: !!requiresSterilization,
      condition,
      acquisitionDate: Date.now(),
      acquisitionCost: Number(acquisitionCost) || 0,
      notes,
    });

    db.addActivityLog(currentEmp.id, "Equipment Registered", `Registered new ${category}: ${name} (${equip.assetTag})`, {
      equipmentId: equip.id,
    });

    res.json(equip);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/equipment/:id/sterilize", checkPermission, (req, res) => {
  const equipmentId = req.params.id;
  const currentEmp = (req as any).employee;

  try {
    const eq = db.completeSterilization(equipmentId);
    db.addActivityLog(currentEmp.id, "Equipment Sterilized", `Completed sterilization cycle for ${eq.name} (${eq.assetTag})`, {
      equipmentId: eq.id,
    });
    res.json(eq);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/equipment/sterilize", checkPermission, (req, res) => {
  const { equipmentId } = req.body;
  const currentEmp = (req as any).employee;

  // Technicians, Nurses, and Superintendents can all complete sterilization
  try {
    const eq = db.completeSterilization(equipmentId);
    db.addActivityLog(currentEmp.id, "Equipment Sterilized", `Completed sterilization cycle for ${eq.name} (${eq.assetTag})`, {
      equipmentId: eq.id,
    });
    res.json(eq);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Equipment Request / Allocation endpoints
app.get("/api/requests", checkPermission, (req, res) => {
  res.json(db.getRequests());
});

// Overlap check helper function from revised plan
function isEquipmentOverlapping(
  equipmentId: string,
  start: number,
  end: number,
  requests: any[]
) {
  const activeRequests = requests.filter(
    (r) =>
      r.equipmentId === equipmentId &&
      (r.status === "Approved" || r.status === "Active" || r.status === "Overdue")
  );

  return activeRequests.some((r) => {
    // If there is an active immediate-mode request with no end time, it is overlapping/blocked
    if (r.mode === "immediate" && !r.actualEnd) {
      return true;
    }
    const rStart = r.scheduledStart ?? r.actualStart!;
    const rEnd = r.scheduledEnd ?? r.actualEnd ?? Infinity;
    return start < rEnd && end > rStart;
  });
}

app.post("/api/requests", checkPermission, (req, res) => {
  const currentEmp = (req as any).employee;
  const { equipmentId, mode, scheduledStart, scheduledEnd, purpose, patientId } = req.body;

  if (!PERMISSIONS[currentEmp.role as Role].includes("requestEquipment")) {
    return res.status(403).json({ error: "Your role lacks permission to request equipment." });
  }

  // Validate overlap
  if (mode === "scheduled") {
    if (!scheduledStart || !scheduledEnd) {
      return res.status(400).json({ error: "Scheduled requests require start and end times." });
    }
    if (scheduledStart >= scheduledEnd) {
      return res.status(400).json({ error: "Start time must be before end time." });
    }

    const overlap = isEquipmentOverlapping(equipmentId, scheduledStart, scheduledEnd, db.getRequests());
    if (overlap) {
      return res.status(400).json({ error: "Equipment is already booked or allocated during this time slot." });
    }
  } else {
    // Immediate mode: is it busy right now?
    const currentActive = db.getRequests().find(
      (r) => r.equipmentId === equipmentId && (r.status === "Active" || r.status === "Overdue" || r.status === "Approved")
    );
    if (currentActive) {
      return res.status(400).json({ error: "Equipment is currently allocated or reserved." });
    }
  }

  // Ensure equipment is actually available (e.g., not under maintenance, lost, retired, etc.)
  const eq = db.getEquipment().find((e) => e.id === equipmentId);
  if (!eq) {
    return res.status(404).json({ error: "Equipment not found." });
  }
  if (eq.status !== "Available") {
    return res.status(400).json({ error: `Equipment is currently ${eq.status} and cannot be requested.` });
  }

  try {
    const request = db.requestEquipment({
      equipmentId,
      departmentId: currentEmp.departmentId,
      requestedBy: currentEmp.id,
      mode,
      scheduledStart: mode === "scheduled" ? Number(scheduledStart) : undefined,
      scheduledEnd: mode === "scheduled" ? Number(scheduledEnd) : undefined,
      purpose,
      patientId,
    });

    db.addActivityLog(currentEmp.id, "Request Created", `Requested ${eq.name} for ${mode === "immediate" ? "Immediate Use" : "Scheduled Slot"}`, {
      equipmentId: eq.id,
      requestId: request.id,
    });

    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/transfer", checkPermission, (req, res) => {
  const currentEmp = (req as any).employee;
  const { equipmentId, toEmployeeId, reason } = req.body;

  if (!PERMISSIONS[currentEmp.role as Role].includes("requestEquipment")) {
    return res.status(403).json({ error: "Your role lacks permission to request equipment." });
  }

  const eq = db.getEquipment().find((e) => e.id === equipmentId);
  if (!eq) {
    return res.status(404).json({ error: "Equipment not found." });
  }

  const targetEmp = db.getEmployees().find((e) => e.id === toEmployeeId);
  if (!targetEmp) {
    return res.status(404).json({ error: "Target employee not found." });
  }

  // Find who currently holds it
  const activeReq = db.getRequests().find(
    (r) => r.equipmentId === equipmentId && (r.status === "Active" || r.status === "Overdue" || r.status === "Approved")
  );
  const fromEmp = activeReq ? db.getEmployees().find((e) => e.id === activeReq.requestedBy) : null;
  const fromName = fromEmp ? fromEmp.name : "Current Holder";

  try {
    const request = db.requestEquipment({
      equipmentId,
      departmentId: targetEmp.departmentId,
      requestedBy: targetEmp.id,
      mode: "immediate",
      purpose: `Transfer from ${fromName}. Reason: ${reason || "No reason specified"}`,
    });

    db.addActivityLog(currentEmp.id, "Transfer Requested", `Requested transfer of ${eq.name} from ${fromName} to ${targetEmp.name}`, {
      equipmentId: eq.id,
      requestId: request.id,
    });

    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/:id/approve", checkPermission, (req, res) => {
  const requestId = req.params.id;
  const currentEmp = (req as any).employee;

  const request = db.getRequests().find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (currentEmp.role !== "Superintendent") {
    return res.status(403).json({ error: "Only the Superintendent is authorized to approve requests." });
  }

  if (request.mode === "scheduled") {
    const overlap = isEquipmentOverlapping(request.equipmentId, request.scheduledStart!, request.scheduledEnd!, db.getRequests().filter((r) => r.id !== requestId));
    if (overlap) {
      return res.status(400).json({ error: "Conflict detected: Equipment was claimed by another overlapping request." });
    }
  } else {
    const active = db.getRequests().find((r) => r.equipmentId === request.equipmentId && r.id !== requestId && (r.status === "Active" || r.status === "Overdue" || r.status === "Approved"));
    if (active) {
      return res.status(400).json({ error: "Conflict detected: Equipment is currently in use." });
    }
  }

  try {
    const updated = db.approveRequest(requestId, currentEmp.id);
    db.addActivityLog(currentEmp.id, "Request Approved", `Approved request for ${request.id}`, {
      equipmentId: request.equipmentId,
      requestId: request.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/approve", checkPermission, (req, res) => {
  const { requestId } = req.body;
  const currentEmp = (req as any).employee;

  const request = db.getRequests().find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (currentEmp.role !== "Superintendent") {
    return res.status(403).json({ error: "Only the Superintendent is authorized to approve requests." });
  }

  if (request.mode === "scheduled") {
    const overlap = isEquipmentOverlapping(request.equipmentId, request.scheduledStart!, request.scheduledEnd!, db.getRequests().filter((r) => r.id !== requestId));
    if (overlap) {
      return res.status(400).json({ error: "Conflict detected: Equipment was claimed by another overlapping request." });
    }
  } else {
    const active = db.getRequests().find((r) => r.equipmentId === request.equipmentId && r.id !== requestId && (r.status === "Active" || r.status === "Overdue" || r.status === "Approved"));
    if (active) {
      return res.status(400).json({ error: "Conflict detected: Equipment is currently in use." });
    }
  }

  try {
    const updated = db.approveRequest(requestId, currentEmp.id);
    db.addActivityLog(currentEmp.id, "Request Approved", `Approved request for ${request.id}`, {
      equipmentId: request.equipmentId,
      requestId: request.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/:id/reject", checkPermission, (req, res) => {
  const requestId = req.params.id;
  const { reason } = req.body;
  const currentEmp = (req as any).employee;

  const request = db.getRequests().find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (currentEmp.role !== "Superintendent") {
    return res.status(403).json({ error: "Only the Superintendent is authorized to reject requests." });
  }

  try {
    const updated = db.rejectRequest(requestId, currentEmp.id, reason || "No reason provided");
    db.addActivityLog(currentEmp.id, "Request Rejected", `Rejected request for ${request.id}. Reason: ${reason}`, {
      equipmentId: request.equipmentId,
      requestId: request.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/reject", checkPermission, (req, res) => {
  const { requestId, reason } = req.body;
  const currentEmp = (req as any).employee;

  const request = db.getRequests().find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (currentEmp.role !== "Superintendent") {
    return res.status(403).json({ error: "Only the Superintendent is authorized to reject requests." });
  }

  try {
    const updated = db.rejectRequest(requestId, currentEmp.id, reason || "No reason provided");
    db.addActivityLog(currentEmp.id, "Request Rejected", `Rejected request for ${request.id}. Reason: ${reason}`, {
      equipmentId: request.equipmentId,
      requestId: request.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/:id/cancel", checkPermission, (req, res) => {
  const requestId = req.params.id;
  const currentEmp = (req as any).employee;

  const request = db.getRequests().find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  // User must be either requester, HOD, or Superintendent
  const isRequester = request.requestedBy === currentEmp.id;
  const isSuper = PERMISSIONS[currentEmp.role as Role].includes("approveRequests");
  const isHOD = currentEmp.role === "DepartmentHead" && currentEmp.departmentId === request.departmentId;

  if (!isRequester && !isSuper && !isHOD) {
    return res.status(403).json({ error: "You cannot cancel this request." });
  }

  try {
    const updated = db.cancelRequest(requestId);
    db.addActivityLog(currentEmp.id, "Request Cancelled", `Cancelled request for ${request.id}`, {
      equipmentId: request.equipmentId,
      requestId: request.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/cancel", checkPermission, (req, res) => {
  const { requestId } = req.body;
  const currentEmp = (req as any).employee;

  const request = db.getRequests().find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  // User must be either requester, HOD, or Superintendent
  const isRequester = request.requestedBy === currentEmp.id;
  const isSuper = PERMISSIONS[currentEmp.role as Role].includes("approveRequests");
  const isHOD = currentEmp.role === "DepartmentHead" && currentEmp.departmentId === request.departmentId;

  if (!isRequester && !isSuper && !isHOD) {
    return res.status(403).json({ error: "You cannot cancel this request." });
  }

  try {
    const updated = db.cancelRequest(requestId);
    db.addActivityLog(currentEmp.id, "Request Cancelled", `Cancelled request for ${request.id}`, {
      equipmentId: request.equipmentId,
      requestId: request.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/:id/dispatch", checkPermission, (req, res) => {
  const requestId = req.params.id;
  const currentEmp = (req as any).employee;

  // Nurse, HOD, or Superintendent can physically dispatch/pickup
  try {
    const updated = db.dispatchRequest(requestId);
    db.addActivityLog(currentEmp.id, "Equipment Dispatched", `Equipment dispatched for request ${requestId}`, {
      equipmentId: updated.equipmentId,
      requestId: updated.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/dispatch", checkPermission, (req, res) => {
  const { requestId } = req.body;
  const currentEmp = (req as any).employee;

  // Nurse, HOD, or Superintendent can physically dispatch/pickup
  try {
    const updated = db.dispatchRequest(requestId);
    db.addActivityLog(currentEmp.id, "Equipment Dispatched", `Equipment dispatched for request ${requestId}`, {
      equipmentId: updated.equipmentId,
      requestId: updated.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/:id/return", checkPermission, (req, res) => {
  const requestId = req.params.id;
  const { conditionCheck } = req.body;
  const currentEmp = (req as any).employee;

  try {
    const updated = db.returnRequest(requestId, conditionCheck);
    db.addActivityLog(currentEmp.id, "Equipment Returned", `Equipment returned for request ${requestId}. Condition notes: ${conditionCheck || "Excellent"}`, {
      equipmentId: updated.equipmentId,
      requestId: updated.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/return", checkPermission, (req, res) => {
  const { requestId, conditionCheck } = req.body;
  const currentEmp = (req as any).employee;

  try {
    const updated = db.returnRequest(requestId, conditionCheck);
    db.addActivityLog(currentEmp.id, "Equipment Returned", `Equipment returned for request ${requestId}. Condition notes: ${conditionCheck || "Excellent"}`, {
      equipmentId: updated.equipmentId,
      requestId: updated.id,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Maintenance endpoints
app.get("/api/maintenance", checkPermission, (req, res) => {
  res.json(db.getMaintenanceRequests());
});

app.post("/api/maintenance", checkPermission, (req, res) => {
  const { equipmentId, priority, issue } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("raiseMaintenance")) {
    return res.status(403).json({ error: "Your role cannot raise maintenance requests." });
  }

  try {
    const maint = db.raiseMaintenanceRequest(equipmentId, currentEmp.id, priority, issue);
    db.addActivityLog(currentEmp.id, "Maintenance Raised", `Raised maintenance request for ${equipmentId}. Issue: ${issue}`, {
      equipmentId,
    });
    res.json(maint);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/:id/approve", checkPermission, (req, res) => {
  const maintenanceId = req.params.id;
  const { technicianAssigned, estimatedHours } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("approveMaintenance")) {
    return res.status(403).json({ error: "Only Superintendents can approve maintenance." });
  }

  try {
    const estMs = Number(estimatedHours) ? Number(estimatedHours) * 60 * 60 * 1000 : undefined;
    const updated = db.approveMaintenance(maintenanceId, currentEmp.id, technicianAssigned, estMs);
    db.addActivityLog(currentEmp.id, "Maintenance Approved", `Approved maintenance request ${maintenanceId}. Assigned technician: ${technicianAssigned}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/approve", checkPermission, (req, res) => {
  const { maintenanceId, technicianId, estimatedCompletionMs } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("approveMaintenance")) {
    return res.status(403).json({ error: "Only Superintendents can approve maintenance." });
  }

  try {
    const updated = db.approveMaintenance(maintenanceId, currentEmp.id, technicianId, Number(estimatedCompletionMs));
    db.addActivityLog(currentEmp.id, "Maintenance Approved", `Approved maintenance request ${maintenanceId}. Assigned technician: ${technicianId}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/:id/start", checkPermission, (req, res) => {
  const maintenanceId = req.params.id;
  const currentEmp = (req as any).employee;

  try {
    const updated = db.startMaintenance(maintenanceId);
    db.addActivityLog(currentEmp.id, "Maintenance Started", `Technician started work on request ${maintenanceId}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/start", checkPermission, (req, res) => {
  const { maintenanceId } = req.body;
  const currentEmp = (req as any).employee;

  // Technicians can start maintenance work
  try {
    const updated = db.startMaintenance(maintenanceId);
    db.addActivityLog(currentEmp.id, "Maintenance Started", `Technician started work on request ${maintenanceId}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/:id/resolve", checkPermission, (req, res) => {
  const maintenanceId = req.params.id;
  const { resolutionNotes } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("resolveMaintenance")) {
    return res.status(403).json({ error: "Only Technicians can resolve maintenance requests." });
  }

  try {
    const updated = db.resolveMaintenance(maintenanceId, resolutionNotes);
    db.addActivityLog(currentEmp.id, "Maintenance Resolved", `Resolved maintenance request ${maintenanceId}. Resolution: ${resolutionNotes}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/resolve", checkPermission, (req, res) => {
  const { maintenanceId, notes } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("resolveMaintenance")) {
    return res.status(403).json({ error: "Only Technicians can resolve maintenance requests." });
  }

  try {
    const updated = db.resolveMaintenance(maintenanceId, notes);
    db.addActivityLog(currentEmp.id, "Maintenance Resolved", `Resolved maintenance request ${maintenanceId}. Resolution: ${notes}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/:id/reject", checkPermission, (req, res) => {
  const maintenanceId = req.params.id;
  const { notes } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("approveMaintenance")) {
    return res.status(403).json({ error: "Only Superintendents can reject maintenance." });
  }

  try {
    const updated = db.rejectMaintenance(maintenanceId, currentEmp.id, notes);
    db.addActivityLog(currentEmp.id, "Maintenance Rejected", `Rejected maintenance request ${maintenanceId}. Notes: ${notes}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/maintenance/reject", checkPermission, (req, res) => {
  const { maintenanceId, notes } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("approveMaintenance")) {
    return res.status(403).json({ error: "Only Superintendents can reject maintenance." });
  }

  try {
    const updated = db.rejectMaintenance(maintenanceId, currentEmp.id, notes);
    db.addActivityLog(currentEmp.id, "Maintenance Rejected", `Rejected maintenance request ${maintenanceId}. Notes: ${notes}`, {
      equipmentId: updated.equipmentId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Audit endpoints
app.get("/api/audits", checkPermission, (req, res) => {
  res.json(db.getAudits());
});

app.post("/api/audits", checkPermission, (req, res) => {
  const { name, scope, auditors, startDate, endDate } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("createAudits")) {
    return res.status(403).json({ error: "Only Superintendents can create audit cycles." });
  }

  try {
    const audit = db.createAudit(name, scope, auditors || [], Number(startDate), Number(endDate));
    db.addActivityLog(currentEmp.id, "Audit Cycle Created", `Created audit cycle "${name}" for scope: ${scope}`, {});
    res.json(audit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/audits/start", checkPermission, (req, res) => {
  const { auditId } = req.body;
  const currentEmp = (req as any).employee;

  try {
    const updated = db.startAudit(auditId);
    db.addActivityLog(currentEmp.id, "Audit Cycle Started", `Started audit cycle "${updated.name}"`, {});
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/audits/:id/findings", checkPermission, (req, res) => {
  res.json(db.getAuditFindings(req.params.id));
});

app.post("/api/audits/findings", checkPermission, (req, res) => {
  const { auditId, equipmentId, status, notes } = req.body;
  const currentEmp = (req as any).employee;

  try {
    const finding = db.markFinding(auditId, equipmentId, status, currentEmp.id, notes);
    db.addActivityLog(currentEmp.id, "Audit Finding Recorded", `Audit finding recorded: ${equipmentId} marked as ${status}`, {});
    res.json(finding);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/audits/close", checkPermission, async (req, res) => {
  const { auditId } = req.body;
  const currentEmp = (req as any).employee;

  if (!PERMISSIONS[currentEmp.role as Role].includes("createAudits")) {
    return res.status(403).json({ error: "Only Superintendents can close audit cycles." });
  }

  const audit = db.getAudits().find((a) => a.id === auditId);
  if (!audit) {
    return res.status(404).json({ error: "Audit cycle not found." });
  }

  const findings = db.getAuditFindings(auditId);
  const equipment = db.getEquipment();

  // Create summary text or use Gemini API to generate an elegant report
  let reportText = `Audit closed on ${new Date().toLocaleDateString()}.\n\n`;
  reportText += `Scope: ${audit.scope}\n`;
  reportText += `Findings count: ${findings.length}\n`;

  const verified = findings.filter((f) => f.status === "Verified");
  const missing = findings.filter((f) => f.status === "Missing");
  const damaged = findings.filter((f) => f.status === "Damaged");

  reportText += `- Verified: ${verified.length}\n`;
  reportText += `- Missing (Lost): ${missing.length}\n`;
  reportText += `- Damaged (Needs Maintenance): ${damaged.length}\n\n`;

  reportText += "Detailed Discrepancy Findings:\n";
  for (const f of findings) {
    const eq = equipment.find((e) => e.id === f.equipmentId);
    if (eq && f.status !== "Verified") {
      reportText += `* [${f.status}] ${eq.name} (Tag: ${eq.assetTag}, Serial: ${eq.serialNumber}) at location ${eq.location}. notes: ${f.notes || "None"}\n`;
    }
  }

  // Ask Gemini to write a professional executive analysis of this audit report
  if (ai) {
    try {
      const prompt = `You are a professional hospital clinical operations officer. Generate a concise, 1-2 paragraph executive discrepancy report based on the following raw audit findings. Include operational insights, potential risks to patient care if key equipment is missing, and corrective recommendations. Do not make up extra facts. Keep it structured and action-oriented.

Raw Report Data:
${reportText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        reportText += "\n--- AI Operations & Safety Risk Analysis ---\n" + response.text.trim();
      }
    } catch (err) {
      console.error("Gemini failed to generate report, using fallback text:", err);
      reportText += "\n(AI Discrepancy Report Analysis temporarily unavailable.)";
    }
  }

  try {
    const updated = db.closeAudit(auditId, reportText);
    db.addActivityLog(currentEmp.id, "Audit Cycle Closed", `Closed audit cycle "${updated.name}"`, {});
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Resource & Booking endpoints
app.get("/api/resources", checkPermission, (req, res) => {
  res.json(db.getResources());
});

app.get("/api/bookings", checkPermission, (req, res) => {
  res.json(db.getBookings());
});

app.post("/api/bookings", checkPermission, (req, res) => {
  const { resourceId, purpose, startTime, endTime } = req.body;
  const currentEmp = (req as any).employee;

  try {
    const booking = db.addBooking(resourceId, currentEmp.id, purpose, Number(startTime), Number(endTime));
    const resource = db.getResources().find(r => r.id === resourceId);
    db.addActivityLog(currentEmp.id, "Resource Booked", `Booked resource "${resource?.name || resourceId}" for period: ${new Date(Number(startTime)).toLocaleString()} - ${new Date(Number(endTime)).toLocaleString()}`, {});
    res.json(booking);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/bookings/:id/cancel", checkPermission, (req, res) => {
  const bookingId = req.params.id;
  const currentEmp = (req as any).employee;

  try {
    const booking = db.cancelBooking(bookingId);
    if (booking) {
      const resource = db.getResources().find(r => r.id === booking.resourceId);
      db.addActivityLog(currentEmp.id, "Booking Cancelled", `Cancelled booking for "${resource?.name || booking.resourceId}"`, {});
    }
    res.json(booking);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/bookings/:id/reschedule", checkPermission, (req, res) => {
  const bookingId = req.params.id;
  const { startTime, endTime } = req.body;
  const currentEmp = (req as any).employee;

  try {
    const booking = db.rescheduleBooking(bookingId, Number(startTime), Number(endTime));
    if (booking) {
      const resource = db.getResources().find(r => r.id === booking.resourceId);
      db.addActivityLog(currentEmp.id, "Booking Rescheduled", `Rescheduled booking for "${resource?.name || booking.resourceId}" to period: ${new Date(Number(startTime)).toLocaleString()} - ${new Date(Number(endTime)).toLocaleString()}`, {});
    }
    res.json(booking);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Activity logs endpoints
app.get("/api/logs", checkPermission, (req, res) => {
  const logs = [...db.getActivityLogs()].sort((a, b) => b.timestamp - a.timestamp);
  res.json(logs);
});

app.get("/api/activity-logs", checkPermission, (req, res) => {
  const logs = [...db.getActivityLogs()].sort((a, b) => b.timestamp - a.timestamp);
  res.json(logs);
});

// Dashboard metrics endpoint
app.get("/api/dashboard/kpis", checkPermission, (req, res) => {
  const equipment = db.getEquipment();
  const requests = db.getRequests();
  const maintRequests = db.getMaintenanceRequests();
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  // Available
  const availableCount = equipment.filter((eq) => eq.status === "Available").length;

  // Active allocations (Approved or Active)
  const activeCount = requests.filter((r) => r.status === "Active" || r.status === "Approved").length;

  // Critical maintenance today
  const criticalMaintCount = maintRequests.filter(
    (mr) => mr.priority === "Critical" && (mr.status === "Pending" || mr.status === "Approved" || mr.status === "InProgress")
  ).length;

  // Overdue returns (scheduled end passed and not returned/cancelled)
  let overdueCount = 0;
  for (const r of requests) {
    if (r.mode === "scheduled" && r.status === "Active" && r.scheduledEnd && now > r.scheduledEnd) {
      overdueCount++;
    }
  }

  // Sterilization Due Count: last sterilized was more than 7 days ago OR never sterilized
  const sterilizationDueCount = equipment.filter(
    (eq) => eq.requiresSterilization && (!eq.lastSterilized || now - eq.lastSterilized > weekMs)
  ).length;

  // Active bookings (Ongoing scheduled requests + resource bookings)
  const activeBookingsCount = (db.getBookings() || []).filter(b => b.status === "Upcoming" || b.status === "Ongoing").length;

  res.json({
    available: availableCount,
    activeAllocations: activeCount,
    maintenanceToday: criticalMaintCount,
    overdueReturns: overdueCount,
    sterilizationDue: sterilizationDueCount,
    activeBookings: activeBookingsCount,
  });
});

// Gemini Analysis API
app.post("/api/gemini/analyze", checkPermission, async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: "Gemini API client is not initialized. Please verify your secrets." });
  }

  const { equipmentId } = req.body;
  if (!equipmentId) {
    return res.status(400).json({ error: "equipmentId is required." });
  }

  const eq = db.getEquipment().find((e) => e.id === equipmentId);
  if (!eq) {
    return res.status(404).json({ error: "Equipment not found." });
  }

  // Gather historical activity logs, maintenance records, and requests for this item
  const logs = db.getActivityLogs().filter((l) => l.metadata?.equipmentId === equipmentId);
  const maints = db.getMaintenanceRequests().filter((mr) => mr.equipmentId === equipmentId);
  const requests = db.getRequests().filter((r) => r.equipmentId === equipmentId);

  const prompt = `You are an expert Clinical Engineering Consultant analyzing an item of critical medical equipment. Provide an operational summary, health status analysis, and recommended calibration/sterilization schedule. Do not fabricate dates or logs. Focus on real risk assessments.

Equipment Information:
- Name: ${eq.name}
- Category: ${eq.category}
- Asset Tag: ${eq.assetTag}
- Serial Number: ${eq.serialNumber}
- Condition: ${eq.condition}
- Current Status: ${eq.status}
- Last Sterilized: ${eq.lastSterilized ? new Date(eq.lastSterilized).toLocaleDateString() : "Never"}
- Requires Sterilization: ${eq.requiresSterilization ? "Yes" : "No"}
- Notes: ${eq.notes || "None"}

Historical Maintenance Logs (${maints.length} total):
${maints.map((m) => `* [Priority: ${m.priority}, Status: ${m.status}] Issue: ${m.issue}. Resolution notes: ${m.resolutionNotes || "None"}. Created at ${new Date(m.createdAt).toLocaleDateString()}`).join("\n")}

Historical Requests / Booking Count: ${requests.length} total requests.
Recent Logs:
${logs.slice(0, 5).map((l) => `* ${l.action} at ${new Date(l.timestamp).toLocaleDateString()}: ${l.details}`).join("\n")}

Generate three distinct sections in clean Markdown format:
1. **Clinical Asset Summary**: Short health check overview of this asset.
2. **Maintenance Risk Profile**: Potential issues, wear and tear risk, or critical warnings based on maintenance frequency and condition.
3. **Optimized Recommendations**: Actionable suggestions for the hospital superintendent regarding inspection intervals, calibration checks, or retirement planning.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text ? response.text.trim() : "Unable to generate analysis." });
  } catch (err: any) {
    console.error("Gemini Asset Analysis Error:", err);
    res.status(500).json({ error: err.message || "Failed to contact Gemini API." });
  }
});

// Serve Frontend / Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
