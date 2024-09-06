"use client";

import { useParams } from "next/navigation";

const InviteErrorPage = () => {
  const { error } = useParams();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-4 text-3xl font-bold">Invite Error</h1>
      <p className="text-xl text-red-600">{error}</p>
    </div>
  );
};

export default InviteErrorPage;
