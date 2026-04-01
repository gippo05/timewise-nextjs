"use client";

import * as React from "react";
import {
  CircleCheckBig,
  ClipboardList,
  Filter,
  Hourglass,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import LeaveStatusBadge from "@/components/leave-status-badge";
import MetricCard from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

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

export default function AdminLeaveRequestsClient({
  initialRequests,
  adminId,
  adminName,
}: Props) {
  const supabase = React.useMemo(() => createClient(), []);

  const [requests, setRequests] = React.useState<AdminLeaveRequest[]>(initialRequests);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [notesByRequestId, setNotesByRequestId] = React.useState<Record<string, string>>(
    {}
  );
  const [actingRequestId, setActingRequestId] = React.useState<string | null>(null);

  const visibleRequests = React.useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const pendingCount = React.useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );
  const approvedCount = React.useMemo(
    () => requests.filter((request) => request.status === "approved").length,
    [requests]
  );
  const rejectedCount = React.useMemo(
    () => requests.filter((request) => request.status === "rejected").length,
    [requests]
  );
  const cancelledCount = React.useMemo(
    () => requests.filter((request) => request.status === "cancelled").length,
    [requests]
  );

  async function handleDecision(
    requestId: string,
    nextStatus: Extract<LeaveStatus, "approved" | "rejected">
  ) {
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
      const message =
        error instanceof Error ? error.message : "Failed to update leave request.";
      toast.error(message);
    } finally {
      setActingRequestId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending"
          value={String(pendingCount)}
          description="Requests waiting for your team review."
          icon={Hourglass}
        />
        <MetricCard
          label="Approved"
          value={String(approvedCount)}
          description="Requests that already cleared the admin workflow."
          icon={CircleCheckBig}
        />
        <MetricCard
          label="Rejected"
          value={String(rejectedCount)}
          description="Requests declined with a recorded decision note."
          icon={XCircle}
        />
        <MetricCard
          label="Cancelled"
          value={String(cancelledCount)}
          description="Requests withdrawn before an approval decision."
          icon={ClipboardList}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Approval queue</CardTitle>
              <CardDescription>
                Review employee requests, capture clear reasons, and keep the leave calendar up to date.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{visibleRequests.length} visible</Badge>
              <Badge variant="secondary">{pendingCount} pending</Badge>
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-secondary/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Filter
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger id="status-filter" className="min-w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">All requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="size-4" />
                {statusFilter === "all" ? "Showing every request" : `Filtered to ${statusFilter}`}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {visibleRequests.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border bg-white px-6 py-12 text-center">
              <p className="text-lg font-semibold tracking-tight text-foreground">
                No requests for this filter
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Try a broader filter to review requests from the full approval queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRequests.map((request, index) => {
                const requesterName = request.requester
                  ? profileName(request.requester.first_name, request.requester.last_name)
                  : "Unknown user";

                const approverName = request.approver
                  ? profileName(request.approver.first_name, request.approver.last_name)
                  : null;

                return (
                  <React.Fragment key={request.id}>
                    <div className="rounded-[24px] border border-border bg-white px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground">
                              {requesterName}
                            </p>
                            {request.leave_type?.code ? (
                              <Badge variant="secondary">{request.leave_type.code}</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted {toReadableDateTime(request.submitted_at)} ·{" "}
                            {request.leave_type?.name ?? "Unknown type"}
                          </p>
                        </div>

                        <LeaveStatusBadge status={request.status} />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Dates
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {formatRange(request.start_date, request.end_date)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Duration
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {request.duration === "full_day"
                              ? "Full day"
                              : `Half day (${request.half_day_session?.toUpperCase() ?? "-"})`}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Reviewed
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {request.reviewed_at
                              ? toReadableDateTime(request.reviewed_at)
                              : "Awaiting review"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Employee reason
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-foreground">
                            {request.reason}
                          </p>
                        </div>

                        {request.status === "pending" ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor={`decision-note-${request.id}`}>
                                Approval reason
                              </Label>
                              <Textarea
                                id={`decision-note-${request.id}`}
                                value={notesByRequestId[request.id] ?? ""}
                                onChange={(event) =>
                                  setNotesByRequestId((current) => ({
                                    ...current,
                                    [request.id]: event.target.value,
                                  }))
                                }
                                placeholder="Provide the reason for approving or rejecting this request."
                                disabled={actingRequestId === request.id}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                disabled={actingRequestId === request.id}
                                onClick={() => void handleDecision(request.id, "approved")}
                              >
                                {actingRequestId === request.id ? "Saving..." : "Approve"}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={actingRequestId === request.id}
                                onClick={() => void handleDecision(request.id, "rejected")}
                              >
                                {actingRequestId === request.id ? "Saving..." : "Reject"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-border bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Decision reason
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-foreground">
                              {request.approver_note ?? "-"}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Reviewed {toReadableDateTime(request.reviewed_at)}
                              {approverName ? ` by ${approverName}` : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {index < visibleRequests.length - 1 ? <Separator /> : null}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
