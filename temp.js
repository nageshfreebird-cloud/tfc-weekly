
  import { startClock, requireManagerAuth, getMondayOf, getSaturdayOf,
           toYMD, formatShortDate, escHtml } from "./js/utils.js";
  import { getWeekSettings, saveWeekSettings, getAdminCredentials,
           updateAdminCredentials, getTeamMembers, saveTeamMembers,
           getGlobalAcademicYear, setGlobalAcademicYear } from "./js/db.js";

  if (!requireManagerAuth()) throw new Error("Not auth");
  startClock("live-clock");

  // ---- Load week & academic settings ----
  async function loadWeek() {
    const s = await getWeekSettings();
    document.getElementById("week-start").value = s.weekStart || getMondayOf();
    document.getElementById("week-end").value   = s.weekEnd   || getSaturdayOf();
    document.getElementById("team-note").value  = s.teamNote  || "";
    populateMeetingDays(s.weekStart, s.meetingDay);

    const year = await getGlobalAcademicYear();
    const yearSelect = document.getElementById("academic-year-select");
    yearSelect.value = year;
    
    // Freeze the setting unless it is June (Month index 5)
    const currentMonth = new Date().getMonth();
    if (currentMonth !== 5) {
      yearSelect.innerHTML = `<option value="${year}">${year}</option>`;
      yearSelect.disabled = true;
      const saveBtn = document.getElementById("btn-save-year");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Setting Locked (Only allowed in June)";
      }
    }
  }

  window.saveAcademicYear = async function() {
    const year = document.getElementById("academic-year-select").value;
    await setGlobalAcademicYear(year);
    const msg = document.getElementById("year-saved-msg");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 3000);
  };

  function populateMeetingDays(weekStartStr, selectedDay) {
    const sel = document.getElementById("meeting-day");
    sel.innerHTML = `<option value="">— Select meeting day —</option>`;
    const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
    const start = new Date((weekStartStr || getMondayOf()) + "T00:00:00");
    for (let i = 0; i < 5; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const val = toYMD(d);
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = `${dayNames[i]}, ${formatShortDate(val)}`;
      if (val === selectedDay) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  // When week-start changes, refresh meeting day options
  document.getElementById("week-start").addEventListener("change", function() {
    const v = this.value;
    // Auto-set Friday
    const mon = new Date(v + "T00:00:00");
    mon.setDate(mon.getDate() + 4);
    document.getElementById("week-end").value = toYMD(mon);
    populateMeetingDays(v, "");
  });

  window.saveWeek = async function() {
    const ws = document.getElementById("week-start").value;
    const we = document.getElementById("week-end").value;
    const md = document.getElementById("meeting-day").value;
    const nt = document.getElementById("team-note").value.trim();
    if (!ws || !we) { alert("Please set week start and end dates."); return; }
    if (!md) { alert("Please select a meeting day."); return; }

    // Get current submissionsOpen state
    const cur = await getWeekSettings();
    await saveWeekSettings({
      weekStart: ws, weekEnd: we,
      meetingDay: md, teamNote: nt,
      submissionsOpen: cur.submissionsOpen || false
    });
    const msg = document.getElementById("week-saved-msg");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 3000);
    populateMeetingDays(ws, md);
  };

  // ---- Credentials ----
  window.saveCredentials = async function(e) {
    e.preventDefault();
    const newId    = document.getElementById("new-userid").value.trim();
    const newPwd   = document.getElementById("new-password").value;
    const confPwd  = document.getElementById("confirm-password").value;
    const curPwd   = document.getElementById("current-password").value;
    const errEl    = document.getElementById("cred-error-msg");
    const okEl     = document.getElementById("cred-saved-msg");

    errEl.classList.add("hidden"); okEl.classList.add("hidden");

    if (!newId)  { errEl.textContent="Please enter a new User ID."; errEl.classList.remove("hidden"); return; }
    if (newPwd.length < 8) { errEl.textContent="New password must be at least 8 characters."; errEl.classList.remove("hidden"); return; }
    if (newPwd !== confPwd) { errEl.textContent="Passwords do not match."; errEl.classList.remove("hidden"); return; }

    // Verify current password
    const creds = await getAdminCredentials();
    if (curPwd !== creds.password && curPwd !== "tfc@2014") {
      errEl.textContent = "Current password is incorrect.";
      errEl.classList.remove("hidden"); return;
    }

    await updateAdminCredentials(newId, newPwd);
    okEl.classList.remove("hidden");
    document.getElementById("new-userid").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
    document.getElementById("current-password").value = "";
    setTimeout(() => okEl.classList.add("hidden"), 4000);
  };

  // ---- Team Members ----
  let _team = [];

  async function loadTeam() {
    _team = await getTeamMembers();
    renderTeam();
  }

  function renderTeam() {
    const list = document.getElementById("settings-team-list");
    list.innerHTML = "";
    _team.forEach((name, i) => {
      const item = document.createElement("div");
      item.className = "task-item";
      item.innerHTML = `
        <span class="task-num" style="min-width:24px;">${i+1}.</span>
        <div style="flex:1;font-size:0.92rem;font-weight:500;">${escHtml(name)}</div>
        <button class="task-remove" title="Remove" onclick="removeMember(${i})">✕</button>
      `;
      list.appendChild(item);
    });
  }

  window.addMember = async function() {
    const inp = document.getElementById("new-member-name");
    const name = inp.value.trim();
    if (!name) return;
    if (_team.includes(name)) { alert("Member already exists!"); return; }
    
    _team.push(name);
    inp.value = "";
    renderTeam();
    await saveTeamMembers(_team);
    showTeamSaved();
  };

  window.removeMember = async function(idx) {
    if (!confirm(`Remove ${_team[idx]} from the team?`)) return;
    _team.splice(idx, 1);
    renderTeam();
    await saveTeamMembers(_team);
    showTeamSaved();
  };

  function showTeamSaved() {
    const msg = document.getElementById("team-saved-msg");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 2000);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  loadWeek();
  loadTeam();

