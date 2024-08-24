import { createClient } from "@/utils/supabase/server";
import React from "react";

const Profile: React.FC = async () => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <div>User {user?.email}</div>;
};

export default Profile;
