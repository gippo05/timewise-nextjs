import { Badge } from "@/components/ui/badge";
import type { LeaveStatus } from "@/src/types/leave";

const leaveStatusCopy: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const leaveStatusVariant: Record<
  LeaveStatus,
  "warning" | "success" | "danger" | "neutral"
> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export default function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge variant={leaveStatusVariant[status]}>{leaveStatusCopy[status]}</Badge>;
}
