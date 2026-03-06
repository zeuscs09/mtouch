"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "แดชบอร์ด" },
  { href: "/admin/issues", label: "Issues" },
  { href: "/admin/sla", label: "SLA" },
  { href: "/admin/companies", label: "บริษัท" },
  { href: "/admin/users", label: "ผู้ใช้" },
  { href: "/admin/teams", label: "ทีม" },
  { href: "/admin/settings", label: "ตั้งค่า" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30 p-4 flex flex-col">
        <div className="mb-6">
          <h1 className="text-xl font-bold">mtouch</h1>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname.startsWith(item.href) && "bg-accent font-medium"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => logout()}>
            ออกจากระบบ
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
