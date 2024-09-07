"use client";

import { useRouter } from "next/navigation";
import React from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { GoogleLogo } from "../svg/GoogleLogo";

interface LoginButtonProps {
  provider: Provider;
  next?: string;
  children: React.ReactNode;
  className?: string;
}

const LoginButton: React.FC<LoginButtonProps> = ({
  provider,
  next,
  children,
  className,
}) => {
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async () => {
    // Check if user is already logged in
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If logged in, sign out first
    if (session) {
      await supabase.auth.signOut();
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback${
          next ? `?next=${encodeURIComponent(next)}` : ""
        }`,
      },
    });

    if (error) {
      router.push("/login?message=Could not authenticate user");
    }
  };

  return (
    <Button
      onClick={() => handleLogin().catch(console.error)}
      variant="secondary"
      className={className}
    >
      {children}
    </Button>
  );
};

export default LoginButton;
