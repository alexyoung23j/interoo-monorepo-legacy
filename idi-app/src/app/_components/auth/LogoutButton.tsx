"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { createClient } from "@/utils/supabase/client";

interface LogoutButtonProps {
  children: React.ReactNode;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ children }) => {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <button onClick={() => handleLogout().catch(console.error)}>
      {children}
    </button>
  );
};

export default LogoutButton;
