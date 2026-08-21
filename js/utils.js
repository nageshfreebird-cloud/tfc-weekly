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

/** Returns Saturday of the week containing `date` as YYYY-MM-DD */
export function getSaturdayOf(date = new Date()) {
  const mon = new Date(getMondayOf(date) + "T00:00:00");
  mon.setDate(mon.getDate() + 5);
  return toYMD(mon);
}

/** Returns last week's Monday as YYYY-MM-DD */
export function getLastWeekMonday(date = new Date()) {
  const mon = new Date(getMondayOf(date) + "T00:00:00");
  mon.setDate(mon.getDate() - 7);
  return toYMD(mon);
}

/** Returns last week's Saturday as YYYY-MM-DD */
export function getLastWeekSaturday(date = new Date()) {
  const sat = new Date(getSaturdayOf(date) + "T00:00:00");
  sat.setDate(sat.getDate() - 7);
  return toYMD(sat);
}

/** YYYY-MM-DD string from Date (Local Timezone safe) */
export function toYMD(d) {
  const istDate = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const yr = istDate.getFullYear();
  const mo = String(istDate.getMonth() + 1).padStart(2, '0');
  const da = String(istDate.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
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

// ---- 15-Day Period Utilities ----

/** Returns the current 15-day period string (e.g. "Aug 1 - Aug 15" or "Aug 16 - Aug 31") */
export function getCurrent15DayPeriod(date = new Date()) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = months[date.getMonth()];
  const day = date.getDate();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  
  if (day <= 15) {
    return {
      label: `${m} 1 - ${m} 15`,
      startDate: toYMD(new Date(date.getFullYear(), date.getMonth(), 1)),
      endDate: toYMD(new Date(date.getFullYear(), date.getMonth(), 15))
    };
  } else {
    return {
      label: `${m} 16 - ${m} ${lastDay}`,
      startDate: toYMD(new Date(date.getFullYear(), date.getMonth(), 16)),
      endDate: toYMD(new Date(date.getFullYear(), date.getMonth(), lastDay))
    };
  }
}

/** Generates past periods counting backwards from a specific date */
export function generatePast15DayPeriods(count = 10, fromDate = new Date()) {
  const periods = [];
  const d = new Date(fromDate);
  
  for (let i = 0; i < count; i++) {
    periods.push(getCurrent15DayPeriod(d));
    // Jump back 15 days from the 1st of the month, or jump back to the 1st
    if (d.getDate() > 15) {
      d.setDate(1);
    } else {
      d.setDate(0); // Last day of previous month
    }
  }
  return periods;
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
    window.location.href = "index.html";
    return false;
  }
  return true;
}

export function goBackHome() {
  if (isManagerLoggedIn()) {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "index.html";
  }
}

export function buildStyledWorksheet(XLSX, schema, classDataList) {
  // classDataList = [ { className: "3rd class", students: [...] }, ... ]
  let aoa = [];
  
  // Header 1: Merged Blocks
  let row1 = ["S.NO", "NAME", "CLASS"];
  row1.push("BASELINE");
  for(let i=1; i<schema.length+1; i++) row1.push(""); // +1 for TOTAL column
  row1.push("MIDLINE");
  for(let i=1; i<schema.length+1; i++) row1.push("");
  row1.push("ENDLINE");
  for(let i=1; i<schema.length+1; i++) row1.push("");
  aoa.push(row1);

  // Header 2: Metrics
  let row2 = ["", "", ""];
  const addMetrics = () => {
    schema.forEach(p => row2.push(p.label + (p.maxMarks ? " ("+p.maxMarks+")" : "")));
    row2.push("TOTAL (50)");
  };
  addMetrics(); // Baseline
  addMetrics(); // Midline
  addMetrics(); // Endline
  aoa.push(row2);
  
  let merges = [];
  const slen = schema.length + 1; // including Total
  merges.push({s:{r:0,c:3}, e:{r:0,c:3+slen-1}});
  merges.push({s:{r:0,c:3+slen}, e:{r:0,c:3+(slen*2)-1}});
  merges.push({s:{r:0,c:3+(slen*2)}, e:{r:0,c:3+(slen*3)-1}});

  let currentRow = 2; // zero-indexed, row 0 and 1 are headers
  
  let redRows = [];
  let orangeRows = [];
  
  classDataList.forEach(cd => {
    if(!cd.students || cd.students.length === 0) return;
    
    // Class Header (Red Row)
    let classRow = [cd.className];
    for(let i=1; i<3+(slen*3); i++) classRow.push("");
    aoa.push(classRow);
    merges.push({s:{r:currentRow, c:0}, e:{r:currentRow, c:2+(slen*3)}});
    redRows.push(currentRow);
    currentRow++;
    
    // Students
    cd.students.forEach((st, idx) => {
      let r = [idx+1, st.name || "Unknown", cd.className.replace(" class", "").toUpperCase()];
      
      const calcTotal = (term) => {
         let tot = 0; let hasNumeric = false; let hasString = false; let strVal = "";
         schema.forEach(p => { 
            let val = st[term] ? st[term][p.id] : null; 
            if(val !== null && val !== undefined && val !== "" && val !== "-") { 
                let num = Number(val);
                if(!isNaN(num)) { tot += num; hasNumeric = true; }
                else { hasString = true; strVal = val; }
            }
         });
         if (hasNumeric) return tot;
         if (hasString) return strVal;
         return "-";
      };
      
      const addTerm = (term) => {
         schema.forEach(p => {
            let val = st[term] ? st[term][p.id] : "-";
            r.push(val !== undefined && val !== "" ? val : "-");
         });
         r.push(calcTotal(term));
      };
      
      addTerm("baseline");
      addTerm("midline");
      addTerm("endline");
      
      aoa.push(r);
      currentRow++;
    });
    
    // Averages (Orange Row)
    let avgRow = ["Averages", "", ""];
    const calcAvg = (term, pId) => {
       let sum = 0; let cnt = 0;
       cd.students.forEach(st => {
          let val = st[term] ? st[term][pId] : null;
          if(val !== null && val !== undefined && val !== "" && val !== "-") { 
             let num = Number(val);
             if(!isNaN(num)) { sum += num; cnt++; }
          }
       });
       return cnt > 0 ? (sum/cnt).toFixed(2) : "-";
    };
    
    const addAvgTerm = (term) => {
       schema.forEach(p => avgRow.push(calcAvg(term, p.id)));
       
       // Avg Total
       let totSum = 0; let totCnt = 0;
       cd.students.forEach(st => {
          let t = 0; let hasNumeric = false;
          schema.forEach(p => { 
             let val = st[term] ? st[term][p.id] : null; 
             if(val !== null && val !== undefined && val !== "" && val !== "-") { 
                let num = Number(val);
                if(!isNaN(num)) { t += num; hasNumeric = true; }
             }
          });
          if(hasNumeric) { totSum += t; totCnt++; }
       });
       avgRow.push(totCnt > 0 ? (totSum/totCnt).toFixed(2) : "-");
    };
    
    addAvgTerm("baseline");
    addAvgTerm("midline");
    addAvgTerm("endline");
    
    aoa.push(avgRow);
    orangeRows.push(currentRow);
    currentRow++;
  });
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  
  // Style definitions
  const borderAll = {
     top: {style:'thin', color:{auto:1}},
     bottom: {style:'thin', color:{auto:1}},
     left: {style:'thin', color:{auto:1}},
     right: {style:'thin', color:{auto:1}}
  };
  
  const styleHeader1 = (color) => ({
      fill: {fgColor: {rgb: color}},
      font: {bold: true, color: {rgb: (color === "FFC000" || color === "FEF08A") ? "000000" : "FFFFFF"}, sz: 11},
      alignment: {horizontal: "center", vertical: "center"},
      border: borderAll
  });
  
  const styleHeader2 = {
      fill: {fgColor: {rgb: "E2E8F0"}},
      font: {bold: true, sz: 10},
      alignment: {horizontal: "center", vertical: "center", wrapText: true},
      border: borderAll
  };
  
  const styleRedRow = {
      fill: {fgColor: {rgb: "FF0000"}},
      font: {bold: true, color: {rgb: "FFFFFF"}, sz: 11},
      alignment: {horizontal: "center", vertical: "center"},
      border: borderAll
  };
  
  const styleOrangeRow = {
      fill: {fgColor: {rgb: "F59E0B"}},
      font: {bold: true, sz: 10},
      alignment: {horizontal: "center", vertical: "center"},
      border: borderAll
  };
  
  const styleNormal = {
      alignment: {horizontal: "center", vertical: "center"},
      border: borderAll
  };
  
  const styleTotal = {
      fill: {fgColor: {rgb: "FEF08A"}},
      font: {bold: true},
      alignment: {horizontal: "center", vertical: "center"},
      border: borderAll
  };
  
  // Apply styles
  const range = XLSX.utils.decode_range(ws['!ref']);
  for(let R = range.s.r; R <= range.e.r; ++R) {
      for(let C = range.s.c; C <= range.e.c; ++C) {
          const cell_ref = XLSX.utils.encode_cell({c:C, r:R});
          if(!ws[cell_ref]) ws[cell_ref] = {t:'s', v:''};
          
          let s = {};
          
          if(R === 0) { // Row 1
             if(C >= 3 && C < 3+slen) s = styleHeader1("0000FF"); // Blue
             else if(C >= 3+slen && C < 3+(slen*2)) s = styleHeader1("F4B084"); // Peach
             else if(C >= 3+(slen*2)) s = styleHeader1("FFC000"); // Yellow (wait, they wanted yellow for endline text or background?) They used orange for midline, yellow for endline. I'll use exact hex.
             else s = styleHeader2;
          } 
          else if(R === 1) { // Row 2
             s = styleHeader2;
          }
          else if(redRows.includes(R)) { // Class Row
             s = styleRedRow;
          }
          else if(orangeRows.includes(R)) { // Averages Row
             s = styleOrangeRow;
          }
          else { // Student rows
             s = Object.assign({}, styleNormal);
             // Highlight total columns
             if((C - 2) % slen === 0 && C >= 3) {
                s = styleTotal;
             }
          }
          ws[cell_ref].s = s;
      }
  }
  
  // Column widths
  let wscols = [{wch:5}, {wch:25}, {wch:8}];
  for(let i=0; i<slen*3; i++) wscols.push({wch:12});
  ws['!cols'] = wscols;

  return ws;
}