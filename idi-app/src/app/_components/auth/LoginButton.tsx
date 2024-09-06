"use client";

import { useRouter } from "next/navigation";
import React from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface LoginButtonProps {
  provider: Provider;
  next?: string;
  children: React.ReactNode;
}

const LoginButton: React.FC<LoginButtonProps> = ({
  provider,
  next,
  children,
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
    <button onClick={() => handleLogin().catch(console.error)}>
      {children}
    </button>
  );
};

export default LoginButton;
