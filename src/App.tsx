import React, { useState, useEffect } from "react";
import {
  Heart,
  LayoutDashboard,
  HeartHandshake,
  CalendarRange,
  Wrench,
  ClipboardCheck,
  Building2,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  User,
  Activity,
  Phone,
  Clock,
  Sparkles,
  ArrowLeftRight,
  Bell,
  Menu,
  X,
} from "lucide-react";

import {
  Employee,
  Department,
  Equipment,
  EquipmentRequest,
  MaintenanceRequest,
  Audit,
  AuditFinding,
  ActivityLog,
  KPIMetrics,
  Role,
  Resource,
  ResourceBooking,
} from "./types";

import KPICards from "./components/KPICards";
import EquipmentDirectory from "./components/EquipmentDirectory";
import RequestWorkflow from "./components/RequestWorkflow";
import MaintenancePanel from "./components/MaintenancePanel";
import OrgSetup from "./components/OrgSetup";
import AuditsModule from "./components/AuditsModule";
import ResourceBookingScreen from "./components/ResourceBooking";
import ReportsPanel from "./components/ReportsPanel";
import LoginScreen from "./components/LoginScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom navigation & quick action states
  const [registerMode, setRegisterMode] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Auth gate state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Detect reset token in URL on initial load
  const [initialResetToken] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("reset_token") || "";
  });

  // Core DB Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [findings, setFindings] = useState<Record<string, AuditFinding[]>>({});
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [kpis, setKpis] = useState<KPIMetrics>({
    available: 0,
    activeAllocations: 0,
    maintenanceToday: 0,
    overdueReturns: 0,
    sterilizationDue: 0,
    activeBookings: 0,
  });

  // active selected profile (actual logged-in user)
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(() => {
    // Restore session from sessionStorage on page load
    try {
      const saved = sessionStorage.getItem("mf_session");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Modal / overlay states
  const [requestTargetEq, setRequestTargetEq] = useState<Equipment | null>(null);

  // Restore auth from saved session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("mf_session");
    if (saved) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (employee: Employee) => {
    setCurrentEmployee(employee);
    setIsAuthenticated(true);
    sessionStorage.setItem("mf_session", JSON.stringify(employee));
    // Clear reset_token from URL if present
    if (window.location.search.includes("reset_token")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentEmployee(null);
    sessionStorage.removeItem("mf_session");
  };
  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      // Determine active headers for user role testing
      const emailHeader = currentEmployee?.email || "helen.cho@mediflow.org";
      const headers = {
        "x-user-email": emailHeader,
      };

      const [
        resEmp,
        resDept,
        resEq,
        resReq,
        resMaint,
        resAudit,
        resLogs,
        resKpi,
        resResources,
        resBookings,
      ] = await Promise.all([
        fetch("/api/employees", { headers }),
        fetch("/api/departments", { headers }),
        fetch("/api/equipment", { headers }),
        fetch("/api/requests", { headers }),
        fetch("/api/maintenance", { headers }),
        fetch("/api/audits", { headers }),
        fetch("/api/logs", { headers }),
        fetch("/api/dashboard/kpis", { headers }),
        fetch("/api/resources", { headers }),
        fetch("/api/bookings", { headers }),
      ]);

      const [emps, depts, eqs, reqs, maints, auds, lgs, kpiData, rescs, bks] = await Promise.all([
        resEmp.json(),
        resDept.json(),
        resEq.json(),
        resReq.json(),
        resMaint.json(),
        resAudit.json(),
        resLogs.json(),
        resKpi.json(),
        resResources.json(),
        resBookings.json(),
      ]);

      setEmployees(emps);
      setDepartments(depts);
      setEquipment(eqs);
      setRequests(reqs);
      setMaintenance(maints);
      setAudits(auds);
      setLogs(lgs);
      setKpis(kpiData);
      setResources(rescs);
      setBookings(bks);

      // Default currentEmployee if not yet selected
      if (!currentEmployee && emps.length > 0) {
        // Find Helen Cho as default
        const helen = emps.find((e: Employee) => e.email.includes("helen"));
        setCurrentEmployee(helen || emps[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to synchronize with clinical backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Synchronize on mount & poll every 10 seconds for real-time reactivity simulation
  useEffect(() => {
    loadAllData();
  }, [currentEmployee?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [currentEmployee?.id]);

  // Handle generic API post helper
  const apiPost = async (url: string, body: any) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": currentEmployee?.email || "",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  };

  // Actions implementations
  const handleRegisterEquipment = async (data: any) => {
    await apiPost("/api/equipment", data);
    await loadAllData(true);
  };

  const handleSterilize = async (id: string) => {
    await apiPost(`/api/equipment/${id}/sterilize`, {});
    await loadAllData(true);
  };

  const handleRequestSubmit = async (data: any) => {
    await apiPost("/api/requests", data);
    await loadAllData(true);
  };

  const handleTransferSubmit = async (data: any) => {
    await apiPost("/api/requests/transfer", data);
    await loadAllData(true);
  };

  const handleApproveRequest = async (id: string) => {
    await apiPost(`/api/requests/${id}/approve`, {});
    await loadAllData(true);
  };

  const handleRejectRequest = async (id: string, reason: string) => {
    await apiPost(`/api/requests/${id}/reject`, { reason });
    await loadAllData(true);
  };

  const handleCancelRequest = async (id: string) => {
    await apiPost(`/api/requests/${id}/cancel`, {});
    await loadAllData(true);
  };

  const handleDispatch = async (id: string) => {
    await apiPost(`/api/requests/${id}/dispatch`, {});
    await loadAllData(true);
  };

  const handleReturn = async (id: string, conditionCheck: string) => {
    await apiPost(`/api/requests/${id}/return`, { conditionCheck });
    await loadAllData(true);
  };

  const handleRaiseMaintenance = async (equipmentId: string, priority: "Critical" | "High" | "Medium" | "Low", issue: string) => {
    await apiPost("/api/maintenance", { equipmentId, priority, issue });
    await loadAllData(true);
  };

  const handleApproveMaintenance = async (id: string, technicianAssigned: string, estimatedHours: number) => {
    await apiPost(`/api/maintenance/${id}/approve`, { technicianAssigned, estimatedHours });
    await loadAllData(true);
  };

  const handleStartMaintenance = async (id: string) => {
    await apiPost(`/api/maintenance/${id}/start`, {});
    await loadAllData(true);
  };

  const handleResolveMaintenance = async (id: string, resolutionNotes: string) => {
    await apiPost(`/api/maintenance/${id}/resolve`, { resolutionNotes });
    await loadAllData(true);
  };

  const handleRejectMaintenance = async (id: string, notes: string) => {
    await apiPost(`/api/maintenance/${id}/reject`, { notes });
    await loadAllData(true);
  };

  const handleAddDepartment = async (name: string, headId?: string, parentDepartment?: string) => {
    await apiPost("/api/departments", { name, headId, parentDepartment });
    await loadAllData(true);
  };

  const handleAddEmployee = async (name: string, email: string, departmentId: string, role: Role, phone?: string) => {
    await apiPost("/api/employees", { name, email, departmentId, role, phone });
    await loadAllData(true);
  };

  const handlePromoteEmployee = async (id: string, role: Role) => {
    await apiPost(`/api/employees/${id}/role`, { role });
    await loadAllData(true);
  };

  const handleUpdateEmployeeStatus = async (id: string, status: "Active" | "Inactive") => {
    await apiPost(`/api/employees/${id}/status`, { status });
    await loadAllData(true);
  };

  const handleAddAudit = async (data: any) => {
    await apiPost("/api/audits", data);
    await loadAllData(true);
  };

  const handleStartAudit = async (id: string) => {
    await apiPost(`/api/audits/${id}/start`, {});
    await loadAllData(true);
  };

  const handleMarkFinding = async (auditId: string, equipmentId: string, status: "Verified" | "Missing" | "Damaged", notes?: string) => {
    await apiPost(`/api/audits/${auditId}/findings`, { equipmentId, status, notes });
  };

  const handleCloseAudit = async (auditId: string) => {
    await apiPost(`/api/audits/${auditId}/close`, {});
    await loadAllData(true);
  };

  const handleAddBooking = async (data: { resourceId: string; purpose: string; startTime: number; endTime: number }) => {
    await apiPost("/api/bookings", data);
    await loadAllData(true);
  };

  const handleCancelBooking = async (id: string) => {
    await apiPost(`/api/bookings/${id}/cancel`, {});
    await loadAllData(true);
  };

  const handleRescheduleBooking = async (id: string, startTime: number, endTime: number) => {
    await apiPost(`/api/bookings/${id}/reschedule`, { startTime, endTime });
    await loadAllData(true);
  };

  const handleFetchFindings = async (auditId: string) => {
    try {
      const emailHeader = currentEmployee?.email || "helen.cho@mediflow.org";
      const res = await fetch(`/api/audits/${auditId}/findings`, {
        headers: {
          "x-user-email": emailHeader,
        },
      });
      const data = await res.json();
      setFindings((prev) => ({ ...prev, [auditId]: data }));
    } catch (err) {
      console.error("Failed to load audit findings", err);
    }
  };

  const triggerAllocationModal = (eq: Equipment) => {
    setRequestTargetEq(eq);
    setActiveTab("requests");
  };

  const triggerMaintenanceRequest = (eq: Equipment) => {
    setActiveTab("maintenance");
  };

  // Render correct subview component
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Today's Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status snapshot of clinical equipment assets and ward reservation conflicts.</p>
            </div>

            {/* KPI Cards Component */}
            <KPICards
              kpis={kpis}
              requests={requests}
              onCardClick={(filterType) => {
                if (filterType === "PendingTransfers") {
                  setActiveTab("requests");
                } else if (filterType === "UpcomingReturns") {
                  setActiveTab("requests");
                } else {
                  setActiveTab("equipment");
                }
              }}
            />

            {/* Overdue alert banner highlighted separately */}
            {kpis.overdueReturns > 0 && (
              <div className="border-2 border-rose-600 bg-rose-50/70 p-4 rounded-2xl flex items-center justify-between text-rose-900 shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                  <span className="text-sm font-bold">
                    {kpis.overdueReturns} assets overdue for return - flagged for follow-up
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("requests")}
                  className="text-xs font-bold text-rose-800 underline hover:text-rose-950 ml-4 shrink-0"
                >
                  View Allocations
                </button>
              </div>
            )}

            {/* Quick Actions Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <button
                onClick={() => {
                  setRegisterMode(true);
                  setActiveTab("equipment");
                }}
                className="flex items-center justify-center gap-2 py-3 px-5 border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                + register asset
              </button>
              <button
                onClick={() => {
                  setActiveTab("requests");
                }}
                className="flex items-center justify-center gap-2 py-3 px-5 border-2 border-slate-900 bg-white hover:bg-slate-50 text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Book resource
              </button>
              <button
                onClick={() => {
                  setActiveTab("maintenance");
                }}
                className="flex items-center justify-center gap-2 py-3 px-5 border-2 border-slate-900 bg-white hover:bg-slate-50 text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Raise requests
              </button>
            </div>

            {/* Recent Activity section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              <div className="space-y-3">
                {logs.length > 0 ? (
                  logs.slice(0, 6).map((log) => {
                    const emp = employees.find((e) => e.id === log.userId);
                    const userName = emp ? emp.name : "Clinical Staff";
                    const dept = emp ? departments.find((d) => d.id === emp.departmentId)?.name : "";
                    return (
                      <div key={log.id} className="text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                        <div>
                          <strong className="text-slate-800">{log.action}</strong>: {log.details}{" "}
                          {dept && <span className="text-slate-400 font-medium">({dept})</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>Laptop AF-0114 - allocated to Priya shah - IT dept</span>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>Room B2 - booking confirmed - 2:00 to 3:00 PM</span>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>Projector AF-0062 - maintenance resolved</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case "equipment":
        return (
          <EquipmentDirectory
            equipment={equipment}
            currentEmployee={currentEmployee}
            onRegisterEquipment={handleRegisterEquipment}
            onSterilize={handleSterilize}
            onRequestAllocation={triggerAllocationModal}
            onRaiseMaintenance={triggerMaintenanceRequest}
            onRefresh={() => loadAllData(true)}
            registerMode={registerMode}
            onCloseRegisterMode={() => setRegisterMode(false)}
          />
        );

      case "requests":
        return (
          <RequestWorkflow
            requests={requests}
            equipmentList={equipment}
            employees={employees}
            departments={departments}
            currentEmployee={currentEmployee}
            onRequestSubmit={handleRequestSubmit}
            onTransferSubmit={handleTransferSubmit}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onCancelRequest={handleCancelRequest}
            onDispatch={handleDispatch}
            onReturn={handleReturn}
            requestTargetEq={requestTargetEq}
            onCloseRequestModal={() => setRequestTargetEq(null)}
          />
        );

      case "booking":
        return (
          <ResourceBookingScreen
            resources={resources}
            bookings={bookings}
            employees={employees}
            currentEmployee={currentEmployee}
            onAddBooking={handleAddBooking}
            onCancelBooking={handleCancelBooking}
            onRescheduleBooking={handleRescheduleBooking}
            onRefresh={() => loadAllData(true)}
          />
        );

      case "maintenance":
        return (
          <MaintenancePanel
            maintenanceList={maintenance}
            equipmentList={equipment}
            employees={employees}
            currentEmployee={currentEmployee}
            onRaiseMaintenance={handleRaiseMaintenance}
            onApproveMaintenance={handleApproveMaintenance}
            onStartMaintenance={handleStartMaintenance}
            onResolveMaintenance={handleResolveMaintenance}
            onRejectMaintenance={handleRejectMaintenance}
            onRefresh={() => loadAllData(true)}
          />
        );

      case "audits":
        return (
          <AuditsModule
            audits={audits}
            findings={findings}
            equipmentList={equipment}
            employees={employees}
            currentEmployee={currentEmployee}
            onAddAudit={handleAddAudit}
            onStartAudit={handleStartAudit}
            onMarkFinding={handleMarkFinding}
            onCloseAudit={handleCloseAudit}
            onFetchFindings={handleFetchFindings}
            onRefresh={() => loadAllData(true)}
          />
        );

      case "org":
        return (
          <OrgSetup
            departments={departments}
            employees={employees}
            currentEmployee={currentEmployee}
            onAddDepartment={handleAddDepartment}
            onAddEmployee={handleAddEmployee}
            onPromoteEmployee={handlePromoteEmployee}
            onUpdateEmployeeStatus={handleUpdateEmployeeStatus}
            onRefresh={() => loadAllData(true)}
          />
        );

      case "logs":
        return (
          <ReportsPanel
            logs={logs}
            equipment={equipment}
            requests={requests}
            maintenance={maintenance}
            resources={resources}
            bookings={bookings}
            onRefresh={() => loadAllData(true)}
            loading={isLoading}
          />
        );

      case "notifications":
        const overdueList = requests.filter(r => r.status === 'Active' && r.mode === 'scheduled' && r.scheduledEnd && Date.now() > r.scheduledEnd);
        const srvList = equipment.filter(eq => eq.requiresSterilization && (!eq.lastSterilized || Date.now() - eq.lastSterilized > 7 * 24 * 60 * 60 * 1000));
        const pendingRequests = requests.filter(r => r.status === 'Pending');
        const pendingMaint = maintenance.filter(m => m.status === 'Pending');

        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" /> Operational Notifications Feed
              </h2>
              <p className="text-sm text-slate-500">Live clinical warnings, sterilization due events, and pending authorization flags.</p>
            </div>

            <div className="space-y-4">
              {overdueList.map(r => {
                const eq = equipment.find(e => e.id === r.equipmentId);
                return (
                  <div key={r.id} className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-rose-950">Overdue Return Warning</p>
                      <p className="text-rose-700 mt-1">
                        Asset <strong className="text-rose-900">{eq?.name || "Equipment"} ({eq?.assetTag})</strong> was scheduled to be returned on {new Date(r.scheduledEnd!).toLocaleDateString()}. Raised by {r.requestedBy}.
                      </p>
                      <button onClick={() => setActiveTab("requests")} className="mt-2 text-[10px] font-bold text-rose-800 underline">Resolve on Board</button>
                    </div>
                  </div>
                );
              })}

              {srvList.map(eq => (
                <div key={eq.id} className="p-4 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-purple-950">Sterilization Cycle Required</p>
                    <p className="text-purple-700 mt-1">
                      Asset <strong className="text-purple-900">{eq.name} ({eq.assetTag})</strong> requires full biomedical sterilization cycle immediately. Last sterilized: {eq.lastSterilized ? new Date(eq.lastSterilized).toLocaleDateString() : "Never"}.
                    </p>
                    <button onClick={() => { setActiveTab("equipment"); setRegisterMode(false); }} className="mt-2 text-[10px] font-bold text-purple-800 underline">View in Directory</button>
                  </div>
                </div>
              ))}

              {pendingRequests.map(r => {
                const eq = equipment.find(e => e.id === r.equipmentId);
                return (
                  <div key={r.id} className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                    <CalendarRange className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-blue-950">Pending Allocation Approval</p>
                      <p className="text-blue-700 mt-1">
                        New request raised for <strong className="text-blue-900">{eq?.name || "Asset"}</strong>. Purpose: "{r.purpose}". Requested by {r.requestedBy}.
                      </p>
                      <button onClick={() => setActiveTab("requests")} className="mt-2 text-[10px] font-bold text-blue-800 underline">Review Requests</button>
                    </div>
                  </div>
                );
              })}

              {pendingMaint.map(m => {
                const eq = equipment.find(e => e.id === m.equipmentId);
                return (
                  <div key={m.id} className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                    <Wrench className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-amber-950">Pending Maintenance Ticket</p>
                      <p className="text-amber-700 mt-1">
                        Maintenance ticket raised for <strong className="text-amber-900">{eq?.name || "Asset"}</strong>. Priority: <span className="font-bold">{m.priority}</span>. Issue: "{m.issue}".
                      </p>
                      <button onClick={() => setActiveTab("maintenance")} className="mt-2 text-[10px] font-bold text-amber-800 underline">Go to workbench</button>
                    </div>
                  </div>
                );
              })}

              {overdueList.length === 0 && srvList.length === 0 && pendingRequests.length === 0 && pendingMaint.length === 0 && (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="font-semibold text-slate-700">No active operational alerts!</p>
                  <p className="text-xs">All equipment are clean, verified, and allocated normally.</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Pre-calculate count for navigation badges
  const overdueCount = requests.filter(r => r.status === 'Active' && r.mode === 'scheduled' && r.scheduledEnd && Date.now() > r.scheduledEnd).length;
  const srvCount = equipment.filter(eq => eq.requiresSterilization && (!eq.lastSterilized || Date.now() - eq.lastSterilized > 7 * 24 * 60 * 60 * 1000)).length;
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;
  const pendingMaintCount = maintenance.filter(m => m.status === 'Pending').length;
  const totalAlerts = overdueCount + srvCount + pendingRequestsCount + pendingMaintCount;

  const sidebarLinks = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "org", label: "Organization setup", icon: Building2 },
    { id: "equipment", label: "Assets", icon: Heart },
    { id: "requests", label: "Allocation & Transfer", icon: ArrowLeftRight },
    { id: "booking", label: "Resource Booking", icon: CalendarRange },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "audits", label: "Audit", icon: ClipboardCheck },
    { id: "logs", label: "Reports", icon: History },
    { id: "notifications", label: "Notifications", icon: Bell, badgeCount: totalAlerts },
  ];

  return (
    <>
      {/* Auth Gate: show login screen if not authenticated */}
      {!isAuthenticated && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} initialResetToken={initialResetToken} />
      )}

      {/* Main App: only rendered when authenticated */}
      {isAuthenticated && (
        <div id="mediflow-spa-wrapper" className="h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden selection:bg-rose-500 selection:text-white">
          
          {/* PERSISTENT LEFT SIDEBAR FOR DESKTOP */}
          <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 bg-slate-900 text-slate-200 border-r border-slate-800">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              
              {/* Logo / Brand Name */}
              <div className="flex items-center px-6 mb-8 gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-900/40 border border-rose-400/20">
                  <Activity className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h1 className="text-md font-extrabold tracking-tight text-white leading-none">MediFlow</h1>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Resource Hub</p>
                </div>
              </div>

              {/* Navigation Tabs List */}
              <nav className="flex-1 px-3 space-y-1">
                {sidebarLinks.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id !== "requests") setRequestTargetEq(null);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-slate-800 text-white shadow-xs"
                          : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                        <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {tab.badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* User Profile Info & Sign Out Footer */}
            <div className="border-t border-slate-800 p-4 flex flex-col gap-2.5 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold uppercase text-xs shadow-inner">
                  {currentEmployee ? currentEmployee.name.split(" ").map(n => n[0]).join("") : "ST"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{currentEmployee?.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{currentEmployee?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>

          {/* MOBILE NAVIGATION DRAWER & MENU BAR */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden md:pl-64">
            
            {/* Mobile Top Header */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white">
                  <Activity className="w-4.5 h-4.5 text-white animate-pulse" />
                </div>
                <h1 className="text-sm font-extrabold tracking-tight text-white">MediFlow</h1>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </header>

            {/* Mobile Sidebar overlay Menu drawer */}
            {isMobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-40 flex">
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)} />
                <div className="relative flex flex-col flex-1 w-full max-w-xs bg-slate-900 text-slate-200 pt-5 pb-4">
                  <div className="absolute top-0 right-0 pt-2 pr-2">
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center px-6 mb-8 gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                      <Activity className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                      <h1 className="text-md font-extrabold tracking-tight text-white leading-none">MediFlow</h1>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Resource Hub</p>
                    </div>
                  </div>

                  <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {sidebarLinks.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.id !== "requests") setRequestTargetEq(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4.5 h-4.5 shrink-0" />
                            <span>{tab.label}</span>
                          </div>
                          {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {tab.badgeCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>

                  <div className="border-t border-slate-800 p-4 flex flex-col gap-2 bg-slate-950/40">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold uppercase text-xs">
                        {currentEmployee ? currentEmployee.name.split(" ").map(n => n[0]).join("") : "ST"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{currentEmployee?.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{currentEmployee?.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}



            {/* Header Toolbelt for Sync / Reload on Desktop */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400">
                MEDIFLOW SYSTEM CONTROL
              </div>
              <button
                onClick={() => loadAllData()}
                className="flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline py-1 px-2.5 rounded-md hover:bg-blue-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync Server
              </button>
            </div>

            {/* Main Page Content Body */}
            <main className="flex-1 p-4 sm:p-5 overflow-y-auto bg-slate-50 min-h-0">
              {isLoading && equipment.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
                  <div className="text-center">
                    <p className="font-semibold text-slate-800">Synchronizing clinical database...</p>
                    <p className="text-xs">Est. time is less than 2 seconds.</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-5 rounded-xl max-w-xl mx-auto space-y-3 mt-10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <h3 className="font-bold">Clinical Sync Issue</h3>
                  </div>
                  <p className="text-xs leading-relaxed">{error}</p>
                  <button
                    onClick={() => loadAllData()}
                    className="px-4 py-2 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                renderTabContent()
              )}
            </main>

            {/* Compact Footer */}
            <footer className="border-t border-slate-200 bg-white py-2.5 text-center text-[10px] text-slate-400 font-semibold shrink-0">
              <p className="max-w-7xl mx-auto px-4">
                MediFlow Hospital Asset Management Platform © 2026 • Simulated Biomedical Resource Hub
              </p>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
