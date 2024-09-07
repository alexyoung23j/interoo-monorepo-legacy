"use client";

import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { OUTER_SIDEBAR_ROUTES } from "./sidebarRoutes";
import { Gear, House, SignOut } from "@phosphor-icons/react";
import LogoutButton from "../../auth/LogoutButton";

export default function OuterSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const orgId = params.orgId as string;

  const resolveKey = (key: string, isSelected: boolean) => {
    switch (key) {
      case "studies":
        return (
          <House
            size={24}
            className={isSelected ? "text-theme-600" : "text-theme-300"}
          />
        );
      case "settings":
        return (
          <Gear
            size={24}
            className={isSelected ? "text-theme-600" : "text-theme-300"}
          />
        );
    }
  };

  return (
    <nav className="bg-theme-50 border-theme-200 flex w-16 flex-col items-center justify-between gap-1 border-r px-4 pb-4 pt-4">
      <div className="flex flex-col items-center gap-1">
        {OUTER_SIDEBAR_ROUTES.map((route) => {
          const href = route.path.replace("[orgId]", orgId);
          return (
            <Link
              key={route.path}
              href={href}
              className={`${href === pathname ? "bg-theme-100" : ""} hover:bg-theme-100 flex items-center justify-center rounded-md p-2`}
            >
              {resolveKey(route.key, pathname === href)}
            </Link>
          );
        })}
      </div>
      <LogoutButton variant="unstyled">
        <SignOut size={24} className="text-theme-500" />
      </LogoutButton>
    </nav>
  );
}
