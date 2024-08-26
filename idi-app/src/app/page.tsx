import Link from "next/link";

import { LatestPost } from "@/app/_components/post";
import { HydrateClient, api } from "@/trpc/server";
import OauthButton from "./_components/auth/OauthButton";
import { createClient } from "@/utils/supabase/client";
import Profile from "./_components/profile";
import SignOutButton from "./_components/signoutbutton";
import RequestButton from "./_components/requestbutton";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const supabase = createClient();

  const session = await supabase.auth.getSession();

  // Add this function
  const makeRequest = async () => {
    try {
      const response = await fetch("http://localhost:8080/protected", {
        method: "GET",
      });

      console.log({ response });

      if (!response.ok) {
        throw new Error("Failed to fetch protected data");
      }

      const data = await response.text();
    } catch (error) {
      console.error("Error fetching protected data:", error);
    }
  };

  console.log({ session });

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Create <span className="text-[hsl(280,100%,70%)]">T3</span> App
          </h1>
          <OauthButton provider="google" />
          <Profile />
          <SignOutButton />
          <RequestButton />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="https://create.t3.gg/en/usage/first-steps"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">First Steps →</h3>
              <div className="text-lg">
                Just the basics - Everything you need to know to set up your
                database and authentication.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="https://create.t3.gg/en/introduction"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">Documentation →</h3>
              <div className="text-lg">
                Learn more about Create T3 App, the libraries it uses, and how
                to deploy it.
              </div>
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-white">
              {hello ? "query worked yo" : "Loading tRPC query..."}
            </p>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
