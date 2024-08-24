import { createClient } from "@/utils/supabase/server";
import React from "react";
import { redirect } from "next/navigation";

const SignOutButton: React.FC = async () => {
  const signOut = async () => {
    "use server";

    const supabase = createClient();
    await supabase.auth.signOut();
    return redirect("/");
  };

  return (
    <form action={signOut}>
      <button className="bg-btn-background hover:bg-btn-background-hover rounded-md px-4 py-2 no-underline">
        Logout
      </button>
    </form>
  );
};

export default SignOutButton;
