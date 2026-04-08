import React from "react";

import SideBar from "@/components/Sidebar";
import TopBar from "@/components/topbar";

type DashboardShellProps = {
  children: React.ReactNode;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    role: string | null;
    avatar_path?: string | null;
  } | null;
};

export default function DashboardShell({
  children,
  profile = null,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="flex min-h-screen">
        <SideBar profile={profile} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
