"use client";

import {
  AlarmClockCheck,
  ChartColumnIncreasing,
  Clock3,
  NotebookPen,
} from "lucide-react";

import AttendanceTable from "@/components/attendanceTable";
import ClockCard from "@/components/ClockCard";
import MetricCard from "@/components/metric-card";
import MoreActions from "@/components/MoreActions";
import PageHeader from "@/components/page-header";
import WorkedHoursCard from "@/components/ui/WorkedHoursCard";
import type { AttendanceRow } from "@/src/types/attendance";

export default function DashboardClient({
  first_name,
  last_name,
  userRole,
  attendance,
  userId,
}: {
  first_name: string;
  last_name: string;
  userRole: string;
  attendance: AttendanceRow[];
  userId?: string | null;
}) {
  const displayName =
    [first_name, last_name].filter(Boolean).join(" ").trim() || "team member";

  const totalLogs = attendance.length;
  const completedShifts = attendance.filter((entry) => Boolean(entry.clock_out)).length;
  const lateEntries = attendance.filter(
    (entry) => typeof entry.late_minutes === "number" && entry.late_minutes > 0
  ).length;
  const currentMonth = new Date().getMonth();
  const thisMonthLogs = attendance.filter(
    (entry) => new Date(entry.created_at).getMonth() === currentMonth
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily operations"
        title={`Welcome back, ${displayName}.`}
        description="Stay on top of today's attendance, reach the right workflows quickly, and keep the most recent records close at hand."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="This month"
          value={String(thisMonthLogs)}
          description="Attendance records captured during the current month."
          icon={ChartColumnIncreasing}
        />
        <MetricCard
          label="Completed shifts"
          value={String(completedShifts)}
          description="Clock-ins with confirmed clock-out times in your current history."
          icon={AlarmClockCheck}
        />
        <MetricCard
          label="Late arrivals"
          value={String(lateEntries)}
          description="Entries with recorded late minutes that may need attention."
          icon={Clock3}
        />
        <MetricCard
          label="History loaded"
          value={String(totalLogs)}
          description={
            userRole === "admin"
              ? "Recent workforce attendance loaded for fast review."
              : "Recent attendance loaded for your personal overview."
          }
          icon={NotebookPen}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ClockCard userId={userId} />
        </div>

        <div className="grid min-w-0 gap-6 md:grid-cols-2">
          <WorkedHoursCard attendance={attendance} isLoading={false} />
          <MoreActions userRole={userRole} />
        </div>
      </div>

      <AttendanceTable
        attendance={attendance}
        title="Recent attendance"
        description="A clean view of your latest logs, including breaks, total hours, and any recorded late minutes."
        showEmployeeFilter={false}
        pageSize={6}
      />
    </div>
  );
}
