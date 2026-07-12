import React, { useState } from "react";
import {
  Building2,
  Users,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle,
  ToggleLeft,
  XCircle,
} from "lucide-react";
import { Department, Employee, Role } from "../types";

interface OrgSetupProps {
  departments: Department[];
  employees: Employee[];
  currentEmployee: Employee | null;
  onAddDepartment: (name: string, headId?: string, parentDepartment?: string) => Promise<void>;
  onAddEmployee: (name: string, email: string, departmentId: string, role: Role, phone?: string) => Promise<void>;
  onPromoteEmployee: (id: string, role: Role) => Promise<void>;
  onUpdateEmployeeStatus: (id: string, status: "Active" | "Inactive") => Promise<void>;
  onRefresh: () => void;
}

export default function OrgSetup({
  departments,
  employees,
  currentEmployee,
  onAddDepartment,
  onAddEmployee,
  onPromoteEmployee,
  onUpdateEmployeeStatus,
  onRefresh,
}: OrgSetupProps) {
  const [activeTab, setActiveTab] = useState<"departments" | "employees">("departments");

  // New Dept Form State
  const [deptName, setDeptName] = useState("");
  const [deptHeadId, setDeptHeadId] = useState("");
  const [deptParentId, setDeptParentId] = useState("");
  const [deptError, setDeptError] = useState("");
  const [showDeptForm, setShowDeptForm] = useState(false);

  // New Employee Form State
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDeptId, setEmpDeptId] = useState(departments[0]?.id || "");
  const [empRole, setEmpRole] = useState<Role>("Nurse");
  const [empPhone, setEmpPhone] = useState("");
  const [empError, setEmpError] = useState("");
  const [showEmpForm, setShowEmpForm] = useState(false);

  const isSuper = currentEmployee?.role === "Superintendent";

  const getDepartmentName = (id?: string) => {
    if (!id) return "None";
    const d = departments.find((dept) => dept.id === id);
    return d ? d.name : "Unknown Department";
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return "Unassigned";
    const e = employees.find((emp) => emp.id === id);
    return e ? e.name : "Unassigned";
  };

  const handleAddDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError("");
    if (!deptName) return;

    try {
      await onAddDepartment(deptName, deptHeadId || undefined, deptParentId || undefined);
      setDeptName("");
      setDeptHeadId("");
      setDeptParentId("");
      setShowDeptForm(false);
    } catch (err: any) {
      setDeptError(err.message || "Failed to create department");
    }
  };

  const handleAddEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError("");
    if (!empName || !empEmail || !empDeptId) {
      setEmpError("Please provide name, email, and department.");
      return;
    }

    try {
      await onAddEmployee(empName, empEmail, empDeptId, empRole, empPhone || undefined);
      setEmpName("");
      setEmpEmail("");
      setEmpPhone("");
      setShowEmpForm(false);
    } catch (err: any) {
      setEmpError(err.message || "Failed to create employee profile");
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    const nextStatus = emp.status === "Active" ? "Inactive" : "Active";
    try {
      await onUpdateEmployeeStatus(emp.id, nextStatus);
    } catch (err: any) {
      alert(err.message || "Failed to update employee status");
    }
  };

  const handleRoleChange = async (empId: string, role: Role) => {
    try {
      await onPromoteEmployee(empId, role);
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  return (
    <div id="org-setup-container" className="bg-white rounded-xl border p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> Hospital Staff & Organization
          </h2>
          <p className="text-sm text-slate-500 font-medium">Manage departments, define clinical hierarchy, and promote personnel</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "departments" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Departments ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "employees" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Staff Directory ({employees.length})
          </button>
        </div>
      </div>

      {activeTab === "departments" ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Department Hierarchy & Supervisors</h3>
            {isSuper && (
              <button
                type="button"
                onClick={() => setShowDeptForm(!showDeptForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Add Department
              </button>
            )}
          </div>

          {showDeptForm && (
            <form onSubmit={handleAddDeptSubmit} className="bg-slate-50 p-4 border rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pediatrics Ward"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Department Head (HOD)</label>
                <select
                  value={deptHeadId}
                  onChange={(e) => setDeptHeadId(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Parent Department</label>
                <select
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                >
                  <option value="">None (Top Level)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {deptError && <p className="text-xs text-rose-600 col-span-3">{deptError}</p>}

              <div className="col-span-3 flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowDeptForm(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white font-bold rounded">
                  Create Department
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} id={`dept-card-${dept.id}`} className="border rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-slate-900 text-sm">{dept.name}</h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    {dept.status}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 leading-normal">
                  <p>
                    <strong>Clinical Head (HOD):</strong> {getEmployeeName(dept.headId)}
                  </p>
                  <p>
                    <strong>Parent Department:</strong> {getDepartmentName(dept.parentDepartment)}
                  </p>
                  <p className="text-[10px] text-slate-400">Created on {new Date(dept.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Active Personnel & Permissions Matrix</h3>
            {isSuper && (
              <button
                type="button"
                onClick={() => setShowEmpForm(!showEmpForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Employee
              </button>
            )}
          </div>

          {showEmpForm && (
            <form onSubmit={handleAddEmpSubmit} className="bg-slate-50 p-4 border rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Pendelton"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. arthur@mediflow.org"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Clinical Department *</label>
                <select
                  value={empDeptId}
                  onChange={(e) => setEmpDeptId(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Role Assigned *</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value as Role)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                >
                  <option value="Nurse">Nurse (Requests only)</option>
                  <option value="Technician">Biomedical Technician (Resolves Maintenance)</option>
                  <option value="DepartmentHead">Department Head (Approves requests)</option>
                  <option value="Superintendent">Superintendent (Full Administrative Admin)</option>
                </select>
              </div>

              {empError && <p className="text-xs text-rose-600 col-span-4">{empError}</p>}

              <div className="col-span-4 flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowEmpForm(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white font-bold rounded">
                  Create Employee
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Role / Permissions</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  {isSuper && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const isSelf = currentEmployee?.id === emp.id;
                  const roleBadgeColor =
                    emp.role === "Superintendent"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : emp.role === "DepartmentHead"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : emp.role === "Nurse"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <tr key={emp.id} id={`emp-row-${emp.id}`} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            {emp.name} {isSelf && <span className="text-[9px] px-1 bg-slate-200 text-slate-700 font-bold rounded">You</span>}
                          </p>
                          <span className="text-[11px] text-slate-400 block">{emp.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isSuper && !isSelf ? (
                          <select
                            value={emp.role}
                            onChange={(e) => handleRoleChange(emp.id, e.target.value as Role)}
                            className="px-2 py-1 border border-slate-200 rounded font-bold text-xs focus:outline-none"
                          >
                            <option value="Nurse">Nurse</option>
                            <option value="Technician">Technician</option>
                            <option value="DepartmentHead">Department Head</option>
                            <option value="Superintendent">Superintendent</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${roleBadgeColor}`}>
                            {emp.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {getDepartmentName(emp.departmentId)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      {isSuper && (
                        <td className="py-3.5 px-4 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(emp)}
                              className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                                emp.status === "Active"
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {emp.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
