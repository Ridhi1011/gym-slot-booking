// The gym runs on India time. The server sends UTC timestamps; we always
// display them in this zone, whatever timezone the viewer's device is in.
export const GYM_TZ = 'Asia/Kolkata';

const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: GYM_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: GYM_TZ, weekday: 'short', day: 'numeric', month: 'short' });
const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: GYM_TZ }); // en-CA gives YYYY-MM-DD

export const formatTime = (iso) => timeFmt.format(new Date(iso));
export const formatDay = (iso) => dayFmt.format(new Date(iso));

// "07:00 – 08:00" (sessions are always one hour)
export function formatTimeRange(iso) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

// Today's date at the gym as YYYY-MM-DD
export const gymToday = () => ymdFmt.format(new Date());

// Current hour (0-23) at the gym
export const gymHourNow = () => Number(timeFmt.format(new Date()).slice(0, 2));

// Date math on YYYY-MM-DD strings, done in UTC so DST on the viewer's device can't shift it
export function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "Today", "Tomorrow" or "Wed, 14 Oct"
export function dayLabel(ymd) {
  const today = gymToday();
  if (ymd === today) return 'Today';
  if (ymd === addDays(today, 1)) return 'Tomorrow';
  if (ymd === addDays(today, -1)) return 'Yesterday';
  // noon UTC is the same calendar day in India
  return dayFmt.format(new Date(`${ymd}T12:00:00Z`));
}
