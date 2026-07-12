import React, { useState } from "react";
import {
  ShieldAlert,
  ClipboardCheck,
  PlusCircle,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Search,
} from "lucide-react";
import { Audit, AuditFinding, Equipment, Employee } from "../types";

interface AuditsModuleProps {
  audits: Audit[];
  findings: Record<string, AuditFinding[]>; // keyed by auditId
  equipmentList: Equipment[];
  employees: Employee[];
  currentEmployee: Employee | null;
  onAddAudit: (data: any) => Promise<void>;
  onStartAudit: (id: string) => Promise<void>;
  onMarkFinding: (auditId: string, equipmentId: string, status: "Verified" | "Missing" | "Damaged", notes?: string) => Promise<void>;
  onCloseAudit: (auditId: string) => Promise<void>;
  onRefresh: () => void;
  onFetchFindings: (auditId: string) => Promise<void>;
}

export default function AuditsModule({
  audits,
  findings,
  equipmentList,
  employees,
  currentEmployee,
  onAddAudit,
  onStartAudit,
  onMarkFinding,
  onCloseAudit,
  onRefresh,
  onFetchFindings,
}: AuditsModuleProps) {
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Audit State
  const [name, setName] = useState("");
  const [scope, setScope] = useState("ICU");
  const [auditorIds, setAuditorIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Finding input state
  const [findingNotes, setFindingNotes] = useState<Record<string, string>>({});
  const [closingAuditId, setClosingAuditId] = useState<string | null>(null);

  const isSuper = currentEmployee?.role === "Superintendent";

  const activeAudit = audits.find((a) => a.id === selectedAuditId);
  const activeFindings = selectedAuditId ? findings[selectedAuditId] || [] : [];

  const handleCreateAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!name || !startDate || !endDate) {
      setSubmitError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await onAddAudit({
        name,
        scope,
        auditors: auditorIds,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
      });
      setShowAddForm(false);
      setName("");
      setAuditorIds([]);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create audit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuditSelect = async (auditId: string) => {
    setSelectedAuditId(auditId === selectedAuditId ? null : auditId);
    await onFetchFindings(auditId);
  };

  const handleMarkFindingLocal = async (eqId: string, status: "Verified" | "Missing" | "Damaged") => {
    if (!selectedAuditId) return;
    const notes = findingNotes[eqId] || "";
    try {
      await onMarkFinding(selectedAuditId, eqId, status, notes);
      await onFetchFindings(selectedAuditId);
    } catch (err) {
      alert("Failed to mark audit finding.");
    }
  };

  const handleCloseAuditLocal = async (auditId: string) => {
    setClosingAuditId(auditId);
    try {
      await onCloseAudit(auditId);
      await onFetchFindings(auditId);
    } catch (err) {
      alert("Failed to close audit cycle.");
    } finally {
      setClosingAuditId(null);
    }
  };

  const getEquipmentInScope = (scopeName: string) => {
    if (scopeName === "All") return equipmentList;
    return equipmentList.filter((e) => e.location.startsWith(scopeName) || e.departmentId === scopeName || e.name.toLowerCase().includes(scopeName.toLowerCase()));
  };

  const getAuditorsNames = (ids: string[]) => {
    return ids.map((id) => employees.find((e) => e.id === id)?.name || "Staff").join(", ");
  };

  return (
    <div id="audits-module-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Audit Cycle Configuration and List */}
      <div className="lg:col-span-4 bg-white rounded-xl border p-5 space-y-4 shadow-sm self-start">
        <div className="border-b pb-2 flex justify-between items-center">
          <div>
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Audit & Discrepancies
            </h3>
            <p className="text-xs text-slate-500">Scheduled asset reviews & safety logs</p>
          </div>
          {isSuper && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
              title="Schedule Audit"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleCreateAuditSubmit} className="bg-slate-50 p-4 border rounded-xl space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-600">Audit Cycle Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Annual ICU Equipment Verification"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-600">Clinical Scope / Department</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg bg-white"
              >
                <option value="All">All Departments</option>
                <option value="ICU">ICU</option>
                <option value="Emergency">Emergency</option>
                <option value="Surgical">Surgical</option>
                <option value="General">General Ward</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1 text-slate-600">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-600">Assign Auditor Staff (Multiple selection)</label>
              <select
                multiple
                value={auditorIds}
                onChange={(e) => setAuditorIds(Array.from(e.target.selectedOptions).map((option) => (option as HTMLOptionElement).value))}
                className="w-full px-3 py-1.5 border rounded-lg bg-white min-h-[60px]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {submitError && <span className="text-xs text-rose-600">{submitError}</span>}

            <div className="flex justify-end gap-1.5 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-2 py-1 border rounded"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-2 py-1 bg-blue-600 text-white rounded font-bold">
                {submitting ? "Scheduling..." : "Create Cycle"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {audits.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold">No audit cycles scheduled</p>
            </div>
          ) : (
            audits.map((audit) => {
              const isSelected = selectedAuditId === audit.id;
              const statusColor =
                audit.status === "Closed"
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : audit.status === "InProgress"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200";

              return (
                <div
                  key={audit.id}
                  id={`audit-item-${audit.id}`}
                  onClick={() => handleAuditSelect(audit.id)}
                  className={`border rounded-xl p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/10 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">
                      Scope: {audit.scope}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${statusColor}`}>
                      {audit.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs">{audit.name}</h4>

                  <div className="mt-2 text-[10px] text-slate-500 space-y-1.5 border-t pt-2">
                    <p>
                      <strong>Auditors:</strong> {getAuditorsNames(audit.auditors)}
                    </p>
                    <p>
                      <strong>Timeline:</strong> {new Date(audit.startDate).toLocaleDateString()} → {new Date(audit.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Audit Execution Work-sheet & Reports */}
      <div className="lg:col-span-8 bg-white rounded-xl border p-5 space-y-4 shadow-sm">
        {activeAudit ? (
          <div className="space-y-4">
            <div className="border-b pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-md">{activeAudit.name}</h3>
                <p className="text-xs text-slate-500">
                  Executing verification checklist for scope: <strong className="text-slate-700">{activeAudit.scope}</strong>
                </p>
              </div>

              {activeAudit.status === "Scheduled" && (
                <button
                  type="button"
                  onClick={() => onStartAudit(activeAudit.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm"
                >
                  Initiate Audit Cycle
                </button>
              )}

              {activeAudit.status === "InProgress" && isSuper && (
                <button
                  type="button"
                  onClick={() => handleCloseAuditLocal(activeAudit.id)}
                  disabled={closingAuditId === activeAudit.id}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />{" "}
                  {closingAuditId === activeAudit.id ? "Analyzing & Locking..." : "Close & Compile Report"}
                </button>
              )}
            </div>

            {activeAudit.status === "Closed" ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Audit Cycle Completed</h4>
                    <p className="text-xs text-emerald-800 leading-normal">
                      The cycle has been locked. Findings are compiled and equipment statuses have been updated automatically (Missing items were flagged as "Lost", damaged items were flagged for repair).
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                  <span className="text-slate-900 font-bold text-xs flex items-center gap-1">
                    <FileText className="w-4 h-4 text-indigo-500" /> Compiled Discrepancy & Risk Report
                  </span>

                  <div className="bg-white border rounded-lg p-4 font-sans text-xs text-slate-700 leading-relaxed max-h-[300px] overflow-y-auto space-y-2 whitespace-pre-wrap">
                    {activeAudit.discrepancyReport || "Discrepancy logs could not be compiled."}
                  </div>
                </div>
              </div>
            ) : activeAudit.status === "InProgress" ? (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">Clinical Asset Checklist ({getEquipmentInScope(activeAudit.scope).length} items in scope)</h4>

                <div className="divide-y border border-slate-100 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                  {getEquipmentInScope(activeAudit.scope).map((eq) => {
                    const finding = activeFindings.find((f) => f.equipmentId === eq.id);

                    return (
                      <div key={eq.id} id={`audit-checklist-item-${eq.id}`} className="p-3 bg-slate-50/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs hover:bg-slate-50/50">
                        <div>
                          <p className="font-bold text-slate-800">
                            {eq.name} <span className="text-[10px] font-mono text-slate-400 font-medium ml-1">({eq.assetTag})</span>
                          </p>
                          <p className="text-[11px] text-slate-500">Room Location: {eq.location} | Serial: {eq.serialNumber}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                          <input
                            type="text"
                            placeholder="Add finding notes..."
                            value={findingNotes[eq.id] || ""}
                            onChange={(e) => setFindingNotes({ ...findingNotes, [eq.id]: e.target.value })}
                            className="px-2.5 py-1 border rounded bg-white text-[11px] w-full md:w-[150px] focus:outline-none"
                          />

                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMarkFindingLocal(eq.id, "Verified")}
                              className={`p-1.5 rounded border transition-colors ${
                                finding?.status === "Verified"
                                  ? "bg-emerald-100 border-emerald-300 text-emerald-800 font-bold"
                                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-500"
                              }`}
                              title="Verify Asset Present"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkFindingLocal(eq.id, "Damaged")}
                              className={`p-1.5 rounded border transition-colors ${
                                finding?.status === "Damaged"
                                  ? "bg-amber-100 border-amber-300 text-amber-800 font-bold animate-pulse"
                                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-500"
                              }`}
                              title="Flag as Damaged"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkFindingLocal(eq.id, "Missing")}
                              className={`p-1.5 rounded border transition-colors ${
                                finding?.status === "Missing"
                                  ? "bg-rose-100 border-rose-300 text-rose-800 font-bold"
                                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-500"
                              }`}
                              title="Flag as Missing/Lost"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-slate-500">Initiate the audit cycle to populate the clinical checklist.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-24 text-slate-400 border border-dashed rounded-xl text-xs">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-slate-500">Select an audit cycle from the board to compile discrepancy findings.</p>
            <p className="text-[11px]">Audit cycles compile real-time hardware status checklists and run Gemini risk analysis on close.</p>
          </div>
        )}
      </div>
    </div>
  );
}
