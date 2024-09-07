"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  children: React.ReactNode;
  className?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ children, className }) => {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      router.push("/login");
    }
  };

  return (
    <Button
      onClick={() => handleLogout().catch(console.error)}
      variant="secondary"
      className={className}
    >
      {children}
    </Button>
  );
};

export default LogoutButton;
