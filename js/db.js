// ============================================
// TEACH FOR CHANGE — Firebase DB Operations
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs, onSnapshot, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";
import { DEFAULT_USER_ID, DEFAULT_PASSWORD, getMondayOf, getSaturdayOf, toYMD } from "./utils.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

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
  const defaultEnd = getSaturdayOf(today);

  let data = {
    weekStart:        currentMonday,
    weekEnd:          defaultEnd,
    meetingDay:       currentMonday,
    teamNote:         "",
    submissionsOpen:  false
  };

  try {
    const snap = await getDoc(doc(db, "settings", "week"));
    if (snap.exists()) {
      const dbData = snap.data();
      // Keep only dynamic settings; completely IGNORE saved dates to prevent bugs
      data.teamNote = dbData.teamNote || "";
      data.submissionsOpen = dbData.submissionsOpen || false;
    }
  } catch(e) {}
  
  return data;
}

export function getWeekDatesArray(mondayStr) {
  const days = [];
  const d = new Date(mondayStr + "T00:00:00");
  for (let i = 0; i < 6; i++) {
    days.push(toYMD(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
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
    const today = new Date();
    const currentMonday = getMondayOf(today);
    const defaultEnd = getSaturdayOf(today);

    let data = {
      weekStart:        currentMonday,
      weekEnd:          defaultEnd,
      meetingDay:       currentMonday,
      teamNote:         "",
      submissionsOpen:  false
    };

    if (snap.exists()) {
      const dbData = snap.data();
      data.teamNote = dbData.teamNote || "";
      data.submissionsOpen = dbData.submissionsOpen || false;
    }
    
    callback(data);
  });
}

// ============================================
// ACADEMIC YEAR
// ============================================
let _activeAcademicYear = null;

export async function getGlobalAcademicYear() {
  const sessionYear = sessionStorage.getItem("tfc_viewing_year");
  if (sessionYear) return sessionYear;

  if (_activeAcademicYear) return _activeAcademicYear;
  try {
    const snap = await getDoc(doc(db, "settings", "academic"));
    if (snap.exists() && snap.data().activeYear) {
      _activeAcademicYear = snap.data().activeYear;
      return _activeAcademicYear;
    }
  } catch(e) {}
  _activeAcademicYear = "2026-27";
  return _activeAcademicYear;
}

export async function setGlobalAcademicYear(year) {
  await setDoc(doc(db, "settings", "academic"), {
    activeYear: year,
    updatedAt: new Date().toISOString()
  });
  _activeAcademicYear = year;
  sessionStorage.removeItem("tfc_viewing_year"); // Reset viewing when changing global
}

export function setLocalViewingYear(year) {
  sessionStorage.setItem("tfc_viewing_year", year);
  _activeAcademicYear = year;
}

export async function getScopedCollection(baseName) {
  const year = await getGlobalAcademicYear();
  return collection(db, `${baseName}_${year}`);
}

export async function getScopedDoc(baseName, docId) {
  const year = await getGlobalAcademicYear();
  return doc(db, `${baseName}_${year}`, docId);
}

// ============================================
// SUBMISSIONS
// ============================================

/** Submit or update a member's weekly report */
export async function submitMemberReport(weekStart, memberName, data) {
  const id = `${weekStart}_${memberName.replace(/\s+/g,"_")}`;
  // Initialize completed tracking array
  const completed = data.thisWeekTasks ? data.thisWeekTasks.map(() => false) : [];
  
  const docRef = await getScopedDoc("submissions", id);
  await setDoc(docRef, {
    weekStart,
    memberName,
    submittedAt: new Date().toISOString(),
    thisWeekCompleted: completed,
    ...data
  });
}

/** Mark a single task as completed during the week */
export async function markTaskCompleted(weekStart, memberName, taskIndex, isDone = true) {
  const id = `${weekStart}_${memberName.replace(/\s+/g,"_")}`;
  const ref = await getScopedDoc("submissions", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    let completed = data.thisWeekCompleted || (data.thisWeekTasks ? data.thisWeekTasks.map(() => false) : []);
    completed[taskIndex] = isDone;
    await updateDoc(ref, { thisWeekCompleted: completed });
    
    // Also try to update it in the 'summaries' collection if it exists,
    // so the admin printout syncs up automatically.
    try {
      const sumRef = await getScopedDoc("summaries", weekStart);
      const sumSnap = await getDoc(sumRef);
      if (sumSnap.exists()) {
        const sumData = sumSnap.data();
        if (sumData.members && sumData.members[memberName]) {
          let memCompleted = sumData.members[memberName].thisWeekCompleted || 
                             (sumData.members[memberName].thisWeekTasks ? sumData.members[memberName].thisWeekTasks.map(() => false) : []);
          memCompleted[taskIndex] = isDone;
          sumData.members[memberName].thisWeekCompleted = memCompleted;
          await updateDoc(sumRef, { members: sumData.members });
        }
      }
    } catch(err) { console.error("Error syncing to summary:", err); }
  }
}

/** Get one member's submission for a week (robust lookup without requiring Firebase indexes) */
export async function getMemberSubmission(currentWeekStart, memberName) {
  const nameSafe = memberName.replace(/\s+/g,"_");
  const datesToCheck = getWeekDatesArray(currentWeekStart);

  for (const dateStr of datesToCheck) {
    let id = `${dateStr}_${nameSafe}`;
    let docRef = await getScopedDoc("submissions", id);
    let snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
  }
  
  return null;
}

/** Get the most recent submission for a member BEFORE a given date (safe lookup) */
export async function getLatestMemberSubmissionBefore(currentWeekStart, memberName) {
  // Query only by memberName to avoid needing a Firebase composite index
  const colRef = await getScopedCollection("submissions");
  const q = query(
    colRef,
    where("memberName", "==", memberName)
  );
  const snap = await getDocs(q);
  
  if (snap.empty) return null;

  // Filter and sort manually in Javascript
  let docs = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.weekStart < currentWeekStart) {
      docs.push(data);
    }
  });
  
  if (docs.length === 0) return null;

  docs.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return docs[0];
}

/** Delete a member's submission so they can resubmit */
export async function deleteMemberSubmission(weekStart, memberName) {
  const nameSafe = memberName.replace(/\s+/g,"_");
  const datesToCheck = getWeekDatesArray(weekStart);
  
  // Delete across any potential date in the week
  for (const dateStr of datesToCheck) {
    let id = `${dateStr}_${nameSafe}`;
    let docRef = await getScopedDoc("submissions", id);
    await deleteDoc(docRef);
  }
}

/** Get all submissions for a week */
export async function getWeekSubmissions(weekStart) {
  const dates = getWeekDatesArray(weekStart);
  const result = {};

  // 1. Fetch from legacy collection
  try {
    const legacyQ = query(collection(db, "submissions"), where("weekStart", "in", dates));
    const legacySnap = await getDocs(legacyQ);
    legacySnap.forEach(d => { result[d.data().memberName] = d.data(); });
  } catch(e) { console.error(e); }

  // 2. Fetch from scoped collection (overrides legacy)
  try {
    const colRef = await getScopedCollection("submissions");
    const q = query(colRef, where("weekStart", "in", dates));
    const snap = await getDocs(q);
    snap.forEach(d => { result[d.data().memberName] = d.data(); });
  } catch(e) { console.error(e); }

  return result;
}

/** Listen to all submissions for a week in real time */
export async function listenWeekSubmissions(weekStart, callback) {
  const dates = getWeekDatesArray(weekStart);
  
  const colRef = await getScopedCollection("submissions");
  const q = query(colRef, where("weekStart", "in", dates));
  
  const legacyQ = query(collection(db, "submissions"), where("weekStart", "in", dates));

  let scopedData = {};
  let legacyData = {};

  const emit = () => {
    callback({ ...legacyData, ...scopedData });
  };

  const unsubScoped = onSnapshot(q, snap => {
    scopedData = {};
    snap.forEach(d => { scopedData[d.data().memberName] = d.data(); });
    emit();
  }, err => console.error("Scoped submissions error:", err));

  const unsubLegacy = onSnapshot(legacyQ, snap => {
    legacyData = {};
    snap.forEach(d => { legacyData[d.data().memberName] = d.data(); });
    emit();
  }, err => console.error("Legacy submissions error:", err));

  return () => {
    unsubScoped();
    unsubLegacy();
  };
}

// ============================================
// MEETING SUMMARY (editable by admin)
// ============================================

/** Save edited summary */
export async function saveSummary(weekStart, summaryData) {
  const docRef = await getScopedDoc("summaries", weekStart);
  await setDoc(docRef, {
    weekStart,
    members: summaryData,
    finalized: false,
    savedAt: new Date().toISOString()
  });
}

/** Finalize summary */
export async function finalizeSummary(weekStart) {
  const docRef = await getScopedDoc("summaries", weekStart);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    await updateDoc(docRef, {
      finalized: true,
      finalizedAt: new Date().toISOString()
    });
  }
}

/** Get summary for a week */
export async function getSummary(weekStart) {
  const docRef = await getScopedDoc("summaries", weekStart);
  const snap = await getDoc(docRef);
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
    if (snap.exists() && Array.isArray(snap.data().members)) {
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
  let dbUsers = [];
  try {
    const snap = await getDoc(doc(db, "settings", "users"));
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.users)) {
        dbUsers = data.users;
      }
    }
  } catch(e) {}

  const legacyNames = [
    "Nagesh", "Sai Kiran", "Rajashekar", "Jai Ram",
    "Suresh", "Vamshi Krishna", "Swamy", "Chandrika", "Pratiksha"
  ];
  
  if (dbUsers.length === 0) {
    dbUsers = legacyNames.map(name => ({
      name: name,
      role: 'supervisor',
      password: 'tfc@2014',
      districts: []
    }));
  } else {
    for (let i = 0; i < legacyNames.length; i++) {
      let name = legacyNames[i];
      let exists = false;
      for (let j = 0; j < dbUsers.length; j++) {
        if (dbUsers[j].name === name) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        dbUsers.push({
          name: name,
          role: 'supervisor',
          password: 'tfc@2014',
          districts: []
        });
      }
    }
  }
  
  return dbUsers;
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

export async function updateUserPassword(name, newPassword) {
  const users = await getUsers();
  const idx = users.findIndex(u => u.name === name);
  if (idx !== -1) {
    users[idx].password = newPassword;
    await saveUsers(users);
    return true;
  }
  return false;
}

// ============================================
// DISTRICTS
// ============================================
export async function getDistricts() {
  const defaultStates = { "Telangana": [], "Andhra Pradesh": [], "Karnataka": [] };
  try {
    const snap = await getDoc(doc(db, "settings", "districts"));
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.districts) {
        if (Array.isArray(data.districts)) {
          // Migration from old flat list
          return { ...defaultStates, "Telangana": data.districts };
        } else if (typeof data.districts === "object") {
          return { ...defaultStates, ...data.districts };
        }
      }
    }
  } catch(e) {}
  return defaultStates;
}

export async function saveDistricts(districts) {
  await setDoc(doc(db, "settings", "districts"), {
    districts,
    updatedAt: new Date().toISOString()
  });
}

// ============================================
// PHASE 2: SCHOOLS, SYLLABUS, YEAR PLAN
// ============================================

/** Get all schools for a given district */
export async function getSchools(districtName) {
  try {
    if (!districtName) {
      const col = collection(db, "schools");
      const snap = await getDocs(col);
      let all = [];
      snap.forEach(d => { 
        if(d.data().list) {
          const list = d.data().list.map(s => {
            if(!s.District) s.District = d.id;
            return s;
          });
          all = all.concat(list);
        }
      });
      return all;
    }
    const snap = await getDoc(doc(db, "schools", districtName));
    if (snap.exists() && snap.data().list) {
      return snap.data().list.map(s => {
        if(!s.District) s.District = districtName;
        return s;
      });
    }
  } catch(e) { console.error("Error fetching schools", e); }
  return [];
}

export async function saveSchools(districtName, schools) {
  await setDoc(doc(db, "schools", districtName), {
    list: schools,
    updatedAt: new Date().toISOString()
  });
}

/** Get syllabus for a specific level (Level-1, Level-2, etc) */
export async function getSyllabus(level) {
  try {
    const snap = await getDoc(doc(db, "syllabus", level));
    if (snap.exists() && snap.data().topics) return snap.data().topics;
  } catch(e) {}
  return [];
}

export async function saveSyllabus(level, topics) {
  await setDoc(doc(db, "syllabus", level), {
    topics,
    updatedAt: new Date().toISOString()
  });
}

/** Get year plan for a specific supervisor */
export async function getYearPlan(supervisorName) {
  try {
    const snap = await getDoc(doc(db, "year_plans", supervisorName));
    if (snap.exists() && snap.data().plan) return snap.data().plan;
  } catch(e) {}
  return {}; // { "June": ["Task 1"], "July": [...] }
}

export async function saveYearPlan(supervisorName, plan) {
  await setDoc(doc(db, "year_plans", supervisorName), {
    plan,
    updatedAt: new Date().toISOString()
  });
}

// ============================================
// GOOGLE SHEETS LINKS (PHASE 5)
// ============================================

export async function saveSheetLinks(userName, linksArray) {
  await setDoc(doc(db, "google_sheets", userName), { links: linksArray, updatedAt: Date.now() });
}

export async function getSheetLinks(userName) {
  const snap = await getDoc(doc(db, "google_sheets", userName));
  return snap.exists() && snap.data().links ? snap.data().links : [];
}

export async function getAllSheetLinks() {
  const snap = await getDocs(collection(db, "google_sheets"));
  let allLinks = {};
  snap.forEach(d => {
    allLinks[d.id] = d.data().links || [];
  });
  return allLinks;
}

// --- PHASE 4: TEACHER CALLS & ASSESSMENTS ---

export async function saveTeacherCalls(supervisorName, distLevel, data) {
  const docRef = await getScopedDoc("teacher_calls", `${supervisorName}_${distLevel}`);
  await setDoc(docRef, { data, updatedAt: Date.now() });
}

export async function getTeacherCalls(supervisorName, distLevel) {
  const docRef = await getScopedDoc("teacher_calls", `${supervisorName}_${distLevel}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().data : {};
}

export async function getAllTeacherCalls() {
  const colRef = await getScopedCollection("teacher_calls");
  const snap = await getDocs(colRef);
  let all = {};
  snap.forEach(d => all[d.id] = d.data().data);
  return all;
}

export async function saveAssessments(supervisorName, distLevel, data) {
  const docRef = await getScopedDoc("assessments_received", `${supervisorName}_${distLevel}`);
  await setDoc(docRef, { data, updatedAt: Date.now() });
}

export async function getAssessments(supervisorName, distLevel) {
  const docRef = await getScopedDoc("assessments_received", `${supervisorName}_${distLevel}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().data : {};
}

export async function getAllAssessments() {
  const colRef = await getScopedCollection("assessments_received");
  const snap = await getDocs(colRef);
  let all = {};
  snap.forEach(d => all[d.id] = d.data().data);
  return all;
}

export async function saveDriveRecords(supervisorName, distLevel, data) {
  const docRef = await getScopedDoc("assessments_drive", `${supervisorName}_${distLevel}`);
  await setDoc(docRef, { data, updatedAt: Date.now() });
}

export async function getDriveRecords(supervisorName, distLevel) {
  const docRef = await getScopedDoc("assessments_drive", `${supervisorName}_${distLevel}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().data : {};
}

export async function getAllDriveRecords() {
  const colRef = await getScopedCollection("assessments_drive");
  const snap = await getDocs(colRef);
  let all = {};
  snap.forEach(d => all[d.id] = d.data().data);
  return all;
}
// ============================================
// PHASE 6: STUDENT ASSESSMENTS
// ============================================

export const SCHEMA_L1_L2 = [
  { id: "know", label: "KNOW", maxMarks: 10 },
  { id: "read", label: "READ", maxMarks: 8 },
  { id: "spell", label: "SPELL", maxMarks: 8 },
  { id: "cw_read", label: "CAMERA WORD READ", maxMarks: 12 },
  { id: "cw_spell", label: "CAMERA WORD SPELL", maxMarks: 12 }
];

export const SCHEMA_L3_L4 = [
  { id: "phonics", label: "Phonics", maxMarks: 10 },
  { id: "phono_aw", label: "Phonological Awareness", maxMarks: 10 },
  { id: "vocab", label: "Vocabulary", maxMarks: 10 },
  { id: "story", label: "Story Reading", maxMarks: 10 },
  { id: "sentences", label: "Make sentences", maxMarks: 10 }
];

export function getSchemaForLevel(level) {
  if (level === "Level-3" || level === "Level-4") return SCHEMA_L3_L4;
  return SCHEMA_L1_L2;
}

export async function saveStudentAssessments(district, school, className, data) {
  const cleanSchool = school.replace(/[^a-zA-Z0-9]/g, "_");
  const docRef = await getScopedDoc("student_assessments", `${district}_${cleanSchool}_${className}`);
  await setDoc(docRef, { data, updatedAt: Date.now() });
}

export async function getStudentAssessments(district, school, className) {
  const cleanSchool = school.replace(/[^a-zA-Z0-9]/g, "_");
  const docRef = await getScopedDoc("student_assessments", `${district}_${cleanSchool}_${className}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().data : [];
}

export async function getAllStudentAssessments() {
  const colRef = await getScopedCollection("student_assessments");
  const snap = await getDocs(colRef);
  let all = {};
  snap.forEach(d => { all[d.id] = d.data().data; });
  return all;
}

