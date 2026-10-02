"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../../lib/supabase";
import { formatDate, nextDueText, recurrenceText, relativeTime, type FrequencyUnit } from "../../../../lib/date";

type Tracker = { id:string; title:string; category:string; emoji:string; frequency_unit:FrequencyUnit; frequency_value:number; last_done_at:string|null; user_id:string; household_id:string|null; };
type Occurrence = { id:string; completed_at:string; note:string|null; };

const categories = [["home","🏠","Home"],["vehicle","🚗","Vehicle"],["pet","🐕","Pet"],["personal","✂️","Personal"],["yard","🌱","Yard"],["tech","💻","Tech"],["other","↺","Other"]] as const;

export default function TrackerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [tracker, setTracker] = useState<Tracker|null>(null);
  const [history, setHistory] = useState<Occurrence[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(""); const [category, setCategory] = useState("other");
  const [frequencyUnit, setFrequencyUnit] = useState<FrequencyUnit>("none"); const [frequencyValue, setFrequencyValue] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: session } = await supabase.auth.getSession(); if (!session.session) { router.replace("/login"); return; }
      setUserId(session.session.user.id);
      const [{ data: item, error: itemError }, { data: events, error: historyError }] = await Promise.all([
        supabase.from("trackers").select("id,title,category,emoji,frequency_unit,frequency_value,last_done_at,user_id,household_id").eq("id", id).single(),
        supabase.from("occurrences").select("id,completed_at,note").eq("tracker_id", id).order("completed_at", { ascending:false }).limit(50),
      ]);
      if (itemError) throw itemError; if (historyError) throw historyError;
      const t = item as Tracker; setTracker(t); setTitle(t.title); setCategory(t.category); setFrequencyUnit(t.frequency_unit); setFrequencyValue(t.frequency_value); setHistory((events ?? []) as Occurrence[]);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load this tracker."); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function markDone() {
    setBusy(true); setError("");
    try { const supabase = getSupabaseBrowserClient(); const { error: rpcError } = await supabase.rpc("mark_tracker_done", { p_tracker_id:id }); if (rpcError) throw rpcError; await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not mark it done."); } finally { setBusy(false); }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const selected = categories.find(([key]) => key === category) ?? categories[categories.length-1];
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.from("trackers").update({ title:title.trim(), category, emoji:selected[1], frequency_unit:frequencyUnit, frequency_value:frequencyValue }).eq("id", id);
      if (updateError) throw updateError; setEditing(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save changes."); } finally { setBusy(false); }
  }

  async function archive() {
    if (!confirm("Archive this tracker? Its history will be kept.")) return;
    const supabase = getSupabaseBrowserClient(); const { error: archiveError } = await supabase.from("trackers").update({ archived_at:new Date().toISOString() }).eq("id", id);
    if (archiveError) { setError(archiveError.message); return; } router.replace("/app");
  }

  async function remove() {
    if (!confirm("Delete this tracker and all of its history permanently?")) return;
    const supabase = getSupabaseBrowserClient(); const { error: deleteError } = await supabase.from("trackers").delete().eq("id", id);
    if (deleteError) { setError(deleteError.message); return; } router.replace("/app");
  }

  if (loading) return <main className="appShell shell"><div className="emptyState"><strong>Loading…</strong></div></main>;
  if (!tracker) return <main className="appShell shell"><div className="formError">{error || "Tracker not found."}</div></main>;

  return <main className="appShell shell">
    <header className="appHeader"><a className="brand" href="/app">← <span>Back</span></a><a className="smallBrand" href="/">↺ Last Time</a></header>
    {error && <div className="formError dashboardMessage">{error}</div>}
    <section className="detailHero">
      <div className="detailIcon">{tracker.emoji}</div><p className="eyebrow">{tracker.category}{tracker.household_id ? " · Family" : ""}</p><h1>{tracker.title}</h1>
      <div className="lastAnswer"><strong>{relativeTime(tracker.last_done_at)}</strong><span>{formatDate(tracker.last_done_at)}</span></div>
      <div className="detailDue"><strong>{nextDueText(tracker.last_done_at, tracker.frequency_unit, tracker.frequency_value)}</strong><span>{recurrenceText(tracker.frequency_unit, tracker.frequency_value)}</span></div>
      <button className="button doneBig" onClick={markDone} disabled={busy}>✓ {busy ? "Saving…" : "Did it again"}</button>
    </section>

    <section className="detailPanel">
      <div className="detailPanelHead"><h2>History</h2><button className="textButton inline" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit"}</button></div>
      {history.length === 0 ? <p className="historyEmpty">No completed dates yet. Tap “Did it again” the next time you do it.</p> : <div className="historyList">{history.map((event) => <div className="historyRow" key={event.id}><span className="historyDot">✓</span><div><strong>{formatDate(event.completed_at)}</strong><span>{relativeTime(event.completed_at)}</span></div></div>)}</div>}
    </section>

    {editing && <section className="detailPanel editPanel"><h2>Edit tracker</h2><form className="trackerForm compactForm" onSubmit={saveEdit}>
      <label>Title<input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map(([key,,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <div className="splitFields"><label>Every<input type="number" min="0" max="365" value={frequencyValue} onChange={(e) => setFrequencyValue(Math.max(0, Number(e.target.value)))} /></label><label>Unit<select value={frequencyUnit} onChange={(e) => setFrequencyUnit(e.target.value as FrequencyUnit)}><option value="none">No schedule</option><option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option><option value="year">Years</option></select></label></div>
      <button className="button primary full" disabled={busy || !title.trim()}>{busy ? "Saving…" : "Save changes"}</button>
    </form></section>}

    {tracker.user_id === userId && <section className="dangerActions"><button onClick={archive}>Archive</button><button className="danger" onClick={remove}>Delete permanently</button></section>}
  </main>;
}
