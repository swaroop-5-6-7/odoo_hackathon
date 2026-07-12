import React, { useState } from "react";
import {
  Wrench,
  AlertOctagon,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import { MaintenanceRequest, Equipment, Employee } from "../types";

interface MaintenancePanelProps {
  maintenanceList: MaintenanceRequest[];
  equipmentList: Equipment[];
  employees: Employee[];
  currentEmployee: Employee | null;
  onRaiseMaintenance: (equipmentId: string, priority: "Critical" | "High" | "Medium" | "Low", issue: string) => Promise<void>;
  onApproveMaintenance: (id: string, technicianId: string, estimatedHours: number) => Promise<void>;
  onStartMaintenance: (id: string) => Promise<void>;
  onResolveMaintenance: (id: string, notes: string) => Promise<void>;
  onRejectMaintenance: (id: string, notes: string) => Promise<void>;
  onRefresh: () => void;
}

export default function MaintenancePanel({
  maintenanceList,
  equipmentList,
  employees,
  currentEmployee,
  onRaiseMaintenance,
  onApproveMaintenance,
  onStartMaintenance,
  onResolveMaintenance,
  onRejectMaintenance,
  onRefresh,
}: MaintenancePanelProps) {
  // New ticket state
  const [equipmentId, setEquipmentId] = useState("");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [issue, setIssue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Approval Dialog State
  const [approvingTicket, setApprovingTicket] = useState<MaintenanceRequest | null>(null);
  const [assignedTechId, setAssignedTechId] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("4");

  // Resolve Dialog State
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const isSuper = currentEmployee?.role === "Superintendent";
  const isTech = currentEmployee?.role === "Technician";

  const techs = employees.filter((e) => e.role === "Technician" && e.status === "Active");

  const getEquipmentName = (id: string) => {
    const eq = equipmentList.find((e) => e.id === id);
    return eq ? `${eq.name} (${eq.assetTag})` : "Unknown Equipment";
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : "Unknown Staff";
  };

  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!equipmentId || !issue) {
      setSubmitError("Please select equipment and describe the clinical issue.");
      return;
    }

    setSubmitting(true);
    try {
      await onRaiseMaintenance(equipmentId, priority, issue);
      setIssue("");
      setEquipmentId("");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSubmit = async () => {
    if (!approvingTicket || !assignedTechId) {
      alert("Please assign a technician.");
      return;
    }
    try {
      await onApproveMaintenance(approvingTicket.id, assignedTechId, Number(estimatedHours) * 60 * 60 * 1000);
      setApprovingTicket(null);
    } catch (err) {
      alert("Failed to approve ticket");
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolvingTicketId || !resolutionNotes) {
      alert("Please provide resolution notes.");
      return;
    }
    try {
      await onResolveMaintenance(resolvingTicketId, resolutionNotes);
      setResolvingTicketId(null);
      setResolutionNotes("");
    } catch (err) {
      alert("Failed to resolve ticket");
    }
  };

  return (
    <div id="maintenance-panel-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Raise Ticket Form */}
      <div className="lg:col-span-4 bg-white rounded-xl border p-5 space-y-4 shadow-sm self-start">
        <div className="border-b pb-2">
          <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-500" /> Raise Malfunction Ticket
          </h3>
          <p className="text-xs text-slate-500">Report broken hardware or calibration drift immediately</p>
        </div>

        <form onSubmit={handleRaiseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Target Clinical Asset *</label>
            <select
              value={equipmentId}
              required
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
            >
              <option value="">-- Select Damaged Equipment --</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.assetTag} - {eq.name} ({eq.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Malfunction Priority *</label>
            <div className="grid grid-cols-4 gap-1">
              {["Critical", "High", "Medium", "Low"].map((p) => {
                const isSelected = priority === p;
                const pColor =
                  p === "Critical"
                    ? "border-rose-300 text-rose-700 bg-rose-50"
                    : p === "High"
                      ? "border-amber-300 text-amber-700 bg-amber-50"
                      : p === "Medium"
                        ? "border-blue-300 text-blue-700 bg-blue-50"
                        : "border-slate-300 text-slate-700 bg-slate-50";

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p as any)}
                    className={`py-1.5 text-center rounded-lg font-bold border transition-all text-[10px] ${
                      isSelected ? `${pColor} ring-2 ring-offset-1 ring-blue-500/20` : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 mt-1 leading-normal">
              Use <strong>Critical</strong> only if patient care is actively interrupted.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Issue Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe pressure drops, screen calibration errors, cable issues, or missing valves..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {submitError && <span className="text-xs text-rose-600 block">{submitError}</span>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
          >
            <Wrench className="w-3.5 h-3.5" /> {submitting ? "Submitting Ticket..." : "Dispatch Malfunction Ticket"}
          </button>
        </form>
      </div>

      {/* Ticket List and Management */}
      <div className="lg:col-span-8 bg-white rounded-xl border p-5 space-y-4 shadow-sm">
        <div className="border-b pb-2 flex justify-between items-center">
          <div>
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-slate-700" /> Biomedical Engineering Tickets
            </h3>
            <p className="text-xs text-slate-500">Track and manage equipment repair workflows</p>
          </div>
          <button onClick={onRefresh} className="p-1.5 border hover:bg-slate-50 rounded text-xs">
            Refresh
          </button>
        </div>

        {maintenanceList.length === 0 ? (
          <div className="text-center py-20 text-slate-400 border border-dashed rounded-xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mx-auto mb-2" />
            <p className="font-semibold text-sm">All Clinical Assets Functional</p>
            <p className="text-xs">There are no outstanding biomedical engineering tickets</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maintenanceList.map((ticket) => {
              const priorityColor =
                ticket.priority === "Critical"
                  ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                  : ticket.priority === "High"
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : ticket.priority === "Medium"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-slate-100 text-slate-800 border-slate-200";

              const isPending = ticket.status === "Pending";
              const isApproved = ticket.status === "Approved";
              const isInProgress = ticket.status === "InProgress";
              const isResolved = ticket.status === "Resolved";

              return (
                <div
                  key={ticket.id}
                  id={`maint-ticket-${ticket.id}`}
                  className={`border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all ${
                    ticket.priority === "Critical" && !isResolved
                      ? "border-rose-200 bg-rose-50/5"
                      : "border-slate-200 hover:bg-slate-50/20"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColor}`}>
                        {ticket.priority} Priority
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isResolved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isInProgress
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{getEquipmentName(ticket.equipmentId)}</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-2 rounded italic">
                      "{ticket.issue}"
                    </p>

                    <div className="space-y-1 mt-3 text-[11px] text-slate-500 leading-normal">
                      <p>
                        <strong>Raised By:</strong> {getEmployeeName(ticket.raisedBy)}
                      </p>
                      {ticket.technicianAssigned && (
                        <p className="text-blue-600 font-semibold">
                          <strong>Assigned Technician:</strong> {getEmployeeName(ticket.technicianAssigned)}
                        </p>
                      )}
                      {ticket.estimatedCompletion && (
                        <p className="text-indigo-600">
                          <strong>Est. Completion:</strong> {new Date(ticket.estimatedCompletion).toLocaleTimeString()}
                        </p>
                      )}
                      {ticket.resolutionNotes && (
                        <p className="text-slate-700 mt-2 bg-emerald-50/30 p-2 rounded border border-emerald-100">
                          <strong>Biomedical Resolution:</strong> "{ticket.resolutionNotes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions based on role and ticket state */}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                    {isSuper && isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingTicket(ticket);
                            setAssignedTechId(techs[0]?.id || "");
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-sm"
                        >
                          Approve & Assign
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const note = prompt("Please input rejection notes:");
                            if (note) await onRejectMaintenance(ticket.id, note);
                          }}
                          className="px-2.5 py-1 border border-slate-200 text-rose-600 rounded text-xs"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {isTech && isApproved && (
                      <button
                        type="button"
                        onClick={() => onStartMaintenance(ticket.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-sm w-full"
                      >
                        Start Repair Work
                      </button>
                    )}

                    {isTech && isInProgress && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingTicketId(ticket.id);
                          setResolutionNotes("");
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-sm w-full"
                      >
                        Complete & Resolve Ticket
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approval/Assign Modal popup */}
      {approvingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-900">Approve Biomedical Ticket</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Assign Biomedical Technician</label>
                {techs.length === 0 ? (
                  <p className="text-rose-600 font-bold">No active technicians in database.</p>
                ) : (
                  <select
                    value={assignedTechId}
                    onChange={(e) => setAssignedTechId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {techs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Estimated Hours to Complete</label>
                <select
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours (Standard)</option>
                  <option value="8">8 Hours</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setApprovingTicket(null)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={techs.length === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold"
              >
                Assign Technician
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal popup */}
      {resolvingTicketId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-900">Resolve Biomedical Repair</h3>
            <div className="space-y-3 text-xs">
              <label className="block font-semibold text-slate-600 mb-1">Resolution Work Details *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe what was repaired (e.g. Cleared high pressure valves, calibrated oxygen levels back to 99%, replaced internal battery pack)..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 italic leading-snug">
              Completing this action will mark the clinical asset as <strong>"Available"</strong> and reset its condition status to <strong>"Excellent"</strong>.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setResolvingTicketId(null)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveSubmit}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
              >
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
