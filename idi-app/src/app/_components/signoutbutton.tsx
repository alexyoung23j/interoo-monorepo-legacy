"use client";

import { createClient } from "@/utils/supabase/client";
import React from "react";
import { redirect } from "next/navigation";

const SignOutButton: React.FC = () => {
  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // return redirect("/");
  };

  return (
    <button
      className="bg-btn-background hover:bg-btn-background-hover rounded-md px-4 py-2 no-underline"
      onClick={signOut}
    >
      Logout
    </button>
  );
};

export default SignOutButton;
