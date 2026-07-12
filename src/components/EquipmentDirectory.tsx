import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  PlusCircle,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  RotateCw,
  Clock,
  ShieldCheck,
  History,
  Wrench,
  Activity,
  Heart,
} from "lucide-react";
import { Equipment, Employee, Role, EquipmentStatus, EquipmentCondition } from "../types";

interface EquipmentDirectoryProps {
  equipment: Equipment[];
  currentEmployee: Employee | null;
  onRegisterEquipment: (data: any) => Promise<void>;
  onSterilize: (id: string) => Promise<void>;
  onRequestAllocation: (eq: Equipment) => void;
  onRaiseMaintenance: (eq: Equipment) => void;
  onRefresh: () => void;
  registerMode?: boolean;
  onCloseRegisterMode?: () => void;
}

export default function EquipmentDirectory({
  equipment,
  currentEmployee,
  onRegisterEquipment,
  onSterilize,
  onRequestAllocation,
  onRaiseMaintenance,
  onRefresh,
  registerMode,
  onCloseRegisterMode,
}: EquipmentDirectoryProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  React.useEffect(() => {
    if (registerMode) {
      setShowRegisterForm(true);
    }
  }, [registerMode]);

  const handleCloseForm = () => {
    setShowRegisterForm(false);
    onCloseRegisterMode?.();
  };
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // New Equipment Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Ventilator");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("ICU-Bed");
  const [isShared, setIsShared] = useState(true);
  const [requiresSterilization, setRequiresSterilization] = useState(true);
  const [condition, setCondition] = useState<EquipmentCondition>("Excellent");
  const [acquisitionCost, setAcquisitionCost] = useState("15000");
  const [notes, setNotes] = useState("");
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState("");

  const categories = ["All", ...Array.from(new Set(equipment.map((e) => e.category)))];
  const statuses = [
    "All",
    "Available",
    "Reserved",
    "Allocated",
    "UnderMaintenance",
    "Sterilizing",
    "Lost",
    "Retired",
    "SterilizationDue",
  ];

  // Filters
  const filteredEquipment = equipment.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.assetTag.toLowerCase().includes(search.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      eq.location.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "All" || eq.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter !== "All") {
      if (statusFilter === "SterilizationDue") {
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        matchesStatus = eq.requiresSterilization && (!eq.lastSterilized || Date.now() - eq.lastSterilized > weekMs);
      } else {
        matchesStatus = eq.status === statusFilter;
      }
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const isSuperintendent = currentEmployee?.role === "Superintendent";

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name || !serialNumber || !location) {
      setFormError("Please fill out all required fields.");
      return;
    }
    setRegistering(true);
    try {
      await onRegisterEquipment({
        name,
        category,
        serialNumber,
        location,
        isShared,
        requiresSterilization,
        condition,
        acquisitionCost: Number(acquisitionCost) || 0,
        notes,
      });
      handleCloseForm();
      // Reset
      setName("");
      setSerialNumber("");
      setLocation("ICU-Bed");
      setNotes("");
    } catch (err: any) {
      setFormError(err.message || "Failed to register equipment.");
    } finally {
      setRegistering(false);
    }
  };

  const handleFetchAiReport = async (eq: Equipment) => {
    setLoadingAi(true);
    setAiReport(null);
    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentEmployee?.email || "",
        },
        body: JSON.stringify({ equipmentId: eq.id }),
      });
      const data = await res.json();
      if (data.error) {
        setAiReport(`Error: ${data.error}`);
      } else {
        setAiReport(data.analysis);
      }
    } catch (err: any) {
      setAiReport("Failed to generate report. Make sure your Gemini API key is configured.");
    } finally {
      setLoadingAi(false);
    }
  };

  const getStatusBadge = (status: EquipmentStatus, eq: Equipment) => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const isSteriDue = eq.requiresSterilization && (!eq.lastSterilized || Date.now() - eq.lastSterilized > weekMs);

    if (isSteriDue && status === "Available") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> Steri Due
        </span>
      );
    }

    switch (status) {
      case "Available":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Available</span>;
      case "Reserved":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Reserved</span>;
      case "Allocated":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Allocated</span>;
      case "UnderMaintenance":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">In Maintenance</span>;
      case "Sterilizing":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Sterilizing</span>;
      case "Lost":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">Lost</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div id="equipment-directory-panel" className="bg-white rounded-xl border border-slate-200 shadow-sm p-4.5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-100" /> Hospital Asset Directory
          </h2>
          <p className="text-sm text-slate-500">Track status, sterilization schedules, and run AI risk assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-equip"
            onClick={onRefresh}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors text-slate-600"
            title="Refresh list"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          {isSuperintendent && (
            <button
              id="btn-toggle-register-form"
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Register Asset
            </button>
          )}
        </div>
      </div>

      {/* Registration Form (Superintendent Only) */}
      {showRegisterForm && (
        <form
          id="register-equipment-form"
          onSubmit={handleRegisterSubmit}
          className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="md:col-span-3 border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">New Clinical Equipment Registration</h3>
            <button
              type="button"
              onClick={handleCloseForm}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Equipment Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Puritan Bennett Ventilator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Ventilator">Ventilator</option>
              <option value="Defibrillator">Defibrillator</option>
              <option value="Patient Monitor">Patient Monitor</option>
              <option value="Oxygen Cylinder">Oxygen Cylinder</option>
              <option value="Infusion Pump">Infusion Pump</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Serial Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. SN-998811"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Location *</label>
            <input
              type="text"
              required
              placeholder="e.g. ICU-Bed4, Ward3-Room12"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Acquisition Cost ($)</label>
            <input
              type="number"
              placeholder="15000"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-6 py-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Shared across departments
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresSterilization}
                onChange={(e) => setRequiresSterilization(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Requires Sterilization
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Operational Notes</label>
            <input
              type="text"
              placeholder="Add specific flow rates, battery backups, calibration information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-200">
            {formError && <span className="text-xs text-rose-600 font-medium mr-auto self-center">{formError}</span>}
            <button
              type="button"
              onClick={() => setShowRegisterForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registering}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm"
            >
              {registering ? "Registering..." : "Submit Registration"}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Asset Tag, Name, Serial Number, or Room Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All Categories" : cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium focus:outline-none"
          >
            {statuses.map((stat) => (
              <option key={stat} value={stat}>
                {stat === "All"
                  ? "All Statuses"
                  : stat === "SterilizationDue"
                    ? "Sterilization Due"
                    : stat === "UnderMaintenance"
                      ? "In Maintenance"
                      : stat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.length === 0 ? (
          <div className="md:col-span-3 text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto opacity-40 mb-2" />
            <p className="font-semibold">No equipment found matching criteria</p>
            <p className="text-xs">Try adjusting your filters or search tags</p>
          </div>
        ) : (
          filteredEquipment.map((eq) => {
            const isSelected = selectedEq?.id === eq.id;
            const weekMs = 7 * 24 * 60 * 60 * 1000;
            const sterilizationOverdue =
              eq.requiresSterilization && (!eq.lastSterilized || Date.now() - eq.lastSterilized > weekMs);

            return (
              <div
                key={eq.id}
                id={`equipment-card-${eq.id}`}
                className={`border rounded-xl p-4 transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/10 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {eq.assetTag}
                    </span>
                    {getStatusBadge(eq.status, eq)}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onClick={() => {
                    setSelectedEq(isSelected ? null : eq);
                    setAiReport(null);
                  }}>
                    {eq.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-500">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                      <span className="font-medium text-slate-700">{eq.category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                      <span className="font-medium text-slate-700">{eq.location}</span>
                    </div>
                  </div>

                  {eq.requiresSterilization && (
                    <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-100 pt-2 text-slate-500">
                      <span>Last Cleaned:</span>
                      <span className={`font-semibold ${sterilizationOverdue ? "text-purple-600 font-extrabold" : "text-slate-700"}`}>
                        {eq.lastSterilized ? new Date(eq.lastSterilized).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                  )}

                  {eq.expiryDate && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Refill/Expiry:</span>
                      <span className="font-semibold text-amber-700">
                        {new Date(eq.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Detail View / Actions */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-xs animate-fade-in">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Clinical details & notes</span>
                      <p className="text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 leading-normal">
                        {eq.notes || "No extra medical specifications listed."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Serial</span>
                        <span className="font-mono text-slate-700 font-medium">{eq.serialNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Condition</span>
                        <span className={`font-semibold ${eq.condition === "Excellent" ? "text-emerald-600" : eq.condition === "Poor" ? "text-rose-600 animate-pulse" : "text-slate-700"}`}>
                          {eq.condition}
                        </span>
                      </div>
                    </div>

                    {/* Gemini report panel */}
                    <div className="border border-indigo-100 rounded-lg bg-indigo-50/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-950 font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-200" /> Gemini Clinical Engineering
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFetchAiReport(eq)}
                          disabled={loadingAi}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all disabled:opacity-55 shadow-sm"
                        >
                          {loadingAi ? "Analyzing Asset..." : "Run AI Risk Assessment"}
                        </button>
                      </div>

                      {aiReport && (
                        <div className="bg-white p-2.5 rounded border border-indigo-100 max-h-[180px] overflow-y-auto text-[11px] leading-relaxed text-slate-700 space-y-2 prose">
                          {aiReport.split("\n\n").map((para, pIdx) => {
                            if (para.startsWith("**")) {
                              return (
                                <p key={pIdx} className="font-bold text-indigo-950 border-b border-indigo-50 pb-1 mt-2">
                                  {para.replace(/\*\*/g, "")}
                                </p>
                              );
                            }
                            return <p key={pIdx}>{para}</p>;
                          })}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {eq.status === "Available" && (
                        <button
                          type="button"
                          onClick={() => onRequestAllocation(eq)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors"
                        >
                          Request Allocation
                        </button>
                      )}

                      {eq.status === "Sterilizing" && (
                        <button
                          type="button"
                          onClick={() => onSterilize(eq.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold transition-colors flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Complete Sterilization
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRaiseMaintenance(eq)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-bold transition-colors flex items-center gap-1"
                      >
                        <Wrench className="w-3.5 h-3.5 text-slate-500" /> Raise Maintenance
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" /> Double conflict-check (V2 compliant)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEq(isSelected ? null : eq);
                      setAiReport(null);
                    }}
                    className="text-blue-500 hover:underline font-bold"
                  >
                    {isSelected ? "Hide Details" : "View & Actions"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
