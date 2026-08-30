
  import { startClock, buildStyledWorksheet } from "./js/utils.js";
  import { getUsers, getSchools, getSchemaForLevel, saveStudentAssessments, getStudentAssessments, saveSyncCode, getDistricts } from "./js/db.js";

  const userName = sessionStorage.getItem("tfc_member_name");
  const userRole = sessionStorage.getItem("tfc_member_role");

  if (!userName || (userRole !== 'supervisor' && userRole !== 'associate-sc')) {
    window.location.href = "index.html";
  }

    // Immediately show state filter for associate-sc to prevent layout pop-in
    if (sessionStorage.getItem('tfc_member_role') === 'associate-sc') {
        const stateContainer = document.getElementById('state-filter-container');
        if (stateContainer) stateContainer.style.display = 'block';
    }


  startClock("live-clock");

  document.getElementById("welcome-name").textContent = "👤 " + userName;

  let myUser = null;
  let currentClass = "3rd class";
  let currentGridData = [];
  let currentSchema = [];

  window.doLogout = function() {
    sessionStorage.clear();
    window.location.href = "index.html";
  }

  startClock("live-clock");

  let allStatesData = {};
  async function init() {
    const users = await getUsers();
    myUser = users.find(u => u.name === userName);
    if (!myUser || (myUser.role !== 'associate-sc' && (!myUser.districts || myUser.districts.length === 0))) return;

    
      if (myUser && myUser.role === 'associate-sc') {
          document.getElementById('state-filter-container').style.display = 'block';
          allStatesData = await getDistricts();
          const stateSel = document.getElementById("state-select");
          if (stateSel) {
              Object.keys(allStatesData).forEach(s => {
                  stateSel.innerHTML += `<option value="${s}">${s}</option>`;
              });
          }
      }

      window.updateViewDistricts(false);
  }

  
    window.updateViewDistricts = function(callLoad = true) {
      const st = document.getElementById("state-select").value;
      const distSel = document.getElementById("sel-dist");
      
      // Preserve the original placeholder
      const firstOpt = distSel.options[0].text;
      distSel.innerHTML = `<option value="">${firstOpt}</option>`;
      
      let allowedDists = myUser && myUser.districts ? myUser.districts : [];
      let stateDists = [];
      
      if (st && allStatesData[st]) {
        stateDists = allStatesData[st];
      } else {
        Object.values(allStatesData).forEach(arr => stateDists = stateDists.concat(arr));
      }
      
      let distsToShow = stateDists;
      if (myUser && myUser.role === 'supervisor') {
         distsToShow = stateDists.filter(d => allowedDists.includes(d));
      } else if (myUser && myUser.role === 'associate-sc') {
         distsToShow = stateDists;
      }
      
      distsToShow.filter(d => !d.toLowerCase().includes("select")).forEach(d => distSel.innerHTML += `<option value="${d}">${d}</option>`);
      
      if(callLoad && window.loadSchools) window.loadSchools();
    };

  window.loadSchools = async function() {
    const dist = document.getElementById("sel-dist").value;
    const lvl = document.getElementById("sel-level").value;
    const schSel = document.getElementById("sel-school");
    schSel.innerHTML = '<option value="">Select School</option>';
    document.getElementById("grid-container").style.display = "none";
    
    if (!dist) return;
    
    let schools = await getSchools(dist);
    schools = schools.filter(s => s.Level === lvl);
    
    schools.forEach(s => {
      schSel.innerHTML += `<option value="${s['School Name']}">${s['School Name']}</option>`;
    });
  };

  window.switchClass = function(clsName) {
    document.querySelectorAll('.class-tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    currentClass = clsName;
    loadGrid();
  };

  function renderHeaders() {
    const lvl = document.getElementById("sel-level").value;
    currentSchema = getSchemaForLevel(lvl);
    
    const thead = document.getElementById("grid-head");
    let html = `<tr>
      <th style="width:50px;">S.No</th>
      <th style="width:200px;">Student Name</th>`;
    
    currentSchema.forEach(param => {
      html += `<th>${param.label}<br/>(${param.maxMarks})</th>`;
    });
    
    html += `<th>TOTAL (50)</th><th style="width:150px;">Comprehension Level</th></tr>`;
    thead.innerHTML = html;
  }

  window.loadGrid = async function() {
    const term = document.getElementById("sel-term").value;
    const termLabel = document.getElementById("report-term-label");
    if(termLabel) termLabel.innerText = term.charAt(0).toUpperCase() + term.slice(1);

    const dist = document.getElementById("sel-dist").value;
    const school = document.getElementById("sel-school").value;
    
    if (!dist || !school) {
      document.getElementById("grid-container").style.display = "none";
      return;
    }
    
    document.getElementById("grid-container").style.display = "block";
    renderHeaders();
    
    const data = await getStudentAssessments(dist, school, currentClass);
    
    currentGridData = [];
    if (data.length === 0) {
      for(let i=1; i<=10; i++) currentGridData.push({ sno: i, name: "", scores: {} });
    } else {
      currentGridData = JSON.parse(JSON.stringify(data));
    }
    
    drawGrid();
  };

      function drawGrid() {
    const tbody = document.getElementById("grid-body");
    const term = document.getElementById("sel-term").value;
    tbody.innerHTML = "";
    
    let allRowsHtml = "";
    
    currentGridData.forEach((row, rIdx) => {
      let trHtml = "<tr>";
      
      trHtml += `<td><input type="text" data-row="${rIdx}" data-col="sno" value="${row.sno || ''}" onchange="updateData(this)" onpaste="handlePaste(event, this)"/></td>`;
      trHtml += `<td><input type="text" class="col-name" data-row="${rIdx}" data-col="name" value="${row.name || ''}" onchange="updateData(this)" onpaste="handlePaste(event, this)"/></td>`;
      
      let total = 0;
      let isAbsent = false;
      currentSchema.forEach((param, cIdx) => {
        let val = "";
        if (row[term] && row[term][param.id] !== undefined) {
          val = row[term][param.id];
          if (cIdx === 0 && val.toString().toLowerCase() === "a") isAbsent = true;
          else if (!isAbsent) total += Number(val) || 0;
        }
        let roAttr = (isAbsent && cIdx > 0) ? "readonly" : "";
        trHtml += `<td><input type="text" data-max="${param.maxMarks}" data-row="${rIdx}" data-col="${param.id}" value="${val}" ${roAttr} onchange="updateData(this)" onpaste="handlePaste(event, this)"/></td>`;
      });
      
      trHtml += `<td><input type="text" class="col-total" readonly value="${isAbsent ? 'Absent' : (total || '')}"/></td>`;
      
      let remark = "";
      if (row[term] && row[term].remarks !== undefined) remark = row[term].remarks;
      trHtml += `<td><input type="text" class="col-remarks" data-row="${rIdx}" data-col="remarks" value="${remark}" onchange="updateData(this)" onpaste="handlePaste(event, this)"/></td>`;
      
      trHtml += "</tr>";
      allRowsHtml += trHtml;
    });
    tbody.innerHTML = allRowsHtml;
  }

  window.updateData = function(inputEl) {
    const rIdx = inputEl.getAttribute("data-row");
    const col = inputEl.getAttribute("data-col");
    const term = document.getElementById("sel-term").value;
    const tr = inputEl.closest("tr");
    
    if (col === "sno" || col === "name") {
      currentGridData[rIdx][col] = inputEl.value;
    } else {
      if (!currentGridData[rIdx][term]) currentGridData[rIdx][term] = {};
      
      let paramObj = currentSchema.find(p => p.id === col);
      if (paramObj) {
        let val = inputEl.value.trim();
        let isFirstCol = (currentSchema[0].id === col);
        
        if (isFirstCol && val.toLowerCase() === "a") {
          currentGridData[rIdx][term][col] = "A";
          inputEl.value = "A";
          
          currentSchema.forEach((p, idx) => {
            if (idx > 0) {
              currentGridData[rIdx][term][p.id] = "";
              let childInput = tr.querySelector(`input[data-col="${p.id}"]`);
              if (childInput) {
                childInput.value = "";
                childInput.setAttribute("readonly", "true");
              }
            }
          });
          
          tr.querySelector(".col-total").value = "Absent";
        } else {
          let max = Number(inputEl.getAttribute("data-max"));
          let numVal = Number(val);
          
          if (val.toLowerCase() === "a" && !isFirstCol) {
             alert("Absent (A) can only be entered in the first column.");
             inputEl.value = currentGridData[rIdx][term][col] || "";
             return;
          }
          
          if (val !== "" && (isNaN(numVal) || numVal < 0 || numVal > max)) {
            alert(`Please enter a valid number between 0 and ${max}`);
            inputEl.value = currentGridData[rIdx][term][col] || "";
            return;
          }
          
          currentGridData[rIdx][term][col] = val;
          
          if (isFirstCol) {
             currentSchema.forEach((p, idx) => {
               if (idx > 0) {
                 let childInput = tr.querySelector(`input[data-col="${p.id}"]`);
                 if (childInput) childInput.removeAttribute("readonly");
               }
             });
          }
          
          let total = 0;
          currentSchema.forEach(p => {
             let pval = currentGridData[rIdx][term][p.id];
             if (pval !== undefined && pval !== "" && pval.toString().toLowerCase() !== "a") {
                total += Number(pval);
             }
          });
          tr.querySelector(".col-total").value = total || "";
        }
      } else {
        currentGridData[rIdx][term][col] = inputEl.value;
      }
    }
    window.triggerAutoSave();
  };
  window.addRow = function() {
    currentGridData.push({ sno: currentGridData.length + 1, name: "", scores: {} });
    drawGrid();
  };

  window.handlePaste = function(e, inputEl) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pasteData.split(/\r?\n/).filter(r => r.trim() !== "");
    const startRow = parseInt(inputEl.getAttribute("data-row"));
    const colName = inputEl.getAttribute("data-col");
    let startColIdx = 0;
    
    if (colName === "name") startColIdx = 1;
    else if (colName === "remarks") startColIdx = 2 + currentSchema.length;
    else if (colName !== "sno") {
      startColIdx = 2 + currentSchema.findIndex(p => p.id === colName);
    }
    const term = document.getElementById("sel-term").value;

    rows.forEach((rowStr, i) => {
      const cells = rowStr.split('\t');
      const rIdx = startRow + i;
      while(rIdx >= currentGridData.length) currentGridData.push({ sno: currentGridData.length + 1, name: "", scores: {} });
      
      cells.forEach((cellVal, j) => {
        const cIdx = startColIdx + j;
        const val = cellVal.trim();
        if (cIdx === 0) currentGridData[rIdx].sno = val;
        else if (cIdx === 1) currentGridData[rIdx].name = val;
        else if (cIdx >= 2 && cIdx < 2 + currentSchema.length) {
          const paramId = currentSchema[cIdx-2].id;
          if (!currentGridData[rIdx][term]) currentGridData[rIdx][term] = {};
          currentGridData[rIdx][term][paramId] = val;
        }
        else if (cIdx === 2 + currentSchema.length) { // past the total column technically, or just past parameters
          // Wait, Excel has TOTAL column. So Remarks is actually at 2 + schema.length + 1
        }
      });
    });
    
    // Proper paste logic for Remarks considering Total column offset:
    // If they copy from Excel, Excel has TOTAL at index `2 + schema.length`.
    // Remarks is at `2 + schema.length + 1`.
    rows.forEach((rowStr, i) => {
      const cells = rowStr.split('\t');
      const rIdx = startRow + i;
      cells.forEach((cellVal, j) => {
        const cIdx = startColIdx + j;
        const val = cellVal.trim();
        if (cIdx === 3 + currentSchema.length) { // 2 params + schema length + 1 (total) = 3 + length
           if (!currentGridData[rIdx][term]) currentGridData[rIdx][term] = {};
           currentGridData[rIdx][term].remarks = val;
        }
      });
    });

    drawGrid();
  };

  let autoSaveTimer = null;

  window.triggerAutoSave = function() {
     const status = document.getElementById("save-status");
     if(status) {
       status.style.color = "var(--text-muted)";
       status.innerHTML = "⏳ Saving changes...";
     }
     
     if (autoSaveTimer) clearTimeout(autoSaveTimer);
     autoSaveTimer = setTimeout(async () => {
        await executeSave();
     }, 1500);
  };

  window.executeSave = async function() {
    const dist = document.getElementById("sel-dist").value;
    const school = document.getElementById("sel-school").value;
    if (!dist || !school || !currentClass) return;
    
    const validData = currentGridData.filter(r => r.name && r.name.trim() !== "");
    const status = document.getElementById("save-status");
    
    try {
      await saveStudentAssessments(dist, school, currentClass, validData);
      if(status) {
         status.style.color = "#10b981"; // success green
         status.innerHTML = "✓ All changes saved";
      }
    } catch(err) {
      console.error(err);
      if(status) {
         status.style.color = "var(--danger)";
         status.innerHTML = "❌ Error saving data. Check connection.";
      }
    }
  };

  window.downloadTemplate = function() {
    const term = document.getElementById("sel-term").value;
    const headers = ["S.No", "Student Name"];
    currentSchema.forEach(p => headers.push(`${p.label} (${p.maxMarks})`));
    headers.push("Total (50)", "Comprehension Level");
    
    const exportData = [];
    currentGridData.forEach(r => {
      if (!r.name) return;
      let row = [r.sno, r.name];
      let total = 0;
      currentSchema.forEach(p => {
        let val = r[term] && r[term][p.id] ? r[term][p.id] : "";
        row.push(val);
        if (val) total += Number(val);
      });
      row.push(total);
      row.push(r[term] && r[term].remarks ? r[term].remarks : "");
      exportData.push(row);
    });
    if (exportData.length === 0) exportData.push([1, "", "", "", "", "", "", ""]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `${document.getElementById("sel-school").value}_${currentClass}_${term}.xlsx`);
  };

  window.handleExcelUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const term = document.getElementById("sel-term").value;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      for (let i = 1; i < data.length; i++) {
        let rowData = data[i];
        if (!rowData || rowData.length === 0) continue;
        let sno = rowData[0];
        let name = rowData[1];
        if (!name) continue;
        
        let rIdx = currentGridData.findIndex(r => r.name === name || r.sno == sno);
        if (rIdx === -1) {
          rIdx = currentGridData.length;
          currentGridData.push({ sno: sno || rIdx+1, name: name });
        }
        if (!currentGridData[rIdx][term]) currentGridData[rIdx][term] = {};
        
        currentSchema.forEach((param, pIdx) => {
          let score = rowData[2 + pIdx];
          if (score !== undefined && score !== "") currentGridData[rIdx][term][param.id] = score;
        });
        
        // remarks is after schema and total
        let remarks = rowData[2 + currentSchema.length + 1];
        if (remarks !== undefined && remarks !== "") currentGridData[rIdx][term].remarks = remarks;
      }
      drawGrid();
      e.target.value = "";
      alert("Excel data mapped successfully!");
      window.triggerAutoSave();
    };
    reader.readAsBinaryString(file);
  };

  init();

  async function getSchoolAverages(dist, school) {
    let schoolData = { District: dist, Mandal: dist, School_Name: school, classes: {} };
    const classList = ["3rd class", "4th class", "5th class"];
    const classNum = [3, 4, 5];
    
    for(let i=0; i<3; i++) {
      const data = await getStudentAssessments(dist, school, classList[i]);
      let counts = { assessedCount: 0 };
      let phases = { baseline: { KNOW: 0, READ: 0, SPELL: 0, CWR: 0, CWS: 0, Total: 0, count: 0 },
                     midline: { KNOW: 0, READ: 0, SPELL: 0, CWR: 0, CWS: 0, Total: 0, count: 0 },
                     endline: { KNOW: 0, READ: 0, SPELL: 0, CWR: 0, CWS: 0, Total: 0, count: 0 } };
                     
      if(data) {
        data.forEach(st => {
          let assessed = false;
          Object.keys(phases).forEach(ph => {
            if(st[ph]) {
              const sc = st[ph];
              if(sc['phonics'] !== undefined && sc['phonics'] !== 'A' && sc['phonics'] !== 'a' && sc['phonics'] !== '') {
                assessed = true;
                const k = Number(sc['phonics']||0), r = Number(sc['phono_aw']||0), s = Number(sc['vocab']||0), cr = Number(sc['story']||0), cs = Number(sc['sentences']||0);
                phases[ph].KNOW += k; phases[ph].READ += r; phases[ph].SPELL += s; phases[ph].CWR += cr; phases[ph].CWS += cs;
                phases[ph].Total += (k+r+s+cr+cs);
                phases[ph].count++;
              }
            }
          });
          if(assessed) counts.assessedCount++;
        });
      }
      
      let res = { assessedCount: counts.assessedCount, baseline: {}, midline: {}, endline: {} };
      Object.keys(phases).forEach(ph => {
        let c = phases[ph].count;
        res[ph] = {
          KNOW: c > 0 ? Number((phases[ph].KNOW/c).toFixed(2)) : 0,
          READ: c > 0 ? Number((phases[ph].READ/c).toFixed(2)) : 0,
          SPELL: c > 0 ? Number((phases[ph].SPELL/c).toFixed(2)) : 0,
          CWR: c > 0 ? Number((phases[ph].CWR/c).toFixed(2)) : 0,
          CWS: c > 0 ? Number((phases[ph].CWS/c).toFixed(2)) : 0,
          Total: c > 0 ? Number((phases[ph].Total/c).toFixed(2)) : 0
        };
      });
      schoolData.classes[classNum[i]] = res;
    }
    return schoolData;
  }

  window.downloadDistrictData = async function() {
    const dist = document.getElementById("sel-dist").value;
    const level = document.getElementById("sel-level").value;
    
    if(!dist || !level) {
      Swal.fire("Error", "Please select a district and level first.", "error");
      return;
    }
    
    Swal.fire({ title: 'Compiling Data...', text: 'Fetching all schools and students...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      let allSchools = await getSchools(dist);
      allSchools = allSchools.filter(s => s.Level === level && s['School Name']);
      
      const wb = XLSX.utils.book_new();
      const schema = getSchemaForLevel(level);
      
      for(let i=0; i<allSchools.length; i++) {
         const sch = allSchools[i];
         const schoolName = sch['School Name'];
         const cleanSchool = schoolName.replace(/[^a-zA-Z0-9]/g, "_");
         
         let classDataList = [];
         const classList = ["3rd class", "4th class", "5th class"];
         
         for(let cIdx=0; cIdx<classList.length; cIdx++) {
            const cls = classList[cIdx];
            const students = await getStudentAssessments(dist, schoolName, cls);
            if(students && students.length > 0) {
               classDataList.push({ className: cls, students: students });
            }
         }
         
         if(classDataList.length > 0) {
            const ws = buildStyledWorksheet(XLSX, schema, classDataList);
            let sheetName = schoolName.substring(0, 31);
            let suffix = 1; let origName = sheetName;
            while(wb.SheetNames.includes(sheetName)) { sheetName = origName.substring(0, 28) + "_" + suffix; suffix++; }
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
         }
      }
      
      if(wb.SheetNames.length === 0) {
         Swal.fire("Info", "No student data found for the selected district and level.", "info");
         return;
      }
      
      const fileName = `${dist}_${level}_Student_Assessments.xlsx`;
      XLSX.writeFile(wb, fileName);
      Swal.close();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to compile data.", "error");
    }
  };
  window.downloadAverages = async function() {
    const dist = document.getElementById("sel-dist").value;
    const level = document.getElementById("sel-level").value;
    const term = document.getElementById("sel-term").value;
    
    if(!dist || !level) {
      Swal.fire("Error", "Please select a district and level first.", "error");
      return;
    }
    
    Swal.fire({ title: 'Compiling Averages...', text: 'Fetching all schools in district...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      let allSchools = await getSchools(dist);
      allSchools = allSchools.filter(s => s.Level === level && s['School Name']);
      
      
        const bAll = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
        const hdrBase = { fill: {fgColor:{rgb:"FFFF00"}}, font: {bold:true}, alignment: {horizontal:"center"}, border: bAll };
        const hdrMid = { fill: {fgColor:{rgb:"FF0000"}}, font: {bold:true, color:{rgb:"FFFFFF"}}, alignment: {horizontal:"center"}, border: bAll };
        const hdrEnd = { fill: {fgColor:{rgb:"00B050"}}, font: {bold:true, color:{rgb:"FFFFFF"}}, alignment: {horizontal:"center"}, border: bAll };
        const hdrSub = { fill: {fgColor:{rgb:"F2F2F2"}}, font: {bold:true}, alignment: {horizontal:"center"}, border: bAll };
        
        const row1 = [
           {v:"District", s:hdrSub}, {v:"Mandal", s:hdrSub}, {v:"Name of the School", s:hdrSub}, {v:"Class", s:hdrSub}, {v:"Total students access", s:hdrSub},
           {v:"BASE LINE", s:hdrBase}, "","","","","", "",
           {v:"MID LINE", s:hdrMid}, "","","","","", "",
           {v:"END LINE", s:hdrEnd}, "","","","",""
        ];
        
        const subH = ["KNOW", "READ", "SPELL", "C.W.R", "C.W.S", "Total"];
        const row2 = ["","","","",""]; // First 5 empty
        subH.forEach(h => row2.push({v:h, s:hdrSub}));
        row2.push(""); // empty between base and mid
        subH.forEach(h => row2.push({v:h, s:hdrSub}));
        row2.push(""); // empty between mid and end
        subH.forEach(h => row2.push({v:h, s:hdrSub}));
        
        let aoa = [row1, row2];

      
      for(let i=0; i<allSchools.length; i++) {
         const sItem = allSchools[i];
         const schoolName = sItem['School Name'];
         const mandal = sItem['Mandal Name'] || sItem.Mandal || "";
         
         if (!schoolName) continue;
         
         const schoolData = await getSchoolAverages(dist, schoolName);
         
         [3, 4, 5].forEach(c => {
            const d = schoolData.classes[c] || {};
            const clsName = c === 3 ? "3rd class" : c === 4 ? "4th class" : "5th class";
            
            const b = d.baseline || {};
            const bT = (b.KNOW||0)+(b.READ||0)+(b.SPELL||0)+(b.CWR||0)+(b.CWS||0);
            const m = d.midline || {};
            const mT = (m.KNOW||0)+(m.READ||0)+(m.SPELL||0)+(m.CWR||0)+(m.CWS||0);
            const e = d.endline || {};
            const eT = (e.KNOW||0)+(e.READ||0)+(e.SPELL||0)+(e.CWR||0)+(e.CWS||0);

            let row = [];
            if (c === 3) row.push(dist, mandal, schoolName);
            else row.push("", "", "");
            
            row.push(clsName);
            row.push(d.assessedCount || 0);
            
            row.push((b.KNOW||0).toFixed(2), (b.READ||0).toFixed(2), (b.SPELL||0).toFixed(2), (b.CWR||0).toFixed(2), (b.CWS||0).toFixed(2), bT.toFixed(2));
            row.push("");
            
            if(term === 'midline' || term === 'endline') {
               row.push((m.KNOW||0).toFixed(2), (m.READ||0).toFixed(2), (m.SPELL||0).toFixed(2), (m.CWR||0).toFixed(2), (m.CWS||0).toFixed(2), mT.toFixed(2));
            } else {
               row.push("", "", "", "", "", "");
            }
            row.push("");
            
            if(term === 'endline') {
               row.push((e.KNOW||0).toFixed(2), (e.READ||0).toFixed(2), (e.SPELL||0).toFixed(2), (e.CWR||0).toFixed(2), (e.CWS||0).toFixed(2), eT.toFixed(2));
            } else {
               row.push("", "", "", "", "", "");
            }
            row.push("", "", "", "");
            
            
              // Style the data row
              const bAll = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
              const cellStyle = { border: bAll, alignment: {horizontal:"center"} };
              const styledRow = row.map(cell => (cell === "" ? "" : {v: cell, s: cellStyle}));
              aoa.push(styledRow);

         });
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report_Averages");
      
      const fileName = `${dist}_${level}_${term}_Report_Averages.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      Swal.fire({
        title: 'Success!',
        text: `Successfully downloaded ${fileName} containing averages for ${allSchools.length} schools.`,
        icon: 'success'
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to generate data: " + err.message, "error");
    }
  };

  window.generateHMReport = async function() {
    const dist = document.getElementById("sel-dist").value;
    const school = document.getElementById("sel-school").value;
    const term = document.getElementById("sel-term").value;
    const termLabel = term.charAt(0).toUpperCase() + term.slice(1);
    
    if(!dist || !school) {
      Swal.fire("Error", "Please select a district and school first.", "error");
      return;
    }
    
    Swal.fire({ title: 'Generating Report...', text: 'Please wait...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const schoolData = await getSchoolAverages(dist, school);

      const container = document.createElement('div');
      container.id = 'print-root';
      document.body.appendChild(container);
      
      const config = {
        phases: {
          Baseline: { 
            aboutText: "The Baseline Assessment is conducted in the beginning of the smart classroom program of Teach For Change. In this assessment, the students are individually assessed in 5 parameters of English Language Literacy.",
            nextStepsTitle: "Next Steps",
            nextStepsBullets: []
          },
          Midline: { 
            aboutText: "The Midline Assessment is conducted in the mid of year of the smart classroom program of Teach For Change. In this assessment, the students are individually assessed in 5 parameters of English Language Literacy.",
            nextStepsTitle: "Next Steps",
            nextStepsBullets: [
              "Focus on phonics and small group help.",
              "Make classrooms rich with reading books.",
              "Train teachers on effective ESL methods."
            ]
          },
          Endline: { 
            aboutText: "The Endline Assessment is conducted at the end of the year of the smart classroom program of Teach For Change. In this assessment, the students are individually assessed in 5 parameters of English Language Literacy.",
            nextStepsTitle: "Next Steps",
            nextStepsBullets: [
              "Focus on phonics and small group help.",
              "Make classrooms rich with reading books.",
              "Train teachers on effective ESL methods."
            ]
          }
        }
      };

      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(window.SchoolReportPDF, {
         school: schoolData,
         phase: termLabel,
         config: config
      }));

      setTimeout(() => {
        const reportElement = document.getElementById(`pdf-report-${schoolData.School_Name}`);
        if(!reportElement) {
          Swal.fire("Error", "Could not render report. Check console for details.", "error");
          root.unmount();
          document.body.removeChild(container);
          return;
        }
        
        // Use native window.print()
        Swal.close();
        window.print();
        
        // Cleanup after print dialog is closed
        setTimeout(() => {
          root.unmount();
          document.body.removeChild(container);
        }, 500);

      }, 1500); // 1.5 seconds to let Recharts animations finish

    } catch(err) {
      console.error(err);
      Swal.fire("Error", "Failed to generate report: " + err.message, "error");
    }
  };

  window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.toggle('active');
    if(overlay) overlay.classList.toggle('active');
  };
