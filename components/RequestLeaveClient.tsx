"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarCheck2, CalendarIcon, CircleCheckBig, Hourglass, XCircle } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import LeaveStatusBadge from "@/components/leave-status-badge";
import MetricCard from "@/components/metric-card";
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
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import type {
  HalfDaySession,
  LeaveDuration,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from "@/src/types/leave";

const MIN_REASON_LENGTH = 10;

type LeaveRequestRow = {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration: LeaveDuration;
  half_day_session: HalfDaySession | null;
  reason: string;
  status: LeaveStatus;
  approver_id: string | null;
  approver_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  leave_types:
    | {
        id: string;
        code: string;
        name: string;
      }
    | Array<{
        id: string;
        code: string;
        name: string;
      }>
    | null;
};

type Props = {
  leaveTypes: LeaveType[];
  initialRequests: LeaveRequest[];
  userRole: string;
};

type FormState = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  duration: LeaveDuration;
  halfDaySession: HalfDaySession;
  reason: string;
};

function todayDateInputValue() {
  const now = new Date();
  const shifted = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function toReadableDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function toReadableDateTime(value: string) {
  return new Date(value).toLocaleString();
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

function formatPickerDate(value: string) {
  return format(fromDateInputValue(value), "MMMM d, yyyy");
}

function formatRange(startDate: string, endDate: string) {
  if (startDate === endDate) return toReadableDate(startDate);
  return `${toReadableDate(startDate)} to ${toReadableDate(endDate)}`;
}

function mapRequestRow(row: LeaveRequestRow): LeaveRequest {
  const joinedType = Array.isArray(row.leave_types)
    ? row.leave_types[0] ?? null
    : row.leave_types;

  return {
    id: row.id,
    user_id: row.user_id,
    leave_type_id: row.leave_type_id,
    start_date: row.start_date,
    end_date: row.end_date,
    duration: row.duration,
    half_day_session: row.half_day_session,
    reason: row.reason,
    status: row.status,
    approver_id: row.approver_id,
    approver_note: row.approver_note,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    cancelled_at: row.cancelled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    leave_type: joinedType
      ? {
          id: joinedType.id,
          code: joinedType.code,
          name: joinedType.name,
        }
      : null,
  };
}

function validateForm(form: FormState, isAdmin: boolean) {
  const today = todayDateInputValue();

  if (!form.leaveTypeId) return "Please select a leave type.";
  if (!form.startDate || !form.endDate) return "Please select start and end dates.";
  if (form.startDate > form.endDate) return "Start date cannot be after end date.";
  if (!isAdmin && form.startDate < today) {
    return "Past-date requests are only allowed for admins.";
  }
  if (form.duration === "half_day" && form.startDate !== form.endDate) {
    return "Half-day leave must be a single-day request.";
  }

  if (!form.reason.trim() || form.reason.trim().length < MIN_REASON_LENGTH) {
    return `Reason must be at least ${MIN_REASON_LENGTH} characters.`;
  }

  return null;
}

export default function RequestLeaveClient({
  leaveTypes,
  initialRequests,
  userRole,
}: Props) {
  const supabase = React.useMemo(() => createClient(), []);
  const isAdmin = userRole === "admin";
  const today = React.useMemo(() => todayDateInputValue(), []);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const [form, setForm] = React.useState<FormState>({
    leaveTypeId: leaveTypes[0]?.id ?? "",
    startDate: today,
    endDate: today,
    duration: "full_day",
    halfDaySession: "am",
    reason: "",
  });
  const [requests, setRequests] = React.useState<LeaveRequest[]>(initialRequests);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const selectedType = React.useMemo(
    () => leaveTypes.find((item) => item.id === form.leaveTypeId) ?? null,
    [leaveTypes, form.leaveTypeId]
  );
  const startDateValue = React.useMemo(
    () => fromDateInputValue(form.startDate),
    [form.startDate]
  );
  const endDateValue = React.useMemo(
    () => fromDateInputValue(form.endDate),
    [form.endDate]
  );
  const selectedDateRange = React.useMemo<DateRange>(
    () => ({
      from: startDateValue,
      to: endDateValue,
    }),
    [endDateValue, startDateValue]
  );

  const reasonLength = form.reason.trim().length;
  const selectedDatesLabel =
    form.duration === "half_day" || form.startDate === form.endDate
      ? formatPickerDate(form.startDate)
      : `${formatPickerDate(form.startDate)} - ${formatPickerDate(form.endDate)}`;

  const pendingCount = React.useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );
  const approvedCount = React.useMemo(
    () => requests.filter((request) => request.status === "approved").length,
    [requests]
  );
  const cancelledCount = React.useMemo(
    () => requests.filter((request) => request.status === "cancelled").length,
    [requests]
  );

  const resetForm = () => {
    setForm((current) => ({
      leaveTypeId: current.leaveTypeId || leaveTypes[0]?.id || "",
      startDate: today,
      endDate: today,
      duration: "full_day",
      halfDaySession: "am",
      reason: "",
    }));
    setFormError(null);
  };

  function handleSingleDateSelect(date: Date | undefined) {
    if (!date) return;

    const nextValue = toDateInputValue(date);
    setForm((current) => ({
      ...current,
      startDate: nextValue,
      endDate: nextValue,
    }));
    setIsCalendarOpen(false);
  }

  function handleDateRangeSelect(range: DateRange | undefined) {
    if (!range?.from) return;

    const nextStart = toDateInputValue(range.from);
    const nextEnd = toDateInputValue(range.to ?? range.from);

    setForm((current) => ({
      ...current,
      startDate: nextStart,
      endDate: nextEnd,
    }));

    if (range.to) {
      setIsCalendarOpen(false);
    }
  }

  const fetchColumns = `
    id,
    user_id,
    leave_type_id,
    start_date,
    end_date,
    duration,
    half_day_session,
    reason,
    status,
    approver_id,
    approver_note,
    submitted_at,
    reviewed_at,
    cancelled_at,
    created_at,
    updated_at,
    leave_types (
      id,
      code,
      name
    )
  `;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm(form, isAdmin);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        leave_type_id: form.leaveTypeId,
        start_date: form.startDate,
        end_date: form.endDate,
        duration: form.duration,
        half_day_session: form.duration === "half_day" ? form.halfDaySession : null,
        reason: form.reason.trim(),
      };

      const { data, error } = await supabase
        .from("leave_requests")
        .insert(payload)
        .select(fetchColumns)
        .single();

      if (error) throw error;

      const row = data as unknown as LeaveRequestRow;
      const nextRequest = mapRequestRow(row);

      setRequests((current) => [nextRequest, ...current]);
      resetForm();
      toast.success("Leave request submitted.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit leave request.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(requestId: string) {
    setCancellingId(requestId);

    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .update({
          status: "cancelled" as LeaveStatus,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending")
        .select(fetchColumns)
        .single();

      if (error) throw error;

      const row = data as unknown as LeaveRequestRow;
      const updated = mapRequestRow(row);

      setRequests((current) =>
        current.map((item) => (item.id === requestId ? updated : item))
      );
      toast.success("Leave request cancelled.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel leave request.";
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending"
          value={String(pendingCount)}
          description="Requests awaiting a manager decision."
          icon={Hourglass}
        />
        <MetricCard
          label="Approved"
          value={String(approvedCount)}
          description="Requests that already cleared the approval flow."
          icon={CircleCheckBig}
        />
        <MetricCard
          label="Cancelled"
          value={String(cancelledCount)}
          description="Requests withdrawn before review was finalized."
          icon={XCircle}
        />
        <MetricCard
          label="Available types"
          value={String(leaveTypes.length)}
          description="Active leave categories currently available for submission."
          icon={CalendarCheck2}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">New leave request</CardTitle>
              {selectedType?.code ? <Badge variant="secondary">{selectedType.code}</Badge> : null}
            </div>
            <CardDescription>
              Submit your leave plan with clear dates and context so approvals move faster.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave type</Label>
                <Select
                  value={form.leaveTypeId || undefined}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, leaveTypeId: value }))
                  }
                  disabled={leaveTypes.length === 0 || isSubmitting}
                >
                  <SelectTrigger id="leave-type">
                    <SelectValue placeholder="No active leave types available" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {leaveTypes.length === 0 ? (
                      <SelectItem value="__no_types__" disabled>
                        No active leave types available
                      </SelectItem>
                    ) : (
                      leaveTypes.map((leaveType) => (
                        <SelectItem key={leaveType.id} value={leaveType.id}>
                          {leaveType.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedType?.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {selectedType.description}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <Label htmlFor="leave-dates">Leave dates</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="leave-dates"
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      className="h-auto w-full justify-between rounded-2xl px-4 py-3 text-left"
                    >
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {form.duration === "half_day" ? "Selected day" : "Selected range"}
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedDatesLabel}
                        </p>
                      </div>
                      <CalendarIcon className="size-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent align="start" sideOffset={10} className="w-auto p-0">
                    {form.duration === "half_day" ? (
                      <Calendar
                        mode="single"
                        selected={startDateValue}
                        onSelect={handleSingleDateSelect}
                        defaultMonth={startDateValue}
                        fixedWeeks
                      />
                    ) : (
                      <Calendar
                        mode="range"
                        selected={selectedDateRange}
                        onSelect={handleDateRangeSelect}
                        defaultMonth={startDateValue}
                        fixedWeeks
                      />
                    )}
                  </PopoverContent>
                </Popover>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="app-surface-subtle rounded-2xl border px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Start date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatPickerDate(form.startDate)}
                    </p>
                  </div>
                  <div className="app-surface-subtle rounded-2xl border px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      End date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatPickerDate(form.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={form.duration}
                    onValueChange={(nextValue) => {
                      const value = nextValue as LeaveDuration;
                      setForm((current) => ({
                        ...current,
                        duration: value,
                        endDate: value === "half_day" ? current.startDate : current.endDate,
                      }));
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="full_day">Full day</SelectItem>
                      <SelectItem value="half_day">Half day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.duration === "half_day" ? (
                  <div className="space-y-2">
                    <Label htmlFor="half-day-session">Half-day session</Label>
                    <Select
                      value={form.halfDaySession}
                      onValueChange={(nextValue) =>
                        setForm((current) => ({
                          ...current,
                          halfDaySession: nextValue as HalfDaySession,
                        }))
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="half-day-session">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="am">AM</SelectItem>
                        <SelectItem value="pm">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Please provide details for your leave request."
                  disabled={isSubmitting}
                />
                <p
                  className={cn(
                    "text-xs",
                    reasonLength < MIN_REASON_LENGTH
                      ? "text-rose-600 dark:text-rose-300"
                      : "text-muted-foreground"
                  )}
                >
                  {reasonLength}/{MIN_REASON_LENGTH} minimum characters
                </p>
              </div>

              {formError ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  {formError}
                </p>
              ) : null}

              {!isAdmin ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Past dates are only allowed for admin users.
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting || leaveTypes.length === 0}
                className="w-full"
              >
                {isSubmitting ? "Submitting..." : "Submit leave request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl">Request history</CardTitle>
                <CardDescription>
                  Review previous requests, their status, and any decision notes.
                </CardDescription>
              </div>
              <Badge variant="secondary">{requests.length} total</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {requests.length === 0 ? (
              <div className="app-surface-subtle rounded-[24px] border border-dashed px-6 py-12 text-center">
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  No leave requests yet
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Once you submit a request, it will appear here with its approval state.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request, index) => (
                  <React.Fragment key={request.id}>
                    <div className="app-surface-strong rounded-[24px] border px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground">
                              {request.leave_type?.name ?? "Unknown type"}
                            </p>
                            {request.leave_type?.code ? (
                              <Badge variant="secondary">{request.leave_type.code}</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted {toReadableDateTime(request.submitted_at)}
                          </p>
                        </div>

                        <LeaveStatusBadge status={request.status} />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="app-surface-subtle rounded-2xl border px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Dates
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {formatRange(request.start_date, request.end_date)}
                          </p>
                        </div>
                        <div className="app-surface-subtle rounded-2xl border px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Duration
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {request.duration === "full_day"
                              ? "Full day"
                              : `Half day (${request.half_day_session?.toUpperCase() ?? "-"})`}
                          </p>
                        </div>
                        <div className="app-surface-subtle rounded-2xl border px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Last update
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {request.reviewed_at
                              ? toReadableDateTime(request.reviewed_at)
                              : "Awaiting review"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="app-surface-subtle rounded-2xl border px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Reason
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-foreground">
                            {request.reason}
                          </p>
                        </div>

                        {request.approver_note ? (
                          <div className="app-surface-subtle rounded-2xl border px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Approver note
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-foreground">
                              {request.approver_note}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {request.status === "pending" ? (
                        <div className="mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={cancellingId === request.id}
                            onClick={() => void handleCancel(request.id)}
                          >
                            {cancellingId === request.id
                              ? "Cancelling..."
                              : "Cancel request"}
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {index < requests.length - 1 ? <Separator /> : null}
                  </React.Fragment>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
