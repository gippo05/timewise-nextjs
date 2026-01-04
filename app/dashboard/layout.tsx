"use client";

import SideBar from "@/components/Sidebar";
import TopBar from "@/components/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SideBar />
      <div className="flex flex-col flex-1">
        <TopBar />
        <main className="flex-1 bg-gray-50 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 