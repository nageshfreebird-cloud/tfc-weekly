// ============================================
// TEACH FOR CHANGE — Shared Utilities
// ============================================

// ---- Team Members ----
// Removed: Now fetched dynamically via getTeamMembers() in db.js

// ---- Default Admin Credentials ----
export const DEFAULT_USER_ID = "admin";
export const DEFAULT_PASSWORD = "tfc@2014";

// ---- Date & Time Utilities ----

/** Returns current date/time string: "Tuesday, Aug 12, 2026  |  09:14 AM" */
export function formatDateTime(date = new Date()) {
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = days[date.getDay()];
  const m = months[date.getMonth()];
  const day = date.getDate();
  const yr  = date.getFullYear();
  let h = date.getHours(), min = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const minStr = min.toString().padStart(2, "0");
  return `${d}, ${m} ${day}, ${yr}  |  ${h}:${minStr} ${ampm}`;
}

/** Returns "Aug 4 (Mon)" style */
export function formatShortDate(dateStr) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const d = new Date(dateStr + "T00:00:00");
  return `${months[d.getMonth()]} ${d.getDate()} (${days[d.getDay()]})`;
}

/** Returns "Aug 4 (Mon) – Aug 8 (Fri)" */
export function formatWeekRange(startStr, endStr) {
  return `${formatShortDate(startStr)} – ${formatShortDate(endStr)}`;
}

/** Returns Monday of the week containing `date` as YYYY-MM-DD */
export function getMondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return toYMD(d);
}

/** Returns Friday of the week containing `date` as YYYY-MM-DD */
export function getFridayOf(date = new Date()) {
  const mon = new Date(getMondayOf(date) + "T00:00:00");
  mon.setDate(mon.getDate() + 4);
  return toYMD(mon);
}

/** Returns last week's Monday as YYYY-MM-DD */
export function getLastWeekMonday(date = new Date()) {
  const mon = new Date(getMondayOf(date) + "T00:00:00");
  mon.setDate(mon.getDate() - 7);
  return toYMD(mon);
}

/** Returns last week's Friday as YYYY-MM-DD */
export function getLastWeekFriday(date = new Date()) {
  const fri = new Date(getFridayOf(date) + "T00:00:00");
  fri.setDate(fri.getDate() - 7);
  return toYMD(fri);
}

/** YYYY-MM-DD string from Date */
export function toYMD(d) {
  return d.toISOString().split("T")[0];
}

/** "Monday, Aug 11" from YYYY-MM-DD */
export function formatFullDate(dateStr) {
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(dateStr + "T00:00:00");
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

/** Avatar initials from name */
export function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/** Time string "9:02 AM" */
export function formatTime(date) {
  let h = date.getHours(), m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2,"0")} ${ampm}`;
}

/** Start live clock in element with id */
export function startClock(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const tick = () => { el.textContent = formatDateTime(); };
  tick();
  setInterval(tick, 1000);
}

// ---- Session Utilities ----
export function setManagerSession() {
  sessionStorage.setItem("tfc_manager_auth", "true");
}
export function clearManagerSession() {
  sessionStorage.removeItem("tfc_manager_auth");
}
export function isManagerLoggedIn() {
  return sessionStorage.getItem("tfc_manager_auth") === "true";
}
export function requireManagerAuth() {
  if (!isManagerLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
