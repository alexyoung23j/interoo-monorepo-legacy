"use client";

import { redirect, usePathname } from "next/navigation";
import React from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

const OauthButton: React.FC<{ provider: Provider }> = ({ provider }) => {
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogin = async () => {
    console.log({ origin: location.origin });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      // options: {
      //   redirectTo: `${location.origin}/auth/callback?next=${pathname}`,
      // },
    });

    if (error) {
      return redirect("/login?message=Could not authenticate user");
    }
  };

  if (provider === "google") {
    return (
      <button onClick={() => handleLogin().catch(console.error)}>google</button>
    );
  }
};

export default OauthButton;
