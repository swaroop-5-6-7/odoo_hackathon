import React, { useState, useEffect } from "react";
import {
  CalendarRange,
  Clock,
  AlertTriangle,
  User,
  Activity,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Send,
  ArrowLeftRight,
  Sparkles,
} from "lucide-react";
import { Equipment, EquipmentRequest, Employee, Role, Department } from "../types";

interface RequestWorkflowProps {
  requests: EquipmentRequest[];
  equipmentList: Equipment[];
  employees: Employee[];
  departments: Department[];
  currentEmployee: Employee | null;
  onRequestSubmit: (data: any) => Promise<void>;
  onTransferSubmit: (data: any) => Promise<void>;
  onApproveRequest: (id: string) => Promise<void>;
  onRejectRequest: (id: string, reason: string) => Promise<void>;
  onCancelRequest: (id: string) => Promise<void>;
  onDispatch: (id: string) => Promise<void>;
  onReturn: (id: string, conditionCheck: string) => Promise<void>;
  requestTargetEq: Equipment | null;
  onCloseRequestModal: () => void;
}

export default function RequestWorkflow({
  requests,
  equipmentList,
  employees,
  departments,
  currentEmployee,
  onRequestSubmit,
  onTransferSubmit,
  onApproveRequest,
  onRejectRequest,
  onCancelRequest,
  onDispatch,
  onReturn,
  requestTargetEq,
  onCloseRequestModal,
}: RequestWorkflowProps) {
  // Asset Management Selection State
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");

  // Sync prop selection
  useEffect(() => {
    if (requestTargetEq) {
      setSelectedEquipmentId(requestTargetEq.id);
    } else if (equipmentList.length > 0 && !selectedEquipmentId) {
      setSelectedEquipmentId(equipmentList[0].id);
    }
  }, [requestTargetEq, equipmentList]);

  // Direct Allocation Form State (Used when asset is Available)
  const [directMode, setDirectMode] = useState<"immediate" | "scheduled">("immediate");
  const [directStart, setDirectStart] = useState("");
  const [directEnd, setDirectEnd] = useState("");
  const [directPurpose, setDirectPurpose] = useState("");
  const [directPatientId, setDirectPatientId] = useState("");
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const [directError, setDirectError] = useState("");
  const [directSuccess, setDirectSuccess] = useState(false);

  // Transfer Request Form State (Used when asset is already Allocated)
  const [transferToEmployeeId, setTransferToEmployeeId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Reject Dialog State
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Return Dialog State
  const [returningReqId, setReturningReqId] = useState<string | null>(null);
  const [conditionCheck, setConditionCheck] = useState("Excellent");

  const isSuper = currentEmployee?.role === "Superintendent";

  // Helpers
  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.name} (${emp.role})` : "Unknown Staff";
  };

  const getEmployeeDeptName = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return "Active Ward";
    const dept = departments.find((d) => d.id === emp.departmentId);
    return dept ? dept.name : "Active Ward";
  };

  const getEquipmentName = (id: string) => {
    const eq = equipmentList.find((e) => e.id === id);
    return eq ? `${eq.name} [${eq.assetTag}]` : "Unknown Equipment";
  };

  // Find currently selected equipment & active allocation (if any)
  const selectedEq = equipmentList.find((e) => e.id === selectedEquipmentId);
  const activeReqForSelected = selectedEq
    ? requests.find(
        (r) =>
          r.equipmentId === selectedEq.id &&
          (r.status === "Active" || r.status === "Overdue" || r.status === "Approved")
      )
    : null;

  const currentHolder = activeReqForSelected
    ? employees.find((e) => e.id === activeReqForSelected.requestedBy)
    : null;

  const currentHolderDept = activeReqForSelected
    ? departments.find((d) => d.id === activeReqForSelected.departmentId)
    : null;

  // History timeline for selected asset
  const historyRequests = selectedEquipmentId
    ? requests
        .filter((r) => r.equipmentId === selectedEquipmentId && ["Active", "Returned", "Overdue", "Approved"].includes(r.status))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  // Submit Direct Allocation (Available State)
  const handleDirectSubmitLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError("");
    setDirectSuccess(false);
    if (!selectedEq) return;

    let startMs: number | undefined;
    let endMs: number | undefined;

    if (directMode === "scheduled") {
      if (!directStart || !directEnd) {
        setDirectError("Please specify start and end dates/times.");
        return;
      }
      startMs = new Date(directStart).getTime();
      endMs = new Date(directEnd).getTime();
      if (startMs >= endMs) {
        setDirectError("Start time must precede return time.");
        return;
      }
    }

    if (!directPurpose) {
      setDirectError("Please specify the clinical purpose of allocation.");
      return;
    }

    setDirectSubmitting(true);
    try {
      await onRequestSubmit({
        equipmentId: selectedEq.id,
        mode: directMode,
        scheduledStart: startMs,
        scheduledEnd: endMs,
        purpose: directPurpose,
        patientId: directPatientId,
      });
      setDirectPurpose("");
      setDirectPatientId("");
      setDirectSuccess(true);
      setTimeout(() => setDirectSuccess(false), 4000);
      onCloseRequestModal();
    } catch (err: any) {
      setDirectError(err.message || "Failed to submit request.");
    } finally {
      setDirectSubmitting(false);
    }
  };

  // Submit Transfer Request (Allocated State)
  const handleTransferSubmitLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError("");
    setTransferSuccess(false);
    if (!selectedEq || !transferToEmployeeId) {
      setTransferError("Please choose a target employee to transfer the clinical asset to.");
      return;
    }

    setTransferSubmitting(true);
    try {
      await onTransferSubmit({
        equipmentId: selectedEq.id,
        toEmployeeId: transferToEmployeeId,
        reason: transferReason,
      });
      setTransferReason("");
      setTransferToEmployeeId("");
      setTransferSuccess(true);
      setTimeout(() => setTransferSuccess(false), 4000);
    } catch (err: any) {
      setTransferError(err.message || "Failed to submit transfer request.");
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingReqId) return;
    try {
      await onRejectRequest(rejectingReqId, rejectReason || "Rejected by Supervisor");
      setRejectingReqId(null);
      setRejectReason("");
    } catch (err) {
      alert("Failed to reject request");
    }
  };

  const handleReturnSubmit = async () => {
    if (!returningReqId) return;
    try {
      await onReturn(returningReqId, conditionCheck);
      setReturningReqId(null);
      setConditionCheck("Excellent");
    } catch (err) {
      alert("Failed to complete return workflow");
    }
  };

  const formatHistoryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  };

  // Divide requests
  const pendingRequests = requests.filter((r) => r.status === "Pending");
  const activeApprovedRequests = requests.filter((r) =>
    ["Approved", "Active", "Returned", "Overdue", "Rejected", "Cancelled"].includes(r.status)
  );

  return (
    <div id="request-workflow-panel" className="space-y-6">
      {/* Reject Reason Dialog Modal */}
      {rejectingReqId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-900">Provide Rejection Reason</h3>
            <textarea
              required
              rows={3}
              placeholder="e.g. Equipment required for critical surgery in Operating Room B..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingReqId(null)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Dialog Modal */}
      {returningReqId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Return Equipment Workflow
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Equipment Condition on Return</label>
              <select
                value={conditionCheck}
                onChange={(e) => setConditionCheck(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
              >
                <option value="Excellent">Excellent — Fully Functional & Calibrated</option>
                <option value="Good">Good — Normal Clinical Standards</option>
                <option value="Fair">Fair — Slight performance wear</option>
                <option value="Poor">Poor — Malfunctioning, Needs Biomedical service</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500 italic leading-snug">
              Note: If this clinical asset requires sterilization on return, completing this flow will automatically flag its status as <strong>"Sterilizing"</strong> to make sure it's not double-allocated before cleaning is completed.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setReturningReqId(null)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnSubmit}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
              >
                Complete Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT WORKSPACE: Allocation & Transfer (As modeled in the mockup) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" /> Allocation & Transfer Workspace
              </h3>
              <p className="text-xs text-slate-500">Select an asset to allocate or initiate a cross-department transfer</p>
            </div>

            {/* Asset Select Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Asset</label>
              <select
                id="asset-selector"
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Clinical Equipment --</option>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.assetTag} — {eq.name} ({eq.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedEq ? (
              <div className="space-y-4">
                {/* DOUBLE ALLOCATION ALERT BLOCK IN ACTION */}
                {selectedEq.status === "Allocated" || activeReqForSelected ? (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                    <p className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      Already Allocated to {currentHolder ? currentHolder.name : "Unknown"} ({currentHolderDept ? currentHolderDept.name : getEmployeeDeptName(activeReqForSelected?.requestedBy || "")})
                    </p>
                    <p className="text-[11px] text-rose-600">
                      Direct re-allocation is blocked — submit a transfer request below
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                    <p className="font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Asset is currently Available
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      Direct allocation is open — submit a clinical allocation request below
                    </p>
                  </div>
                )}

                {/* TRANSFER REQUEST FORM (When asset is allocated) */}
                {selectedEq.status === "Allocated" || activeReqForSelected ? (
                  <form onSubmit={handleTransferSubmitLocal} className="space-y-3.5 border-t border-slate-100 pt-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Transfer Request</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
                        <input
                          type="text"
                          disabled
                          value={currentHolder ? `${currentHolder.name} (${currentHolder.role})` : "Current Holder"}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 font-medium">To</label>
                        <select
                          required
                          value={transferToEmployeeId}
                          onChange={(e) => setTransferToEmployeeId(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Select Employee....</option>
                          {employees
                            .filter((emp) => emp.id !== currentHolder?.id && emp.status === "Active")
                            .map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.role})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Reason</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="State clinical requirement or transfer urgency..."
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {transferError && (
                      <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded border border-rose-100 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {transferError}
                      </p>
                    )}

                    {transferSuccess && (
                      <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Transfer request submitted successfully!
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={transferSubmitting}
                      className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> {transferSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </form>
                ) : (
                  /* DIRECT ALLOCATION REQUEST FORM (When asset is available) */
                  <form onSubmit={handleDirectSubmitLocal} className="space-y-3.5 border-t border-slate-100 pt-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Clinical Allocation Request</h4>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500">Allocation Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDirectMode("immediate")}
                          className={`py-1.5 px-3 rounded-lg font-bold text-xs border transition-all ${
                            directMode === "immediate"
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 inline mr-1" /> Immediate Use
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectMode("scheduled")}
                          className={`py-1.5 px-3 rounded-lg font-bold text-xs border transition-all ${
                            directMode === "scheduled"
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <CalendarRange className="w-3.5 h-3.5 inline mr-1" /> Scheduled Booking
                        </button>
                      </div>
                    </div>

                    {directMode === "scheduled" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Start Time</label>
                          <input
                            type="datetime-local"
                            required
                            value={directStart}
                            onChange={(e) => setDirectStart(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Expected Return</label>
                          <input
                            type="datetime-local"
                            required
                            value={directEnd}
                            onChange={(e) => setDirectEnd(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Clinical Purpose *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Critical respiratory support Ward A"
                        value={directPurpose}
                        onChange={(e) => setDirectPurpose(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Patient ID Reference (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. PAT-0231"
                        value={directPatientId}
                        onChange={(e) => setDirectPatientId(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {directError && (
                      <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded border border-rose-100 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {directError}
                      </p>
                    )}

                    {directSuccess && (
                      <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Allocation request submitted!
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={directSubmitting}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-colors"
                    >
                      {directSubmitting ? "Submitting..." : "Submit Allocation Request"}
                    </button>
                  </form>
                )}

                {/* ALLOCATION HISTORY TIMELINE */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Allocation history</h4>
                  {historyRequests.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No allocation log history recorded for this clinical asset.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {historyRequests.map((req) => {
                        const emp = employees.find((e) => e.id === req.requestedBy);
                        const empDept = departments.find((d) => d.id === req.departmentId);
                        
                        return (
                          <div key={req.id} className="text-xs text-slate-600 flex items-start justify-between bg-slate-50/50 p-2 rounded border border-slate-100">
                            <div>
                              <p className="font-medium text-slate-800">
                                {formatHistoryDate(req.actualStart || req.createdAt)} —{" "}
                                {req.status === "Returned" ? (
                                  <span>Returned by <strong className="text-slate-900">{emp ? emp.name : "Staff"}</strong></span>
                                ) : (
                                  <span>Allocated to <strong className="text-slate-900">{emp ? emp.name : "Staff"}</strong></span>
                                )}
                                {empDept && <span className="text-slate-400"> - {empDept.name}</span>}
                              </p>
                              {req.conditionCheck && (
                                <p className="text-[10px] text-slate-400 italic mt-0.5">
                                  condition: <span className="font-semibold text-slate-500">{req.conditionCheck}</span>
                                </p>
                              )}
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              req.status === "Returned" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-800"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
                <p className="text-xs font-semibold">No equipment selected</p>
                <p className="text-[10px]">Please select an asset above to view its status and action forms</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT WORKSPACE: Clinical Operations Boards (Approval & Active/Logs) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Supervisor Approval Board */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="border-b pb-2">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" /> Supervisor Approval Board
              </h3>
              <p className="text-xs text-slate-500">Pending equipment requests awaiting clinical review</p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
                <p className="text-xs font-semibold">Zero pending requests</p>
                <p className="text-[10px]">All equipment allocations are up-to-date</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {pendingRequests.map((req) => (
                  <div key={req.id} id={`pending-req-${req.id}`} className="border rounded-xl p-3.5 bg-amber-50/10 border-amber-100 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          Pending Approval
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(req.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mt-2">{getEquipmentName(req.equipmentId)}</h4>

                      <div className="space-y-1 mt-2 text-xs text-slate-600 leading-relaxed">
                        <p>
                          <strong>Staff member:</strong> {getEmployeeName(req.requestedBy)}
                        </p>
                        <p>
                          <strong>Clinical Purpose:</strong> "{req.purpose}"
                        </p>
                        <p className="capitalize">
                          <strong>Usage Mode:</strong> {req.mode}
                        </p>
                        {req.mode === "scheduled" && (
                          <p className="text-indigo-600 font-medium">
                            <strong>Booked Slot:</strong>{" "}
                            {new Date(req.scheduledStart!).toLocaleString()} → {new Date(req.scheduledEnd!).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSuper ? (
                      <div className="flex gap-2 border-t pt-2.5">
                        <button
                          type="button"
                          onClick={() => onApproveRequest(req.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingReqId(req.id)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="border-t pt-2.5">
                        <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg w-full font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Awaiting Superintendent Action
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Allocations & Log Board */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="border-b pb-2">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-500" /> Active Allocations & Log Board
              </h3>
              <p className="text-xs text-slate-500">Track active allocations, returns, and dispatch schedules</p>
            </div>

            {activeApprovedRequests.length === 0 ? (
              <div className="text-center py-16 text-slate-400 border border-dashed rounded-xl">
                <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-semibold">No active or historical requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-white z-10">
                      <th className="py-2 px-1 bg-white">Asset Details</th>
                      <th className="py-2 px-1 bg-white">Purpose</th>
                      <th className="py-2 px-1 bg-white">Timing</th>
                      <th className="py-2 px-1 bg-white">Status</th>
                      <th className="py-2 px-1 bg-white text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeApprovedRequests.map((req) => {
                      const isOverdue =
                        req.status === "Active" &&
                        req.mode === "scheduled" &&
                        req.scheduledEnd &&
                        Date.now() > req.scheduledEnd;

                      return (
                        <tr key={req.id} id={`allocation-row-${req.id}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-1">
                            <p className="font-bold text-slate-800">{getEquipmentName(req.equipmentId)}</p>
                            <span className="text-[10px] text-slate-400">By: {getEmployeeName(req.requestedBy)}</span>
                          </td>
                          <td className="py-2.5 px-1 max-w-[120px] truncate">
                            <span className="inline-block px-1 bg-slate-100 text-slate-600 rounded text-[9px] font-bold capitalize mb-0.5">
                              {req.mode}
                            </span>
                            <p className="text-slate-600 truncate italic">"{req.purpose}"</p>
                          </td>
                          <td className="py-2.5 px-1 text-[11px] text-slate-600 font-medium">
                            {req.mode === "scheduled" ? (
                              <div>
                                <p className="text-[10px]">S: {new Date(req.scheduledStart!).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                <p className="text-[10px]">E: {new Date(req.scheduledEnd!).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px]">Start: {new Date(req.actualStart || req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                {req.actualEnd ? (
                                  <p className="text-[10px] text-slate-400">End: {new Date(req.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                ) : (
                                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> In-Use
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-1">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 animate-pulse border border-rose-200">
                                <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
                              </span>
                            ) : req.status === "Approved" ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Approved
                              </span>
                            ) : req.status === "Active" ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Active Use
                              </span>
                            ) : req.status === "Returned" ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Returned
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-50 text-slate-500 capitalize">
                                {req.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-1 text-right">
                            <div className="flex justify-end gap-1">
                              {req.status === "Approved" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onDispatch(req.id)}
                                    className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[9px] shadow-sm"
                                  >
                                    Dispatch
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onCancelRequest(req.id)}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border rounded text-[9px]"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                              {(req.status === "Active" || req.status === "Overdue") && (
                                <button
                                  type="button"
                                  onClick={() => setReturningReqId(req.id)}
                                  className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[9px] shadow-sm"
                                >
                                  Return
                                </button>
                              )}

                              {req.status === "Pending" && (
                                <button
                                  type="button"
                                  onClick={() => onCancelRequest(req.id)}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-rose-600 border rounded text-[9px]"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
