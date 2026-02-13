'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Shield,
  Users,
  ClipboardList,
  Trophy,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";
import { useAppContext } from "@/app/context/AppDataContext";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "./UserProfileDropdown";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/teams", label: "Teams", icon: Shield },
  { path: "/players", label: "Players", icon: Users },
  { path: "/stats", label: "Stats", icon: TrendingUp },
  { path: "/standings", label: "Standings", icon: Trophy },
  { path: "/matches", label: "Matches", icon: ClipboardList },
];

const adminNavItems = [
  { path: "/admin/onboarding", label: "User Management", icon: Users },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user, isAdmin } = useAppContext();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-sidebar p-6 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-wider">KICKOFF</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Team Manager</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary glow-green"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-4 border-t border-border" />
              <p className="text-xs text-muted-foreground font-semibold px-4 py-2 uppercase tracking-wider">Admin</p>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary glow-green"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-border space-y-3">
          {isAdmin && (
            <span className="inline-block text-[10px] uppercase tracking-wider bg-accent/15 text-accent px-2 py-0.5 rounded-full font-semibold">
              Admin
            </span>
          )}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <UserProfileDropdown
              user={user}
              onSignOut={signOut}
              size="md"
            />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold text-foreground">KICKOFF</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} className="lg:hidden fixed inset-0 z-30 bg-background/95 backdrop-blur-md pt-16 pb-20">
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="my-4 border-t border-border" />
                <p className="text-xs text-muted-foreground font-semibold px-4 py-2 uppercase tracking-wider">Admin</p>
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Mobile Menu Footer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-border bg-sidebar">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium truncate">{user?.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <UserProfileDropdown
                user={user}
                onSignOut={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                size="sm"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
