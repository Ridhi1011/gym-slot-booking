// The gym runs on India time. All timestamps are stored in UTC; this zone is only
// used to interpret an admin's "date + hour" and to group sessions by local day.
export const GYM_TZ = 'Asia/Kolkata';

// Today's date in the gym's timezone as YYYY-MM-DD
export function gymToday() {
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: GYM_TZ }).format(new Date());
}
