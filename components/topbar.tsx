"use client";

import { usePathname } from "next/navigation";

interface MenuItem {
  id: number;
  title: string;
  link: string;
}

const TopBar: React.FC = () => {
  const pathname = usePathname();

  const SidebarMenu: MenuItem[] = [
    { id: 1, title: "Dashboard", link: "/dashboard" },
    { id: 2, title: "Attendance Table", link: "/dashboard/attendance-table" },
    { id: 3, title: "Settings", link: "/dashboard/settings" },
  ];

  const currentItem = SidebarMenu.find((item) => item.link === pathname);

  return (
    <div className="w-full h-16 bg-linear-to-r from-white to-black flex items-center justify-between px-6 shadow-md">
      <h1 className="text-xl font-semibold">
        {currentItem ? currentItem.title : "Dashboard"}
      </h1>
    </div>
  );
};

export default TopBar;