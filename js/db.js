// ============================================
// TEACH FOR CHANGE — Firebase DB Operations
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs, onSnapshot, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";
import { DEFAULT_USER_ID, DEFAULT_PASSWORD, getMondayOf, getFridayOf, toYMD } from "./utils.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ============================================
// ADMIN AUTH
// ============================================

/** Get current admin credentials from Firestore. Falls back to defaults. */
export async function getAdminCredentials() {
  try {
    const snap = await getDoc(doc(db, "settings", "admin"));
    if (snap.exists()) return snap.data();
  } catch(e) {}
  return { userId: DEFAULT_USER_ID, password: DEFAULT_PASSWORD };
}

/** Verify login attempt */
export async function verifyAdminLogin(userId, password) {
  const creds = await getAdminCredentials();
  if (userId === creds.userId && password === creds.password) return true;
  // Also allow default credentials always
  if (userId === DEFAULT_USER_ID && password === DEFAULT_PASSWORD) return true;
  return false;
}

/** Update admin credentials */
export async function updateAdminCredentials(newUserId, newPassword) {
  await setDoc(doc(db, "settings", "admin"), {
    userId: newUserId,
    password: newPassword,
    updatedAt: new Date().toISOString()
  });
}

// ============================================
// WEEK SETTINGS
// ============================================

/** Get current week settings */
export async function getWeekSettings() {
  const today = new Date();
  const currentMonday = getMondayOf(today);
  const defaultEnd = getFridayOf(today);

  try {
    const snap = await getDoc(doc(db, "settings", "week"));
    if (snap.exists()) {
      const data = snap.data();
      // Only return saved settings if they belong to the current or future week
      if (data.weekStart >= currentMonday) {
        return data;
      }
    }
  } catch(e) {}
  
  // Return defaults for current week (auto-advance logic)
  return {
    weekStart:        currentMonday,
    weekEnd:          defaultEnd,
    meetingDay:       currentMonday,
    teamNote:         "",
    submissionsOpen:  false
  };
}

/** Save week settings (admin action) */
export async function saveWeekSettings(settings) {
  await setDoc(doc(db, "settings", "week"), {
    ...settings,
    updatedAt: new Date().toISOString()
  });
}

/** Toggle submissions open/closed */
export async function setSubmissionsOpen(isOpen) {
  const cur = await getWeekSettings();
  await setDoc(doc(db, "settings", "week"), {
    ...cur,
    submissionsOpen: isOpen,
    updatedAt: new Date().toISOString()
  });
}

/** Listen to week settings changes in real time */
export function listenWeekSettings(callback) {
  return onSnapshot(doc(db, "settings", "week"), snap => {
    if (snap.exists()) callback(snap.data());
    else callback(null);
  });
}

// ============================================
// SUBMISSIONS
// ============================================

/** Submit or update a member's weekly report */
export async function submitMemberReport(weekStart, memberName, data) {
  const id = `${weekStart}_${memberName.replace(/\s+/g,"_")}`;
  // Initialize completed tracking array
  const completed = data.thisWeekTasks ? data.thisWeekTasks.map(() => false) : [];
  
  await setDoc(doc(db, "submissions", id), {
    weekStart,
    memberName,
    submittedAt: new Date().toISOString(),
    thisWeekCompleted: completed,
    ...data
  });
}

/** Mark a single task as completed during the week */
export async function markTaskCompleted(weekStart, memberName, taskIndex) {
  const id = `${weekStart}_${memberName.replace(/\s+/g,"_")}`;
  const ref = doc(db, "submissions", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    let completed = data.thisWeekCompleted || (data.thisWeekTasks ? data.thisWeekTasks.map(() => false) : []);
    completed[taskIndex] = true;
    await updateDoc(ref, { thisWeekCompleted: completed });
    
    // Also try to update it in the 'summaries' collection if it exists,
    // so the admin printout syncs up automatically.
    try {
      const sumSnap = await getDoc(doc(db, "summaries", weekStart));
      if (sumSnap.exists()) {
        const sumData = sumSnap.data();
        if (sumData.members && sumData.members[memberName]) {
          let sumCompleted = sumData.members[memberName].thisWeekCompleted || (sumData.members[memberName].thisWeekTasks ? sumData.members[memberName].thisWeekTasks.map(() => false) : []);
          sumCompleted[taskIndex] = true;
          // Note: using updateDoc with nested fields requires dot notation
          const fieldPath = `members.${memberName}.thisWeekCompleted`;
          await updateDoc(doc(db, "summaries", weekStart), { [fieldPath]: sumCompleted });
        }
      }
    } catch(err) { console.error("Error syncing to summary:", err); }
  }
}

/** Get one member's submission for a week */
export async function getMemberSubmission(weekStart, memberName) {
  const id = `${weekStart}_${memberName.replace(/\s+/g,"_")}`;
  const snap = await getDoc(doc(db, "submissions", id));
  return snap.exists() ? snap.data() : null;
}

/** Delete a member's submission so they can resubmit */
export async function deleteMemberSubmission(weekStart, memberName) {
  const id = `${weekStart}_${memberName.replace(/\s+/g,"_")}`;
  await deleteDoc(doc(db, "submissions", id));
}

/** Get all submissions for a week */
export async function getWeekSubmissions(weekStart) {
  const q = query(collection(db, "submissions"), where("weekStart", "==", weekStart));
  const snap = await getDocs(q);
  const result = {};
  snap.forEach(d => { result[d.data().memberName] = d.data(); });
  return result;
}

/** Listen to all submissions for a week in real time */
export function listenWeekSubmissions(weekStart, callback) {
  const q = query(collection(db, "submissions"), where("weekStart", "==", weekStart));
  return onSnapshot(q, snap => {
    const result = {};
    snap.forEach(d => { result[d.data().memberName] = d.data(); });
    callback(result);
  });
}

// ============================================
// MEETING SUMMARY (editable by admin)
// ============================================

/** Save edited summary */
export async function saveSummary(weekStart, summaryData) {
  await setDoc(doc(db, "summaries", weekStart), {
    weekStart,
    members: summaryData,
    finalized: false,
    savedAt: new Date().toISOString()
  });
}

/** Finalize summary */
export async function finalizeSummary(weekStart) {
  const snap = await getDoc(doc(db, "summaries", weekStart));
  if (snap.exists()) {
    await updateDoc(doc(db, "summaries", weekStart), {
      finalized: true,
      finalizedAt: new Date().toISOString()
    });
  }
}

/** Get summary for a week */
export async function getSummary(weekStart) {
  const snap = await getDoc(doc(db, "summaries", weekStart));
  return snap.exists() ? snap.data() : null;
}

// ============================================
// TEAM MEMBERS
// ============================================

const DEFAULT_TEAM = [
  "Nagesh", "Sai Kiran", "Rajashekar", "Jai Ram",
  "Suresh", "Vamshi Krishna", "Swamy", "Chandrika", "Pratiksha"
];

/** Get dynamic team members */
export async function getTeamMembers() {
  try {
    const snap = await getDoc(doc(db, "settings", "team"));
    if (snap.exists() && snap.data().members) {
      return snap.data().members;
    }
  } catch(e) {}
  return DEFAULT_TEAM;
}

/** Save team members */
export async function saveTeamMembers(members) {
  await setDoc(doc(db, "settings", "team"), {
    members,
    updatedAt: new Date().toISOString()
  });
}

// ============================================
// USERS & ROLES
// ============================================
export async function getUsers() {
  try {
    const snap = await getDoc(doc(db, "settings", "users"));
    if (snap.exists() && snap.data().users) {
      return snap.data().users; // [{name, role, password, districts: []}]
    }
  } catch(e) {}
  return [];
}

export async function saveUsers(users) {
  await setDoc(doc(db, "settings", "users"), {
    users,
    updatedAt: new Date().toISOString()
  });
  // Keep legacy team list in sync for existing code
  const memberNames = users.map(u => u.name);
  await saveTeamMembers(memberNames);
}

export async function verifyUserLogin(name, password) {
  const users = await getUsers();
  const user = users.find(u => u.name === name);
  if (user && user.password === password) return user;
  return null;
}

// ============================================
// DISTRICTS
// ============================================
export async function getDistricts() {
  try {
    const snap = await getDoc(doc(db, "settings", "districts"));
    if (snap.exists() && snap.data().districts) {
      return snap.data().districts;
    }
  } catch(e) {}
  return [];
}

export async function saveDistricts(districts) {
  await setDoc(doc(db, "settings", "districts"), {
    districts,
    updatedAt: new Date().toISOString()
  });
}
