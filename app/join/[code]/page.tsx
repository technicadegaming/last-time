"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

export default function JoinFamilyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;
  const [message, setMessage] = useState("Joining your family…");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          router.replace(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
          return;
        }

        const { error: joinError } = await supabase.rpc("join_household", {
          p_invite_code: code,
        });

        if (joinError) {
          if (joinError.message.includes("ALREADY_IN_HOUSEHOLD")) {
            setMessage("You're already in a family. Taking you to Last Time…");
            setTimeout(() => router.replace("/app"), 700);
            return;
          }
          if (joinError.message.includes("INVITE_NOT_FOUND")) {
            throw new Error("That family invite link is invalid or expired.");
          }
          throw joinError;
        }

        setMessage("You're in! Shared family trackers are now available.");
        setTimeout(() => router.replace("/app"), 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not join this family.");
      }
    })();
  }, [code, router]);

  return (
    <main className="authPage shell">
      <a className="brand authBrand" href="/">↺ <span>Last Time</span></a>
      <section className="authCard">
        <p className="eyebrow">Family invite</p>
        <h1>Join your family</h1>
        {error ? (
          <>
            <div className="formError">{error}</div>
            <a className="button primary full" href="/app">Back to Last Time</a>
          </>
        ) : (
          <div className="formSuccess">{message}</div>
        )}
      </section>
    </main>
  );
}
