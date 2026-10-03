"use client";

import { FormEvent, useEffect, useState } from "react";

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

const categories = [
  ["home", "🏠", "Home"], ["vehicle", "🚗", "Vehicle"], ["pet", "🐕", "Pet"],
  ["personal", "✂️", "Personal"], ["yard", "🌱", "Yard"], ["tech", "💻", "Tech"], ["other", "↺", "Other"],
] as const;

const presets = [
  ["none", 0, "No schedule"], ["week", 1, "Every week"], ["month", 1, "Every month"],
  ["month", 3, "Every 3 months"], ["month", 6, "Every 6 months"], ["year", 1, "Every year"],
] as const;

const quickAdds = [
  { title: "Change furnace filter", category: "home", unit: "month", value: 3, emoji: "🏠" },
  { title: "Oil change", category: "vehicle", unit: "month", value: 6, emoji: "🚗" },
  { title: "Give pet medication", category: "pet", unit: "month", value: 1, emoji: "🐕" },
  { title: "Haircut", category: "personal", unit: "month", value: 2, emoji: "✂️" },
  { title: "Change water filter", category: "home", unit: "month", value: 6, emoji: "💧" },
  { title: "Test smoke detectors", category: "home", unit: "month", value: 6, emoji: "🚨" },
] as const;

export default function NewTrackerPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [lastDone, setLastDone] = useState("");
  const [frequencyUnit, setFrequencyUnit] = useState("none");
  const [frequencyValue, setFrequencyValue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [shareWithFamily, setShareWithFamily] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const speechWindow = window as typeof window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      setVoiceSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    }

    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(async ({ data }) => {
        if (!data.session) {
          router.replace("/login");
          return;
        }
        const { data: membership } = await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (membership?.household_id) setHouseholdId(membership.household_id);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Supabase is not configured.");
    }
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) { router.replace("/login"); return; }
      const selected = categories.find(([key]) => key === category) ?? categories[categories.length - 1];
      const timestamp = lastDone ? new Date(`${lastDone}T12:00:00`).toISOString() : null;
      const { data: tracker, error: insertError } = await supabase.from("trackers").insert({
        user_id: authData.user.id, title: title.trim(), category, emoji: selected[1], last_done_at: timestamp,
        frequency_unit: frequencyUnit, frequency_value: frequencyValue,
        household_id: shareWithFamily && householdId ? householdId : null,
      }).select("id").single();
      if (insertError) {
        if (insertError.message.includes("FREE_LIMIT_REACHED")) {
          track("free_limit_reached", { source: "tracker_insert" });
          router.replace("/app/upgrade?limit=1");
          return;
        }
        throw insertError;
      }
      if (timestamp) {
        const { error: historyError } = await supabase.from("occurrences").insert({
          tracker_id: tracker.id, user_id: authData.user.id, completed_at: timestamp,
        });
        if (historyError) throw historyError;
      }
      track("tracker_created", {
        category,
        scheduled: frequencyUnit !== "none" && frequencyValue > 0,
        has_last_done: Boolean(timestamp),
        shared_with_family: Boolean(shareWithFamily && householdId),
      });
      router.replace(`/app/item/${tracker.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this tracker."); setBusy(false);
    }
  }

  function choosePreset(unit: string, value: number) { setFrequencyUnit(unit); setFrequencyValue(value); }

  function chooseQuickAdd(item: typeof quickAdds[number]) {
    setTitle(item.title);
    setCategory(item.category);
    setFrequencyUnit(item.unit);
    setFrequencyValue(item.value);
  }

  function startVoiceInput() {
    if (typeof window === "undefined") return;

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setError("");
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setTitle(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        setError(event.error === "not-allowed"
          ? "Microphone access was blocked. Allow microphone access and try again."
          : "Could not hear that clearly. Try again.");
      }
    };

    recognition.onend = () => setListening(false);

    setListening(true);
    recognition.start();
  }

  return (
    <main className="appShell shell">
      <header className="appHeader"><a className="brand" href="/app">← <span>Back</span></a><a className="smallBrand" href="/">↺ AgainDue</a></header>
      <section className="formPage">
        <p className="eyebrow">Add something</p><h1>What do you want to remember?</h1>
        <form className="trackerForm" onSubmit={submit}>
          <fieldset>
            <legend>Quick add</legend>
            <div className="quickAddGrid">
              {quickAdds.map((item) => (
                <button type="button" className="quickAdd" key={item.title} onClick={() => chooseQuickAdd(item)}>
                  <span>{item.emoji}</span>
                  <strong>{item.title}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            Thing to remember
            <div className="voiceInputWrap">
              <input autoFocus required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Change furnace filter" />
              {voiceSupported && (
                <button
                  type="button"
                  className={`voiceButton ${listening ? "listening" : ""}`}
                  onClick={startVoiceInput}
                  disabled={listening}
                  aria-label="Use voice input"
                  title="Speak what you want to remember"
                >
                  {listening ? "Listening…" : "🎙 Speak"}
                </button>
              )}
            </div>
            {voiceSupported && <span className="voiceHint">{listening ? "Say what you want AgainDue to remember." : "Or tap Speak and say it out loud."}</span>}
          </label>
          {householdId && (
            <fieldset>
              <legend>Who is this for?</legend>
              <div className="shareChoiceGrid">
                <button
                  type="button"
                  className={`preset ${!shareWithFamily ? "selected" : ""}`}
                  onClick={() => setShareWithFamily(false)}
                >
                  👤 Just me
                </button>
                <button
                  type="button"
                  className={`preset ${shareWithFamily ? "selected" : ""}`}
                  onClick={() => setShareWithFamily(true)}
                >
                  👨‍👩‍👧‍👦 Share with family
                </button>
              </div>
            </fieldset>
          )}
          <fieldset><legend>Category</legend><div className="categoryGrid">
            {categories.map(([key, emoji, label]) => <label className={`categoryChoice ${category === key ? "selected" : ""}`} key={key}><input type="radio" name="category" value={key} checked={category === key} onChange={() => setCategory(key)} /><span>{emoji}</span><strong>{label}</strong></label>)}
          </div></fieldset>
          <label>When did you last do it? <span className="optional">Optional</span><input type="date" value={lastDone} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setLastDone(e.target.value)} /></label>
          <fieldset><legend>How often?</legend><div className="presetGrid">
            {presets.map(([unit, value, label]) => <button type="button" key={`${unit}-${value}`} className={`preset ${frequencyUnit === unit && frequencyValue === value ? "selected" : ""}`} onClick={() => choosePreset(unit, value)}>{label}</button>)}
          </div></fieldset>
          {error && <div className="formError">{error}</div>}
          <button className="button primary full" type="submit" disabled={busy || !title.trim()}>{busy ? "Saving…" : "Save it"}</button>
        </form>
      </section>
    </main>
  );
}
