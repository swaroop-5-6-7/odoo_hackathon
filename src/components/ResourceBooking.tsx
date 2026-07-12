import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  PlusCircle,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  Edit3,
  Sparkles,
  Search,
  Building2,
  Trash2
} from "lucide-react";
import { Resource, ResourceBooking, Employee } from "../types";

interface ResourceBookingProps {
  resources: Resource[];
  bookings: ResourceBooking[];
  employees: Employee[];
  currentEmployee: Employee | null;
  onAddBooking: (data: { resourceId: string; purpose: string; startTime: number; endTime: number }) => Promise<void>;
  onCancelBooking: (id: string) => Promise<void>;
  onRescheduleBooking: (id: string, startTime: number, endTime: number) => Promise<void>;
  onRefresh: () => void;
}

export default function ResourceBookingScreen({
  resources,
  bookings,
  employees,
  currentEmployee,
  onAddBooking,
  onCancelBooking,
  onRescheduleBooking,
  onRefresh
}: ResourceBookingProps) {
  const [selectedResourceId, setSelectedResourceId] = useState<string>(resources[0]?.id || "");
  const [purpose, setPurpose] = useState("");
  
  // Date and Time selection
  const [dateStr, setDateStr] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("10:00");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Rescheduling modal state
  const [reschedulingBooking, setReschedulingBooking] = useState<ResourceBooking | null>(null);
  const [newDateStr, setNewDateStr] = useState("");
  const [newStartTimeStr, setNewStartTimeStr] = useState("");
  const [newEndTimeStr, setNewEndTimeStr] = useState("");

  const getResourceName = (id: string) => {
    const res = resources.find((r) => r.id === id);
    return res ? res.name : "Unknown Resource";
  };

  const getResourceLocation = (id: string) => {
    const res = resources.find((r) => r.id === id);
    return res ? res.location : "Unknown Location";
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : "Unknown Employee";
  };

  const activeResource = resources.find((r) => r.id === selectedResourceId);
  const resourceBookings = bookings.filter((b) => b.resourceId === selectedResourceId);

  // Sort bookings chronologically
  const sortedBookings = [...resourceBookings].sort((a, b) => a.startTime - b.startTime);

  // Handle Booking creation
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedResourceId) {
      setErrorMessage("Please select a clinical resource.");
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage("Please provide the surgical/operational purpose.");
      return;
    }

    const startTimestamp = new Date(`${dateStr}T${startTimeStr}`).getTime();
    const endTimestamp = new Date(`${dateStr}T${endTimeStr}`).getTime();

    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
      setErrorMessage("Invalid dates selected.");
      return;
    }

    if (startTimestamp >= endTimestamp) {
      setErrorMessage("The booking start time must precede the end time.");
      return;
    }

    setSubmitting(true);
    try {
      await onAddBooking({
        resourceId: selectedResourceId,
        purpose,
        startTime: startTimestamp,
        endTime: endTimestamp
      });
      setPurpose("");
      setSuccessMessage("Room booking successfully confirmed!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to confirm booking.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancellation
  const handleCancelLocal = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await onCancelBooking(id);
      setSuccessMessage("Booking cancelled successfully.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking.");
    }
  };

  // Open reschedule modal
  const openRescheduleModal = (booking: ResourceBooking) => {
    setReschedulingBooking(booking);
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    
    setNewDateStr(start.toISOString().split("T")[0]);
    
    const pad = (n: number) => String(n).padStart(2, "0");
    setNewStartTimeStr(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    setNewEndTimeStr(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
  };

  // Handle Rescheduling
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingBooking) return;

    const startTimestamp = new Date(`${newDateStr}T${newStartTimeStr}`).getTime();
    const endTimestamp = new Date(`${newDateStr}T${newEndTimeStr}`).getTime();

    if (startTimestamp >= endTimestamp) {
      alert("Start time must precede end time.");
      return;
    }

    try {
      await onRescheduleBooking(reschedulingBooking.id, startTimestamp, endTimestamp);
      setReschedulingBooking(null);
      setSuccessMessage("Booking successfully rescheduled.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to reschedule booking.");
    }
  };

  // Determine upcoming reminders (starts within 2 hours)
  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const reminders = bookings.filter((b) => {
    if (b.status !== "Upcoming") return false;
    const timeToStart = b.startTime - now;
    return timeToStart > 0 && timeToStart <= twoHoursMs;
  });

  return (
    <div id="resource-booking-screen" className="space-y-6">
      
      {/* Dynamic Alerts and Reminders section */}
      {reminders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
            <h4 className="font-extrabold text-sm uppercase tracking-wider">Clinical Space Reminders</h4>
          </div>
          <div className="space-y-2">
            {reminders.map((r) => {
              const minutesLeft = Math.round((r.startTime - now) / 60000);
              return (
                <div key={r.id} className="text-xs text-amber-950 bg-white/40 p-2.5 rounded-lg border border-amber-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold">{getResourceName(r.resourceId)}</span> is reserved by <strong className="text-amber-900">{getEmployeeName(r.bookedBy)}</strong> for: <span className="italic">"{r.purpose}"</span>.
                  </div>
                  <span className="bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded font-extrabold text-[10px] uppercase">
                    Starts in {minutesLeft}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Resource Directory & Slot Requestor Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Select Target Shared Resource */}
          <div className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-500" /> Active Shared Resources
              </h3>
              <p className="text-xs text-slate-500 mt-1">Select a clinical theater or training laboratory to view schedule</p>
            </div>

            <div className="space-y-2.5">
              {resources.map((res) => {
                const isSelected = res.id === selectedResourceId;
                return (
                  <button
                    key={res.id}
                    onClick={() => {
                      setSelectedResourceId(res.id);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/20 text-blue-950 ring-2 ring-blue-500/10 font-medium"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">{res.name}</p>
                      <p className="text-slate-500">{res.location}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      res.status === "Available"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {res.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* New Booking Slot Requestor Form */}
          <div className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-indigo-600" /> Book Time-Slot
              </h3>
              <p className="text-xs text-slate-500 mt-1">Submit non-overlapping operational clinical reservations</p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Target Space</label>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-bold text-slate-950">
                  {activeResource?.name || "No Resource Selected"}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Operational Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heart Valve Repair Setup, Sterilization Run"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Scheduled Date *</label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed font-semibold">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed font-semibold">{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedResourceId}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" /> {submitting ? "Booking Space..." : "Confirm Reservation"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Scheduler Calendar View & Current List */}
        <div className="lg:col-span-8 bg-white rounded-xl border p-6 space-y-6 shadow-sm">
          
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" /> Visual Schedule: {activeResource?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Calendar booking blocks and hourly allocations with conflict checker protection</p>
            </div>
            <button onClick={onRefresh} className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold">
              Refresh Schedules
            </button>
          </div>

          {/* Visual Day-Grid Calendar Mock block */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">Timeline Grid View</p>
            <div className="grid grid-cols-12 gap-1 text-[10px] font-mono border border-slate-200 bg-white rounded-lg p-3 text-center">
              {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"].map((hour, idx) => {
                const hourNum = 8 + idx;
                // Check if any reservation overlaps this hour
                const isBooked = sortedBookings.some((b) => {
                  if (b.status === "Cancelled") return false;
                  const startHour = new Date(b.startTime).getHours();
                  const endHour = new Date(b.endTime).getHours();
                  return hourNum >= startHour && hourNum < endHour;
                });

                return (
                  <div key={hour} className="space-y-1.5">
                    <span className="text-slate-400 font-semibold block">{hour}</span>
                    <div className={`h-12 rounded-lg border transition-all flex items-center justify-center font-bold ${
                      isBooked
                        ? "bg-rose-100 border-rose-200 text-rose-800 animate-pulse shadow-sm"
                        : "bg-emerald-50/60 border-emerald-100 text-emerald-800 hover:bg-emerald-100/40"
                    }`}>
                      {isBooked ? "RESERVED" : "OPEN"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-200" /> Booked Space
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-100" /> Available Hour
              </span>
            </div>
          </div>

          {/* Table list of reservations */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scheduled Reservations List</h4>

            {sortedBookings.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-xl text-slate-400">
                <CalendarCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm">No reservations scheduled</p>
                <p className="text-xs">Submit the form on the left to secure a clinical time-slot.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sortedBookings.map((b) => {
                  const start = new Date(b.startTime);
                  const end = new Date(b.endTime);
                  const isCancelled = b.status === "Cancelled";

                  // Check if booking is ongoing right now
                  let dynamicStatus = b.status;
                  if (b.status === "Upcoming" && now >= b.startTime && now <= b.endTime) {
                    dynamicStatus = "Ongoing";
                  } else if (b.status === "Upcoming" && now > b.endTime) {
                    dynamicStatus = "Completed";
                  }

                  return (
                    <div key={b.id} className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${isCancelled ? "opacity-45" : ""}`}>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-950 text-sm">
                            {start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          <span className="text-slate-400 font-bold">|</span>
                          <span className="font-semibold text-indigo-700">
                            {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                            isCancelled
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : dynamicStatus === "Ongoing"
                                ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                : dynamicStatus === "Completed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {dynamicStatus}
                          </span>
                        </div>
                        <p className="text-slate-800 font-bold">{b.purpose}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                          Reserved By: {getEmployeeName(b.bookedBy)}
                        </p>
                      </div>

                      {!isCancelled && dynamicStatus === "Upcoming" && (
                        <div className="flex items-center gap-1.5 self-start sm:self-center">
                          <button
                            onClick={() => openRescheduleModal(b)}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Reschedule
                          </button>
                          <button
                            onClick={() => handleCancelLocal(b.id)}
                            className="px-2.5 py-1.5 border border-rose-100 text-rose-700 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal Overlay */}
      {reschedulingBooking && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Reschedule Time Slot
              </h4>
              <p className="text-xs text-slate-500 mt-1">Adjust start and end schedules for conflict-free planning</p>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Target space</label>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-bold text-slate-950">
                  {getResourceName(reschedulingBooking.resourceId)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  value={newDateStr}
                  onChange={(e) => setNewDateStr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={newStartTimeStr}
                    onChange={(e) => setNewStartTimeStr(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={newEndTimeStr}
                    onChange={(e) => setNewEndTimeStr(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Apply Rescheduling
                </button>
                <button
                  type="button"
                  onClick={() => setReschedulingBooking(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
