"use client";

import { api } from "@/trpc/react";

export default function TestPage() {
  const createInvite = api.orgs.createInvite.useMutation();

  return (
    <div>
      <h1>Test Page</h1>
      <p>This is a new page at /test</p>
      <button
        onClick={async () => {
          const res = await createInvite.mutateAsync({
            organizationId: "032605ae-780b-4275-89bb-88e7a8d391a9",
          });
          console.log(res);
        }}
      >
        Create Invite
      </button>
    </div>
  );
}
