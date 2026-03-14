"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import type { AdminLeaveRequest, LeaveStatus } from "@/src/types/leave";

type Props = {
  initialRequests: AdminLeaveRequest[];
  adminId: string;
  adminName: string;
};

type StatusFilter = "all" | LeaveStatus;

function toReadableDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function toReadableDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatRange(startDate: string, endDate: string) {
  if (startDate === endDate) return toReadableDate(startDate);
  return `${toReadableDate(startDate)} to ${toReadableDate(endDate)}`;
}

function profileName(firstName: string | null, lastName: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "Unknown user";
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

export default function AdminLeaveRequestsClient({ initialRequests, adminId, adminName }: Props) {
  const supabase = React.useMemo(() => createClient(), []);

  const [requests, setRequests] = React.useState<AdminLeaveRequest[]>(initialRequests);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [notesByRequestId, setNotesByRequestId] = React.useState<Record<string, string>>({});
  const [actingRequestId, setActingRequestId] = React.useState<string | null>(null);

  const visibleRequests = React.useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const pendingCount = React.useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );

  async function handleDecision(requestId: string, nextStatus: Extract<LeaveStatus, "approved" | "rejected">) {
    const note = (notesByRequestId[requestId] ?? "").trim();

    if (!note) {
      toast.error("Please provide a reason before approving or rejecting.");
      return;
    }

    setActingRequestId(requestId);

    try {
      const reviewedAt = new Date().toISOString();

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: nextStatus,
          approver_note: note,
          reviewed_at: reviewedAt,
        })
        .eq("id", requestId)
        .eq("status", "pending");

      if (error) throw error;

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: nextStatus,
                approver_note: note,
                approver_id: adminId,
                reviewed_at: reviewedAt,
                approver: {
                  id: adminId,
                  first_name: adminName,
                  last_name: null,
                  role: "admin",
                },
              }
            : request
        )
      );

      setNotesByRequestId((current) => ({ ...current, [requestId]: "" }));
      toast.success(nextStatus === "approved" ? "Request approved." : "Request rejected.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update leave request.";
      toast.error(message);
    } finally {
      setActingRequestId(null);
    }
  }

  return (
    <Card className="rounded-2xl border-black/10 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-semibold tracking-tight">Leave approvals</CardTitle>
        <CardDescription>Review employee requests and decide with an approval note.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-black/70">
            Pending requests: <span className="font-semibold text-black">{pendingCount}</span>
          </p>

          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="text-sm">
              Filter
            </Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <Separator />

        {visibleRequests.length === 0 ? (
          <p className="text-sm text-black/60">No requests found for this filter.</p>
        ) : (
          <div className="space-y-5">
            {visibleRequests.map((request, index) => {
              const requesterName = request.requester
                ? profileName(request.requester.first_name, request.requester.last_name)
                : "Unknown user";

              const approverName = request.approver
                ? profileName(request.approver.first_name, request.approver.last_name)
                : null;

              return (
                <React.Fragment key={request.id}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-black">{requesterName}</p>
                        <p className="text-xs text-black/50">
                          Submitted {toReadableDateTime(request.submitted_at)} |{" "}
                          {request.leave_type?.name ?? "Unknown type"}
                        </p>
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
                      <span className="font-medium text-black">Employee reason:</span> {request.reason}
                    </p>

                    {request.status === "pending" ? (
                      <div className="space-y-2">
                        <Label htmlFor={`decision-note-${request.id}`} className="text-sm">
                          Approval reason
                        </Label>
                        <textarea
                          id={`decision-note-${request.id}`}
                          value={notesByRequestId[request.id] ?? ""}
                          onChange={(event) =>
                            setNotesByRequestId((current) => ({ ...current, [request.id]: event.target.value }))
                          }
                          placeholder="Provide reason for approve or reject."
                          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                          disabled={actingRequestId === request.id}
                        />

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                            disabled={actingRequestId === request.id}
                            onClick={() => void handleDecision(request.id, "approved")}
                          >
                            {actingRequestId === request.id ? "Saving..." : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="rounded-lg"
                            disabled={actingRequestId === request.id}
                            onClick={() => void handleDecision(request.id, "rejected")}
                          >
                            {actingRequestId === request.id ? "Saving..." : "Reject"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-black/10 bg-black/[0.03] px-3 py-2 text-sm text-black/80">
                        <p>
                          <span className="font-medium text-black">Decision reason:</span>{" "}
                          {request.approver_note ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-black/55">
                          Reviewed {toReadableDateTime(request.reviewed_at)}
                          {approverName ? ` by ${approverName}` : ""}
                        </p>
                      </div>
                    )}
                  </div>

                  {index < visibleRequests.length - 1 && <Separator />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
