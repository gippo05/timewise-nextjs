"use client";

import ClockCard from "@/components/ClockCard";
import WorkedHoursCard from "@/components/ui/WorkedHoursCard";
import AttendanceTable from "@/components/attendanceTable";
import MoreActions from "@/components/MoreActions";
import type { AttendanceRow } from "@/src/types/attendance";

export default function DashboardClient({
  first_name,
  last_name,
  attendance,
}: {
  first_name: string;
  last_name: string;
  attendance: AttendanceRow[];
}) {
  return (
    <>
      <div className="px-5 py-10">
        <h2 className="text-3xl">Welcome back, {first_name} {last_name}!</h2>
      </div>

      <div className="px-5 pb-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)] items-stretch">
          <div className="min-w-0 h-full">
            <ClockCard />
          </div>

          <div className="grid gap-8 min-w-0 items-stretch w-full grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
            <div className="min-w-0 h-full">
              <MoreActions />
            </div>

            <div className="min-w-0 h-full">
              {/* you can drop isLoading now because data exists on first render */}
              <WorkedHoursCard attendance={attendance} isLoading={false} />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="w-full p-5">
          <AttendanceTable attendance={attendance} />
        </div>
      </div>
    </>
  );
}
