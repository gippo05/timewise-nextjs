"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttendanceRow } from "@/src/types/attendance";

type AttendanceTableProps = {
  attendance: AttendanceRow[] | null | undefined;
  title?: string;
  description?: string;
  showEmployeeFilter?: boolean;
  pageSize?: number;
};

type EmployeeOption = { id: string; name: string };

function toStartOfDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function toEndOfDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFilterDate(value: string) {
  return format(fromDateInputValue(value), "MMM d, yyyy");
}

function formatWorkedHours(hoursDecimal: number | null): string {
  if (hoursDecimal === null) return "--";

  const totalMinutes = Math.round(hoursDecimal * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return `${hrs}h ${mins}m`;
}

function calculateWorkedHours(log: AttendanceRow): number | null {
  if (!log.clock_in || !log.clock_out) return null;

  const clockIn = new Date(log.clock_in).getTime();
  const clockOut = new Date(log.clock_out).getTime();

  let breakDuration = 0;

  if (log.break && log.end_break) {
    breakDuration += new Date(log.end_break).getTime() - new Date(log.break).getTime();
  }

  if (log.second_break && log.end_second_break) {
    breakDuration +=
      new Date(log.end_second_break).getTime() -
      new Date(log.second_break).getTime();
  }

  const workedMs = clockOut - clockIn - breakDuration;
  if (workedMs < 0) return 0;

  return workedMs / (1000 * 60 * 60);
}

function getProfile(log: AttendanceRow) {
  return log.profiles?.[0] ?? null;
}

function getFullName(log: AttendanceRow) {
  const profile = getProfile(log);
  const first = profile?.first_name ?? "";
  const last = profile?.last_name ?? "";
  return `${first} ${last}`.trim() || "Unnamed";
}

function formatRowDate(value: string | null) {
  if (!value) return "--";
  return format(new Date(value), "MMM d, yyyy");
}

function formatTime(value: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

type SingleDateFilterPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function SingleDateFilterPicker({
  label,
  value,
  onChange,
}: SingleDateFilterPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? fromDateInputValue(value) : undefined;

  return (
    <div className="flex min-w-[180px] flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="justify-between rounded-xl px-3.5 text-left font-medium"
          >
            <span className={value ? "text-foreground" : "text-muted-foreground"}>
              {value ? formatFilterDate(value) : "Select date"}
            </span>
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={10} className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateInputValue(date));
              setOpen(false);
            }}
            defaultMonth={selectedDate ?? new Date()}
            fixedWeeks
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function AttendanceTable({
  attendance,
  title = "Attendance records",
  description = "Review time logs, breaks, late minutes, and total worked hours in one clean table.",
  showEmployeeFilter,
  pageSize = 10,
}: AttendanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const logs = useMemo(() => attendance ?? [], [attendance]);

  const employees: EmployeeOption[] = useMemo(() => {
    const map = new Map<string, string>();

    for (const log of logs) {
      const id = log.user_id;
      if (!id || map.has(id)) continue;
      map.set(id, getFullName(log));
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const filteredAttendance = useMemo(() => {
    return logs.filter((log) => {
      if (selectedUserId && log.user_id !== selectedUserId) return false;

      if ((fromDate || toDate) && !log.created_at) return false;

      const timestamp = log.created_at ? new Date(log.created_at).getTime() : 0;

      if (fromDate && timestamp < toStartOfDayMs(fromDate)) return false;
      if (toDate && timestamp > toEndOfDayMs(toDate)) return false;

      return true;
    });
  }, [logs, fromDate, toDate, selectedUserId]);

  const totalPages = Math.max(1, Math.ceil(filteredAttendance.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedAttendance = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAttendance.slice(start, start + pageSize);
  }, [filteredAttendance, pageSize, safePage]);

  const totalWorkedHoursInRange = useMemo(() => {
    return filteredAttendance.reduce((sum, log) => {
      const hours = calculateWorkedHours(log);
      return sum + (typeof hours === "number" ? hours : 0);
    }, 0);
  }, [filteredAttendance]);

  const completedEntries = useMemo(
    () => filteredAttendance.filter((log) => Boolean(log.clock_out)).length,
    [filteredAttendance]
  );

  const lateEntries = useMemo(
    () =>
      filteredAttendance.filter(
        (log) => typeof log.late_minutes === "number" && log.late_minutes > 0
      ).length,
    [filteredAttendance]
  );

  const shouldShowEmployeeFilter =
    showEmployeeFilter ?? employees.length > 1;

  const activeFilterCount =
    (selectedUserId ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const rangeStart = filteredAttendance.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(filteredAttendance.length, safePage * pageSize);

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setSelectedUserId("");
    setCurrentPage(1);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-5 border-b border-[color:var(--surface-border-strong)] pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{filteredAttendance.length} records</Badge>
            <Badge variant="secondary">
              {formatWorkedHours(totalWorkedHoursInRange)} total
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="app-surface-subtle rounded-2xl border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              People
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {employees.length}
            </p>
          </div>

          <div className="app-surface-subtle rounded-2xl border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Completed
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {completedEntries}
            </p>
          </div>

          <div className="app-surface-subtle rounded-2xl border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Late entries
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {lateEntries}
            </p>
          </div>

          <div className="app-surface-subtle rounded-2xl border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Filter state
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {activeFilterCount}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div className="app-surface-subtle rounded-[24px] border p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
              {shouldShowEmployeeFilter ? (
                <div className="flex min-w-[220px] flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Employee
                  </label>
                  <Select
                    value={selectedUserId || "__all__"}
                    onValueChange={(value) => {
                      setSelectedUserId(value === "__all__" ? "" : value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="min-w-[220px]">
                      <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="__all__">All employees</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <SingleDateFilterPicker
                label="From"
                value={fromDate}
                onChange={(value) => {
                  setFromDate(value);
                  setCurrentPage(1);
                }}
              />

              <SingleDateFilterPicker
                label="To"
                value={toDate}
                onChange={(value) => {
                  setToDate(value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={activeFilterCount > 0 ? "outline" : "secondary"}>
                {activeFilterCount} active filters
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </div>

        {filteredAttendance.length === 0 ? (
          <div className="app-surface-subtle rounded-[24px] border border-dashed px-6 py-12 text-center">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              No attendance records found
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Try adjusting the employee or date filters to widen the results.
            </p>
          </div>
        ) : (
          <div className="app-surface-strong overflow-hidden rounded-[24px] border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead className="app-table-head">
                  <tr className="text-left">
                    {[
                      "Date",
                      "Employee",
                      "Clock in",
                      "Break start",
                      "Break end",
                      "2nd break",
                      "2nd break end",
                      "Clock out",
                      "Worked",
                      "Late",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border text-sm text-foreground">
                  {paginatedAttendance.map((log) => {
                    const worked = calculateWorkedHours(log);
                    const name = getFullName(log);
                    const role = getProfile(log)?.role ?? null;
                    const hasLateMinutes =
                      typeof log.late_minutes === "number" && log.late_minutes > 0;

                    return (
                      <tr
                        key={log.id}
                        className="app-row-hover"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatRowDate(log.created_at)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{name}</p>
                            {role ? (
                              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                {role}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3">{formatTime(log.clock_in)}</td>
                        <td className="px-4 py-3">{formatTime(log.break)}</td>
                        <td className="px-4 py-3">{formatTime(log.end_break)}</td>
                        <td className="px-4 py-3">{formatTime(log.second_break)}</td>
                        <td className="px-4 py-3">{formatTime(log.end_second_break)}</td>
                        <td className="px-4 py-3">{formatTime(log.clock_out)}</td>

                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatWorkedHours(worked)}
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant={hasLateMinutes ? "warning" : "neutral"}>
                            {hasLateMinutes ? `${log.late_minutes} min` : "On time"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredAttendance.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}-{rangeEnd} of {filteredAttendance.length} records
            </p>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Page {safePage} of {totalPages}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
                disabled={safePage === 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
