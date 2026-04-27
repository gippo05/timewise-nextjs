"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateAttendanceAction } from "@/app/dashboard/attendance-table/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  canEditAttendance?: boolean;
  pageSize?: number;
};

type EmployeeOption = { id: string; name: string };

type AttendanceEditForm = {
  clock_in: string;
  break: string;
  end_break: string;
  second_break: string;
  end_second_break: string;
  clock_out: string;
};

const attendanceEditFields: Array<{
  key: keyof AttendanceEditForm;
  label: string;
  required?: boolean;
}> = [
  { key: "clock_in", label: "Clock in", required: true },
  { key: "break", label: "Break start" },
  { key: "end_break", label: "Break end" },
  { key: "second_break", label: "Second break start" },
  { key: "end_second_break", label: "Second break end" },
  { key: "clock_out", label: "Clock out" },
];

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

function isEmployeeAttendance(log: AttendanceRow) {
  return getProfile(log)?.role === "employee";
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

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function createEditForm(log: AttendanceRow): AttendanceEditForm {
  return {
    clock_in: toDateTimeLocalValue(log.clock_in),
    break: toDateTimeLocalValue(log.break),
    end_break: toDateTimeLocalValue(log.end_break),
    second_break: toDateTimeLocalValue(log.second_break),
    end_second_break: toDateTimeLocalValue(log.end_second_break),
    clock_out: toDateTimeLocalValue(log.clock_out),
  };
}

function getEditorName(log: AttendanceRow) {
  const editor = log.editor_profile;
  if (!editor) return null;

  const fullName =
    editor.full_name?.trim() ||
    [editor.first_name, editor.last_name].filter(Boolean).join(" ").trim();

  return fullName || "Admin";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  canEditAttendance = false,
  pageSize = 10,
}: AttendanceTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AttendanceEditForm | null>(null);
  const [isSavingEdit, startSavingEdit] = useTransition();

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

  function startEditing(log: AttendanceRow) {
    setEditingLogId(log.id);
    setEditForm(createEditForm(log));
  }

  function cancelEditing() {
    setEditingLogId(null);
    setEditForm(null);
  }

  function updateEditField(field: keyof AttendanceEditForm, value: string) {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function handleEditSubmit(log: AttendanceRow) {
    if (!editForm) return;

    startSavingEdit(async () => {
      const result = await updateAttendanceAction({
        attendanceId: log.id,
        clock_in: editForm.clock_in,
        break: editForm.break,
        end_break: editForm.end_break,
        second_break: editForm.second_break,
        end_second_break: editForm.end_second_break,
        clock_out: editForm.clock_out,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Unable to update attendance.");
        return;
      }

      toast.success("Attendance updated.");
      cancelEditing();
      router.refresh();
    });
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
                      ...(canEditAttendance ? ["Audit", "Actions"] : []),
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
                    const isEditing = editingLogId === log.id;
                    const canEditThisLog = canEditAttendance && isEmployeeAttendance(log);
                    const editorName = getEditorName(log);
                    const editedAt = formatDateTime(log.last_edited_at);
                    const hasAdminEdit = Boolean(log.last_edited_at);
                    const hasLateMinutes =
                      typeof log.late_minutes === "number" && log.late_minutes > 0;
                    const lateLabel = hasAdminEdit
                      ? hasLateMinutes
                        ? `Recorded ${log.late_minutes} min`
                        : "Recorded 0 min"
                      : hasLateMinutes
                        ? `${log.late_minutes} min`
                        : "On time";

                    return (
                      <Fragment key={log.id}>
                        <tr className="app-row-hover">
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
                            <Badge
                              variant={
                                hasLateMinutes || hasAdminEdit ? "warning" : "neutral"
                              }
                            >
                              {lateLabel}
                            </Badge>
                          </td>

                          {canEditAttendance ? (
                            <>
                              <td className="px-4 py-3">
                                {editorName && editedAt ? (
                                  <div className="max-w-[180px] space-y-1 text-xs">
                                    <p className="font-semibold text-foreground">
                                      Last edited by {editorName}
                                    </p>
                                    <p className="text-muted-foreground">{editedAt}</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No edits</span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <Button
                                  type="button"
                                  variant={isEditing ? "secondary" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    canEditThisLog
                                      ? isEditing
                                        ? cancelEditing()
                                        : startEditing(log)
                                      : undefined
                                  }
                                  disabled={isSavingEdit || !canEditThisLog}
                                >
                                  {isEditing ? (
                                    <>
                                      <X className="size-4" />
                                      Close
                                    </>
                                  ) : !canEditThisLog ? (
                                    "Employee only"
                                  ) : (
                                    <>
                                      <Pencil className="size-4" />
                                      Edit
                                    </>
                                  )}
                                </Button>
                              </td>
                            </>
                          ) : null}
                        </tr>

                        {canEditThisLog && isEditing && editForm ? (
                          <tr>
                            <td colSpan={12} className="bg-secondary/35 px-4 py-4">
                              <div className="rounded-2xl border bg-[var(--surface-panel-strong)] p-4 shadow-[var(--shadow-card)]">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      Edit attendance for {name}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      Save corrections with an admin footprint.
                                    </p>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditing}
                                      disabled={isSavingEdit}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleEditSubmit(log)}
                                      disabled={isSavingEdit}
                                    >
                                      <Save className="size-4" />
                                      {isSavingEdit ? "Saving..." : "Save"}
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {attendanceEditFields.map((field) => (
                                    <div key={field.key} className="space-y-2">
                                      <Label htmlFor={`${log.id}-${field.key}`}>
                                        {field.label}
                                      </Label>
                                      <Input
                                        id={`${log.id}-${field.key}`}
                                        type="datetime-local"
                                        value={editForm[field.key]}
                                        required={field.required}
                                        disabled={isSavingEdit}
                                        onChange={(event) =>
                                          updateEditField(field.key, event.target.value)
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
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
