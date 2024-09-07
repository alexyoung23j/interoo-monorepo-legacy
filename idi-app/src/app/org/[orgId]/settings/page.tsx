"use client";

import LogoutButton from "@/app/_components/auth/LogoutButton";
import { useProfile } from "@/hooks/useProfile";
import React from "react";

export default function SettingsPage() {
  const { profile } = useProfile();
  console.log(profile);
  return (
    <div>
      <h1>Settings Page</h1>
      {/* Add your content here */}
      <LogoutButton>Logout</LogoutButton>
    </div>
  );
}
