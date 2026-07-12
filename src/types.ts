export type Role = "Superintendent" | "DepartmentHead" | "Nurse" | "Technician";
export type EmployeeStatus = "Active" | "Inactive";
export type EquipmentStatus =
  | "Available"
  | "Reserved"
  | "Allocated"
  | "UnderMaintenance"
  | "Sterilizing"
  | "Lost"
  | "Retired";
export type EquipmentCondition = "Excellent" | "Good" | "Fair" | "Poor";
export type RequestMode = "scheduled" | "immediate";
export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Active"
  | "Returned"
  | "Rejected"
  | "Cancelled"
  | "Overdue";
export type MaintenancePriority = "Critical" | "High" | "Medium" | "Low";
export type MaintenanceStatus = "Pending" | "Approved" | "Rejected" | "InProgress" | "Resolved";
export type AuditStatus = "Scheduled" | "InProgress" | "Completed" | "Closed";
export type FindingStatus = "Verified" | "Missing" | "Damaged";

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
  departmentId?: string;
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
  scope: string;
  startDate: number;
  endDate: number;
  auditors: string[];
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

export interface KPIMetrics {
  available: number;
  activeAllocations: number;
  maintenanceToday: number;
  overdueReturns: number;
  sterilizationDue: number;
  activeBookings: number;
}
