import React from "react";
import { User, Shield, RefreshCw } from "lucide-react";
import { Employee, Role } from "../types";

interface RoleSwitcherProps {
  currentEmployee: Employee | null;
  allEmployees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  isLoading: boolean;
}

export default function RoleSwitcher({
  currentEmployee,
  allEmployees,
  onSelectEmployee,
  isLoading,
}: RoleSwitcherProps) {
  return (
    <div
      id="role-switcher-container"
      className="bg-slate-900 text-white py-2 px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs border-b border-slate-800"
    >
      <div className="flex items-center gap-2">
        <span className="bg-rose-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white tracking-widest uppercase">
          Dev Mode
        </span>
        <span className="text-slate-400 font-medium">
          Testing Role Switcher — Toggle profiles to explore hospital-specific RBAC workflows:
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {isLoading ? (
          <span className="text-slate-400 flex items-center gap-1 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading profiles...
          </span>
        ) : (
          allEmployees.map((emp) => {
            const isSelected = currentEmployee?.id === emp.id;
            const roleBadgeColor =
              emp.role === "Superintendent"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : emp.role === "DepartmentHead"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : emp.role === "Nurse"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30";

            return (
              <button
                key={emp.id}
                id={`btn-select-emp-${emp.id}`}
                onClick={() => onSelectEmployee(emp)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all border text-left ${
                  isSelected
                    ? "bg-slate-800 text-white border-blue-500 shadow-md ring-1 ring-blue-500/20"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="truncate max-w-[120px]">
                  <p className="font-semibold leading-tight">{emp.name}</p>
                  <span className={`text-[9px] px-1 py-0.1 rounded leading-none block mt-0.5 ${roleBadgeColor}`}>
                    {emp.role}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
