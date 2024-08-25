"use client";

import { createClient } from "@/utils/supabase/client";
import React from "react";
import { redirect } from "next/navigation";

const RequestButton: React.FC = () => {
  // Add this function
  const makeRequest = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("http://localhost:8080/protected", {
        method: "GET",
        credentials: "include", // Add this line
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      console.log({ response });

      if (!response.ok) {
        throw new Error("Failed to fetch protected data");
      }

      const data = await response.text();
      console.log({ data });
    } catch (error) {
      console.error("Error fetching protected data:", error);
    }
  };
  return (
    <button
      className="bg-btn-background hover:bg-btn-background-hover rounded-md px-4 py-2 no-underline"
      onClick={makeRequest}
    >
      Request
    </button>
  );
};

export default RequestButton;
