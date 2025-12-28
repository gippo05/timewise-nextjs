"use client"

// components/SideBar.tsx
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  FaTachometerAlt,
  FaTable,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import main_logo from "@/public/TimeWISE logo.png";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const SideBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { path: "/dashboard/attendance-table", label: "Attendance Table", icon: <FaTable /> },
    { path: "/dashboard/settings", label: "Settings", icon: <FaCog /> },
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="w-64 h-screen sticky top-0 bg-[#2563EB] flex flex-col p-5 shadow-md text-white">
      {/* Logo */}
      <div className="mb-10 w-full flex justify-center">
        <Image src={main_logo} alt="TimeWISE Logo" width={150} height={50} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto hide-scrollbar">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path} passHref
                
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${
                      pathname === item.path
                        ? "bg-sky-300 text-black"
                        : "hover:bg-sky-300 hover:text-blue-700"
                    }`}
                >
                  {item.icon}
                  {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout pinned at bottom */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 font-bold py-2 mt-auto px-3 rounded-lg hover:bg-gray-800 hover:text-red-400 transition-colors"
        type="button"
      >
        <FaSignOutAlt /> Logout
      </button>
    </div>
  );
};

export default SideBar;