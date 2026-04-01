import type { LucideIcon } from "lucide-react";
import {
  ChartColumnIncreasing,
  ClipboardCheck,
  Clock3,
  Settings2,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

type DashboardPageMeta = {
  matcher: (pathname: string) => boolean;
  title: string;
  description: string;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview, clock status, and recent attendance.",
    icon: ChartColumnIncreasing,
  },
  {
    href: "/dashboard/attendance-table",
    label: "Attendance Logs",
    description: "Review team clock-ins, breaks, and total worked hours.",
    icon: Clock3,
    adminOnly: true,
  },
  {
    href: "/dashboard/request-leave",
    label: "Leave Requests",
    description: "Submit time off and monitor approval progress.",
    icon: ClipboardCheck,
  },
  {
    href: "/dashboard/request-leave/admin",
    label: "Leave Approvals",
    description: "Approve, reject, and annotate employee leave requests.",
    icon: ClipboardCheck,
    adminOnly: true,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    description: "Manage your profile, avatar, and account security.",
    icon: Settings2,
  },
];

const dashboardPageMeta: DashboardPageMeta[] = [
  {
    matcher: (pathname) => pathname === "/dashboard/request-leave/admin",
    title: "Leave Approvals",
    description: "Review incoming requests, capture decision notes, and keep the team schedule clear.",
  },
  {
    matcher: (pathname) => pathname === "/dashboard/request-leave",
    title: "Leave Requests",
    description: "Plan time away, submit requests confidently, and track status without extra follow-up.",
  },
  {
    matcher: (pathname) => pathname === "/dashboard/attendance-table",
    title: "Attendance Logs",
    description: "Audit attendance records across the workforce with clean filters and readable time summaries.",
  },
  {
    matcher: (pathname) => pathname === "/dashboard/settings",
    title: "Settings",
    description: "Keep profile details, security settings, and account preferences consistent across the workspace.",
  },
  {
    matcher: (pathname) => pathname === "/dashboard",
    title: "Operations Snapshot",
    description: "Monitor today’s activity, keep attendance accurate, and stay on top of workforce actions.",
  },
];

export function getDashboardPageMeta(pathname: string) {
  return (
    dashboardPageMeta.find((item) => item.matcher(pathname)) ?? {
      title: "Dashboard",
      description: "Manage attendance, leave, and account settings from one reliable workspace.",
    }
  );
}
