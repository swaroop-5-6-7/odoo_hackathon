import React, { useState } from "react";
import {
  Activity,
  History,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  Download,
  ChevronDown
} from "lucide-react";
import { ActivityLog, Equipment, EquipmentRequest, MaintenanceRequest, Resource, ResourceBooking } from "../types";

interface ReportsPanelProps {
  logs: ActivityLog[];
  equipment: Equipment[];
  requests: EquipmentRequest[];
  maintenance: MaintenanceRequest[];
  resources?: Resource[];
  bookings?: ResourceBooking[];
  onRefresh: () => void;
  loading: boolean;
}

export default function ReportsPanel({
  logs,
  equipment,
  requests,
  maintenance,
  resources = [],
  bookings = [],
  onRefresh,
  loading,
}: ReportsPanelProps) {
  const [filterType, setFilterType] = useState("All");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(val => {
          const escaped = String(val ?? "").replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAssets = () => {
    const headers = ["Asset ID", "Asset Tag", "Name", "Category", "Location", "Department", "Serial Number", "Status", "Condition", "Requires Sterilization", "Last Sterilized"];
    const rows = equipment.map((e) => [
      e.id,
      e.assetTag,
      e.name,
      e.category,
      e.location,
      e.departmentId || "N/A",
      e.serialNumber,
      e.status,
      e.condition,
      e.requiresSterilization ? "Yes" : "No",
      e.lastSterilized ? new Date(e.lastSterilized).toLocaleString() : "N/A"
    ]);
    downloadCSV("biomedical_assets_report.csv", headers, rows);
  };

  const exportBookings = () => {
    const headers = ["Booking ID", "Resource ID", "Resource Name", "Booked By", "Purpose", "Start Time", "End Time", "Status", "Created At"];
    const rows = bookings.map((b) => {
      const resName = resources.find(r => r.id === b.resourceId)?.name || b.resourceId;
      return [
        b.id,
        b.resourceId,
        resName,
        b.bookedBy,
        b.purpose,
        new Date(b.startTime).toLocaleString(),
        new Date(b.endTime).toLocaleString(),
        b.status,
        new Date(b.createdAt).toLocaleString()
      ];
    });
    downloadCSV("clinical_space_bookings_report.csv", headers, rows);
  };

  const exportLogs = () => {
    const headers = ["Log ID", "Action", "Details", "Timestamp", "User ID"];
    const rows = logs.map((l) => [
      l.id,
      l.action,
      l.details,
      new Date(l.timestamp).toLocaleString(),
      l.userId
    ]);
    downloadCSV("system_activity_logs_report.csv", headers, rows);
  };

  const categories = Array.from(new Set(equipment.map((e) => e.category)));

  // Asset Metrics
  const totalAssetsCount = equipment.length || 1;
  const underMaintenanceCount = equipment.filter((e) => e.status === "UnderMaintenance").length;
  const allocatedCount = equipment.filter((e) => e.status === "Allocated").length;
  const availableCount = equipment.filter((e) => e.status === "Available").length;

  // Sterilization thresholds
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const sterilizationOverdue = equipment.filter(
    (e) => e.requiresSterilization && (!e.lastSterilized || Date.now() - e.lastSterilized > weekMs)
  );

  // Condition Stats
  const conditionCounts = {
    Excellent: equipment.filter((e) => e.condition === "Excellent").length,
    Good: equipment.filter((e) => e.condition === "Good").length,
    Fair: equipment.filter((e) => e.condition === "Fair").length,
    Poor: equipment.filter((e) => e.condition === "Poor").length,
  };

  // Booking Metrics
  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter((b) => b.status === "Upcoming").length;
  const completedBookings = bookings.filter((b) => b.status === "Completed").length;
  const cancelledBookings = bookings.filter((b) => b.status === "Cancelled").length;

  // Calculate most booked spaces
  const bookingCountByResource = bookings.reduce((acc, b) => {
    acc[b.resourceId] = (acc[b.resourceId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredLogs = logs.filter((log) => {
    if (filterType === "All") return true;
    return log.action.toLowerCase().includes(filterType.toLowerCase());
  });

  return (
    <div id="reports-panel" className="space-y-4">
      
      {/* Top Header Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Clinical Operations Command Dashboard</h2>
          <p className="text-xs text-slate-500 font-medium">Biomedical asset performance, clinical theater schedules, and audit records</p>
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            id="btn-export-data"
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs border border-rose-600"
          >
            <Download className="w-3.5 h-3.5" />
            Export Analytics
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {exportDropdownOpen && (
            <>
              {/* Overlay background to dismiss when clicked outside */}
              <div className="fixed inset-0 z-10" onClick={() => setExportDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg py-1.5 w-52 text-xs font-medium z-20 text-slate-700">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider border-b pb-1.5 mb-1.5">Select dataset to export</p>
                <button
                  onClick={() => {
                    exportAssets();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer text-slate-700"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  Asset Inventory CSV
                </button>
                <button
                  onClick={() => {
                    exportBookings();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer text-slate-700"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  Space Bookings CSV
                </button>
                <button
                  onClick={() => {
                    exportLogs();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer text-slate-700"
                >
                  <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  Audit & Activity Logs CSV
                </button>
              </div>
            </>
          )}

          <button
            id="btn-refresh-stats"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Sync Analytics"}
          </button>
        </div>
      </div>

      {/* Row 1: Two column bento grid for Assets and Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Bento Panel: Assets Performance & Utilization */}
        <div className="bg-white rounded-xl border p-5 space-y-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                <Heart className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Biomedical Asset Performance</h3>
                <p className="text-[11px] text-slate-500 font-medium">Real-time load calculations and calibration thresholds</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Asset Status Allocation Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Active Clinical Utilization</span>
                  <span>{Math.round((allocatedCount / totalAssetsCount) * 100)}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${(allocatedCount / totalAssetsCount) * 100}%` }}
                    title={`Allocated: ${allocatedCount}`}
                  />
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${(availableCount / totalAssetsCount) * 100}%` }}
                    title={`Available: ${availableCount}`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${(underMaintenanceCount / totalAssetsCount) * 100}%` }}
                    title={`In Maintenance: ${underMaintenanceCount}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Allocated ({allocatedCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Available ({availableCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Maintenance ({underMaintenanceCount})
                  </span>
                </div>
              </div>

              {/* Condition Statistics */}
              <div className="space-y-2.5 border-t pt-4">
                <span className="text-xs font-bold text-slate-700 block">Structural Integrity & Calibration State</span>
                <div className="grid grid-cols-3 gap-2.5 text-xs text-center">
                  <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Excellent/Good</span>
                    <span className="text-base font-extrabold text-emerald-800">
                      {conditionCounts.Excellent + conditionCounts.Good}
                    </span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Fair</span>
                    <span className="text-base font-extrabold text-amber-800">
                      {conditionCounts.Fair}
                    </span>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Poor</span>
                    <span className={`text-base font-extrabold text-rose-800 ${conditionCounts.Poor > 0 ? "animate-pulse" : ""}`}>
                      {conditionCounts.Poor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown list */}
              <div className="space-y-2 border-t pt-4">
                <span className="text-xs font-bold text-slate-700 block">Class Load Allocation Breakdown</span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const items = equipment.filter((e) => e.category === cat);
                    const activeCount = items.filter((e) => e.status === "Allocated").length;
                    const ratio = Math.round((activeCount / (items.length || 1)) * 100);

                    return (
                      <div key={cat} className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-50 pb-1">
                        <span className="font-medium text-slate-700">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold">
                            {activeCount}/{items.length} active
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-extrabold text-[10px] ${ratio > 60 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                            {ratio}% load
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sterilization Watch Alert Card */}
          {sterilizationOverdue.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl flex items-start gap-3 mt-4">
              <AlertTriangle className="w-5 h-5 text-purple-700 shrink-0 mt-0.5 animate-bounce" />
              <div className="text-xs">
                <h4 className="font-bold text-purple-900">Sterilization Threshold Flag ({sterilizationOverdue.length} units)</h4>
                <p className="text-purple-700 leading-normal mt-0.5">
                  Critical medical assets exceed the standard 7-day sterilization thresholds and must be sanitized immediately before allocation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Bento Panel: Resource & Space Booking Analytics */}
        <div className="bg-white rounded-xl border p-5 space-y-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Clinical Space Reservation Insights</h3>
                <p className="text-[11px] text-slate-500 font-medium">Surgical suite bookings, conflict metrics, and space heatmaps</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Booking KPI summary block */}
              <div className="grid grid-cols-3 gap-2.5 text-xs text-center">
                <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase font-extrabold text-slate-400 block mb-1">Upcoming</span>
                  <span className="text-base font-extrabold text-blue-800">{upcomingBookings}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase font-extrabold text-slate-400 block mb-1">Completed</span>
                  <span className="text-base font-extrabold text-emerald-800">{completedBookings}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase font-extrabold text-slate-400 block mb-1">Cancelled</span>
                  <span className="text-base font-extrabold text-slate-500">{cancelledBookings}</span>
                </div>
              </div>

              {/* Space Booking Heatmap list */}
              <div className="space-y-3 border-t pt-4">
                <span className="text-xs font-bold text-slate-700 block">Surgical Space & Lab Booking Heatmap</span>
                
                {resources.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No rooms or lab resources registered.</p>
                ) : (
                  <div className="space-y-2.5">
                    {resources.map((res) => {
                      const counts = bookingCountByResource[res.id] || 0;
                      const maxBookings = Math.max(...Object.values(bookingCountByResource), 1);
                      const widthPercent = Math.min(Math.max((counts / maxBookings) * 100, 8), 100);

                      return (
                        <div key={res.id} className="text-xs space-y-1">
                          <div className="flex justify-between items-center text-slate-700">
                            <span className="font-bold">{res.name}</span>
                            <span className="font-semibold text-[11px] text-indigo-700">{counts} Reservations</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                counts > 2
                                  ? "bg-rose-500"
                                  : counts > 0
                                    ? "bg-indigo-500"
                                    : "bg-slate-300"
                              }`}
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* General Insights */}
              <div className="space-y-2.5 border-t pt-4">
                <span className="text-xs font-bold text-slate-700 block">Scheduling Integrity Checks</span>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-950 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    <strong>Automatic Overlap Protection</strong> is enabled across all <strong>{resources.length} shared rooms</strong>. The system rejects colliding bookings in real-time, enforcing rigid clinical scheduling compliance.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Administrative Audit Trails & System Logs */}
      <div className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
        <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-700" /> Administrative Audit & Activity Logs
            </h3>
            <p className="text-xs text-slate-500">Transparent timestamp logs of allocations, repairs, reservations, and role promotions</p>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none"
          >
            <option value="All">All Actions</option>
            <option value="Register">Registration</option>
            <option value="Request">Requests & Allocations</option>
            <option value="Book">Resource Bookings</option>
            <option value="Cancel">Cancellations</option>
            <option value="Maintenance">Maintenance & Repairs</option>
          </select>
        </div>

        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto space-y-2 pr-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <Activity className="w-8 h-8 mx-auto opacity-30 mb-2" />
              <p>No logged activities matching the selected filter.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isUrgent = log.action.includes("Malfunction") || log.action.includes("Reject") || log.action.includes("Cancelled") || log.action.includes("Discrepancy");

              return (
                <div key={log.id} id={`log-item-${log.id}`} className="py-2.5 flex items-start gap-3 text-xs leading-normal">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isUrgent ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-50 text-slate-500"}`}>
                    <Activity className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{log.details}</p>
                    <span className="text-[9px] text-slate-400 block mt-1 uppercase font-mono tracking-wider">
                      Author: {log.userId}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[10px] text-slate-400 border-t pt-3 mt-4 flex items-center justify-between">
          <span>Logs are fully synchronized and persisted in the local database.</span>
          <span>System Engine v2.3.0</span>
        </p>
      </div>

    </div>
  );
}
