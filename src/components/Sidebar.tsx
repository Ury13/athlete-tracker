"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity,
  BarChart3,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Scale,
  Target,
  Utensils,
  X,
} from "lucide-react";
import clsx from "clsx";

const navLinks = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/diet", label: "Diet", icon: Utensils },
  { href: "/metrics", label: "Metrics", icon: Scale },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

interface SidebarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
          <Activity className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <span className="text-white font-bold text-base leading-none">
            AthletIQ
          </span>
          <p className="text-slate-500 text-xs mt-0.5">Performance Tracker</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              "sidebar-link",
              isActive(href) && "active"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">
            {userName ?? "Athlete"}
          </p>
          {userEmail && (
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-400" />
          <span className="text-white font-bold">AthletIQ</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}
