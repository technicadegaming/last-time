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

// Calendar recurrence uses UTC day boundaries consistently in UI and email cron.
// Clamp month/year dates to the last valid day of the target month.
export function addFrequency(date: string | Date, unit: FrequencyUnit, value: number): Date | null {
  if (unit === "none" || !Number.isInteger(value) || value <= 0) return null;
  const source = new Date(date);
  if (Number.isNaN(source.getTime())) return null;
  const next = new Date(source);
  if (unit === "day") next.setUTCDate(next.getUTCDate() + value);
  if (unit === "week") next.setUTCDate(next.getUTCDate() + value * 7);
  if (unit === "month" || unit === "year") {
    const monthOffset = unit === "year" ? value * 12 : value;
    const originalDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + monthOffset);
    const daysInTarget = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth()+1, 0)).getUTCDate();
    next.setUTCDate(Math.min(originalDay, daysInTarget));
  }
  return next;
}

function calendarDayDifference(due: Date, now = new Date()) {
  const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((utcDay(due) - utcDay(now)) / 86_400_000);
}

export function nextDueText(lastDone: string | null, unit: FrequencyUnit, value: number) {
  if (!lastDone || unit === "none" || value <= 0) return "No reminder schedule";
  const next = addFrequency(lastDone, unit, value);
  if (!next) return "No reminder schedule";

  const days = calendarDayDifference(next);
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

  return calendarDayDifference(next);
}
