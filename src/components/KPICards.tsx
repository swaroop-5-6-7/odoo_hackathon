import React from "react";
import { CheckCircle2, ShieldAlert, AlertTriangle, CalendarRange, Clock, ArrowLeftRight, Sparkles } from "lucide-react";
import { KPIMetrics, EquipmentRequest } from "../types";

interface KPICardsProps {
  kpis: KPIMetrics;
  requests: EquipmentRequest[];
  onCardClick?: (filterType: string) => void;
}

export default function KPICards({ kpis, requests, onCardClick }: KPICardsProps) {
  const now = Date.now();
  
  // Calculate specific KPIs requested by user
  const pendingTransfersCount = requests.filter((r) => r.status === "Pending").length;
  const upcomingReturnsCount = requests.filter(
    (r) => r.status === "Active" && r.mode === "scheduled" && r.scheduledEnd && r.scheduledEnd > now
  ).length;

  const cards = [
    {
      title: "Available",
      value: kpis.available,
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50",
      description: "Assets ready for deployment",
      filterType: "Available",
    },
    {
      title: "Allocated",
      value: kpis.activeAllocations,
      icon: CalendarRange,
      color: "text-blue-700 bg-blue-50/60 border-blue-200 hover:bg-blue-50",
      description: "Assigned to departments",
      filterType: "Allocated",
    },
    {
      title: "Maintenance Today",
      value: kpis.maintenanceToday,
      icon: ShieldAlert,
      color: "text-amber-700 bg-amber-50/60 border-amber-200 hover:bg-amber-50",
      description: "Biomedical workbench repairs",
      filterType: "UnderMaintenance",
    },
    {
      title: "Active Bookings",
      value: kpis.activeBookings,
      icon: Clock,
      color: "text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-50",
      description: "Ongoing scheduled reservations",
      filterType: "Reserved",
    },
    {
      title: "Pending Transfers",
      value: pendingTransfersCount,
      icon: ArrowLeftRight,
      color: "text-purple-700 bg-purple-50/60 border-purple-200 hover:bg-purple-50",
      description: "Awaiting dispatch review",
      filterType: "PendingTransfers",
    },
    {
      title: "Upcoming Returns",
      value: upcomingReturnsCount,
      icon: Sparkles,
      color: "text-teal-700 bg-teal-50/60 border-teal-200 hover:bg-teal-50",
      description: "Due to return back shortly",
      filterType: "UpcomingReturns",
    },
  ];

  return (
    <div id="kpi-cards" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            id={`kpi-card-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
            className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${card.color}`}
            onClick={() => onCardClick?.(card.filterType)}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                {card.title}
              </span>
              <Icon className="w-4 h-4 shrink-0 opacity-95" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black tracking-tight block">
                {card.value}
              </span>
              <span className="text-[10px] mt-0.5 text-slate-500 font-medium leading-tight block line-clamp-1">
                {card.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
