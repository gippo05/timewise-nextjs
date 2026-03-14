"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import type { HalfDaySession, LeaveDuration, LeaveRequest, LeaveStatus, LeaveType } from "@/src/types/leave";

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

function formatRange(startDate: string, endDate: string) {
  if (startDate === endDate) return toReadableDate(startDate);
  return `${toReadableDate(startDate)} to ${toReadableDate(endDate)}`;
}

function mapRequestRow(row: LeaveRequestRow): LeaveRequest {
  const joinedType = Array.isArray(row.leave_types) ? row.leave_types[0] ?? null : row.leave_types;

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

function statusBadgeClass(status: LeaveStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "cancelled":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "pending":
    default:
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
}

function statusLabel(status: LeaveStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    case "pending":
    default:
      return "Pending";
  }
}

function validateForm(form: FormState, isAdmin: boolean) {
  const today = todayDateInputValue();

  if (!form.leaveTypeId) return "Please select a leave type.";
  if (!form.startDate || !form.endDate) return "Please select start and end dates.";
  if (form.startDate > form.endDate) return "Start date cannot be after end date.";
  if (!isAdmin && form.startDate < today) return "Past-date requests are only allowed for admins.";
  if (form.duration === "half_day" && form.startDate !== form.endDate) {
    return "Half-day leave must be a single-day request.";
  }

  if (!form.reason.trim() || form.reason.trim().length < MIN_REASON_LENGTH) {
    return `Reason must be at least ${MIN_REASON_LENGTH} characters.`;
  }

  return null;
}

export default function RequestLeaveClient({ leaveTypes, initialRequests, userRole }: Props) {
  const supabase = React.useMemo(() => createClient(), []);
  const isAdmin = userRole === "admin";
  const today = React.useMemo(() => todayDateInputValue(), []);

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

  const reasonLength = form.reason.trim().length;

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

      const { data, error } = await supabase.from("leave_requests").insert(payload).select(fetchColumns).single();

      if (error) throw error;

      const row = data as unknown as LeaveRequestRow;
      const nextRequest = mapRequestRow(row);

      setRequests((current) => [nextRequest, ...current]);
      resetForm();
      toast.success("Leave request submitted.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit leave request.";
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

      setRequests((current) => current.map((item) => (item.id === requestId ? updated : item)));
      toast.success("Leave request cancelled.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to cancel leave request.";
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Card className="rounded-2xl border-black/10 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight">New leave request</CardTitle>
          <CardDescription>Submit your leave plan and track approval status here.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leave-type">Leave type</Label>
              <select
                id="leave-type"
                value={form.leaveTypeId}
                onChange={(event) => setForm((current) => ({ ...current, leaveTypeId: event.target.value }))}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                disabled={leaveTypes.length === 0 || isSubmitting}
              >
                {leaveTypes.length === 0 && <option value="">No active leave types available</option>}
                {leaveTypes.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
              </select>
              {selectedType?.description && <p className="text-xs text-black/50">{selectedType.description}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                      endDate: current.duration === "half_day" ? event.target.value : current.endDate,
                    }))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  disabled={isSubmitting || form.duration === "half_day"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <select
                  id="duration"
                  value={form.duration}
                  onChange={(event) => {
                    const value = event.target.value as LeaveDuration;
                    setForm((current) => ({
                      ...current,
                      duration: value,
                      endDate: value === "half_day" ? current.startDate : current.endDate,
                    }));
                  }}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                  disabled={isSubmitting}
                >
                  <option value="full_day">Full day</option>
                  <option value="half_day">Half day</option>
                </select>
              </div>

              {form.duration === "half_day" && (
                <div className="space-y-2">
                  <Label htmlFor="half-day-session">Half-day session</Label>
                  <select
                    id="half-day-session"
                    value={form.halfDaySession}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, halfDaySession: event.target.value as HalfDaySession }))
                    }
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                    disabled={isSubmitting}
                  >
                    <option value="am">AM</option>
                    <option value="pm">PM</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <textarea
                id="reason"
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Please provide details for your leave request."
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                disabled={isSubmitting}
              />
              <p
                className={cn(
                  "text-xs",
                  reasonLength < MIN_REASON_LENGTH ? "text-rose-600" : "text-black/50"
                )}
              >
                {reasonLength}/{MIN_REASON_LENGTH} minimum characters
              </p>
            </div>

            {formError && <p className="text-sm text-rose-600">{formError}</p>}

            {!isAdmin && <p className="text-xs text-black/50">Past dates are only allowed for admin users.</p>}

            <Button
              type="submit"
              disabled={isSubmitting || leaveTypes.length === 0}
              className="h-11 w-full rounded-xl bg-indigo-400 text-white hover:bg-indigo-300"
            >
              {isSubmitting ? "Submitting..." : "Submit leave request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-black/10 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Request history</CardTitle>
          <CardDescription>Review your leave requests and cancel pending entries if needed.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-sm text-black/60">No leave requests submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request, index) => (
                <React.Fragment key={request.id}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-black">
                          {request.leave_type?.name ?? "Unknown type"}
                          {request.leave_type?.code ? (
                            <span className="ml-2 text-xs font-medium text-black/50 uppercase">
                              {request.leave_type.code}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-black/50">Submitted {toReadableDateTime(request.submitted_at)}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
                          statusBadgeClass(request.status)
                        )}
                      >
                        {statusLabel(request.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <p className="text-sm text-black/80">
                        <span className="font-medium text-black">Dates:</span>{" "}
                        {formatRange(request.start_date, request.end_date)}
                      </p>
                      <p className="text-sm text-black/80">
                        <span className="font-medium text-black">Duration:</span>{" "}
                        {request.duration === "full_day"
                          ? "Full day"
                          : `Half day (${request.half_day_session?.toUpperCase() ?? "-"})`}
                      </p>
                    </div>

                    <p className="text-sm text-black/80">
                      <span className="font-medium text-black">Reason:</span> {request.reason}
                    </p>

                    {request.approver_note && (
                      <p className="rounded-md border border-black/10 bg-black/5 px-3 py-2 text-sm text-black/80">
                        <span className="font-medium text-black">Approver note:</span> {request.approver_note}
                      </p>
                    )}

                    {request.status === "pending" && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={cancellingId === request.id}
                        className="h-9 rounded-lg border-black/20"
                        onClick={() => void handleCancel(request.id)}
                      >
                        {cancellingId === request.id ? "Cancelling..." : "Cancel request"}
                      </Button>
                    )}
                  </div>
                  {index < requests.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
