"use client";

import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { OUTER_SIDEBAR_ROUTES } from "./sidebarRoutes";

export default function OuterSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const orgId = params.orgId as string;

  return (
    <nav className="bg-theme-800 w-16">
      {OUTER_SIDEBAR_ROUTES.map((route) => {
        const href = route.path.replace("[orgId]", orgId);
        return (
          <Link
            key={route.path}
            href={href}
            className={`block p-4 text-2xl ${pathname === href ? "bg-theme-700" : ""}`}
          >
            {route.emoji}
          </Link>
        );
      })}
    </nav>
  );
}
