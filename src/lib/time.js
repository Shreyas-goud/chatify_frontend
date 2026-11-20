const DAY = 24 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, "0");

export const clock = (date) => {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Whole calendar days from `date` to `now` (0 = today, 1 = yesterday).
export const daysAgo = (date, now = new Date()) =>
  Math.round((startOfDay(now) - startOfDay(date)) / DAY);

export const sameDay = (a, b) => daysAgo(a, b) === 0;

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

// The time column of the board: 14:32, YDAY, MON, 13 NOV.
export function boardTime(date, now = new Date()) {
  const days = daysAgo(date, now);
  if (days <= 0) return clock(date);
  if (days === 1) return "YDAY";
  if (days < 7) return weekday.format(new Date(date)).toUpperCase();
  return dayMonth.format(new Date(date)).toUpperCase();
}

// Separators inside a conversation: TODAY, YESTERDAY, THU 13 NOV, 13 NOV 2025.
export function dayLabel(date, now = new Date()) {
  const d = new Date(date);
  const days = daysAgo(d, now);
  if (days === 0) return "TODAY";
  if (days === 1) return "YESTERDAY";
  if (d.getFullYear() !== now.getFullYear()) return dayMonthYear.format(d).toUpperCase();
  return `${weekday.format(d)} ${dayMonth.format(d)}`.toUpperCase();
}

export const fullDate = (date) => dayMonthYear.format(new Date(date));
