export type FrequencyUnit = "none" | "day" | "week" | "month" | "year";

export function relativeTime(date: string | null) {
  if (!date) return "Not done yet";
  const then = new Date(date);
  const now = new Date();
  const diff = now.getTime() - then.getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 60) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function formatDate(date: string | null) {
  if (!date) return "No date yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function addFrequency(date: string, unit: FrequencyUnit, value: number) {
  if (unit === "none" || value <= 0) return null;
  const next = new Date(date);
  if (unit === "day") next.setDate(next.getDate() + value);
  if (unit === "week") next.setDate(next.getDate() + value * 7);
  if (unit === "month") next.setMonth(next.getMonth() + value);
  if (unit === "year") next.setFullYear(next.getFullYear() + value);
  return next;
}

export function nextDueText(lastDone: string | null, unit: FrequencyUnit, value: number) {
  if (!lastDone || unit === "none" || value <= 0) return "No reminder schedule";
  const next = addFrequency(lastDone, unit, value);
  if (!next) return "No reminder schedule";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const due = new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}

export function recurrenceText(unit: FrequencyUnit, value: number) {
  if (unit === "none" || value <= 0) return "No recurring schedule";
  if (value === 1) {
    if (unit === "day") return "Every day";
    if (unit === "week") return "Every week";
    if (unit === "month") return "Every month";
    if (unit === "year") return "Every year";
  }
  return `Every ${value} ${unit}${value === 1 ? "" : "s"}`;
}


export function daysUntilDue(lastDone: string | null, unit: FrequencyUnit, value: number) {
  if (!lastDone || unit === "none" || value <= 0) return null;
  const next = addFrequency(lastDone, unit, value);
  if (!next) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const due = new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime();
  return Math.round((due - today) / 86_400_000);
}
