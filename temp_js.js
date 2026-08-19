  function renderDistricts() {
    const list = document.getElementById("district-list");
    list.innerHTML = "";
    
    const states = ["Telangana", "Andhra Pradesh", "Karnataka"];
    if (!districts || Array.isArray(districts)) {
      districts = { "Telangana": [], "Andhra Pradesh": [], "Karnataka": [] };
    }

    states.forEach(state => {
      const stateDistricts = districts[state] || [];
      
      let html = `
        <details class="state-group" style="margin-bottom:1rem; border:1px solid #e2e8f0; border-radius:0.5rem; overflow:hidden;">
          <summary style="padding:0.75rem 1rem; background:#f8fafc; cursor:pointer; font-weight:600; list-style:none; display:flex; justify-content:space-between; align-items:center;">
            <span>?? ${state} <span class="badge" style="background:#e2e8f0;color:#475569;font-size:0.75rem;padding:0.1rem 0.5rem;border-radius:1rem;">${stateDistricts.length}</span></span>
            <span style="font-size:0.8rem;color:#64748b;">?</span>
          </summary>
          <div style="padding:1rem;">
      `;
      
      if (stateDistricts.length === 0) {
        html += `<div class="text-muted text-sm" style="text-align:center; padding-bottom:1rem;">No districts added in ${state}.</div>`;
      } else {
        stateDistricts.forEach((d, i) => {
          html += `
            <div class="list-item" style="border-bottom:1px solid #f1f5f9; border-radius:0;">
              <strong>${d}</strong>
              <button class="btn btn-ghost btn-sm" onclick="removeDistrict('${state}', ${i})" style="color:var(--danger)">?</button>
            </div>
          `;
        });
      }
      
      html += `
            <div style="display:flex;gap:0.5rem; margin-top:1rem;">
              <input type="text" id="new-district-${state.replace(/\s+/g, '')}" class="form-control" placeholder="Add to ${state}" />
              <button class="btn btn-primary" onclick="addDistrict('${state}')">Add</button>
            </div>
          </div>
        </details>
      `;
      list.innerHTML += html;
    });
  }

  function renderDistrictCheckboxes() {
    const list = document.getElementById("assign-districts-list");
    list.innerHTML = "";
    
    const states = ["Telangana", "Andhra Pradesh", "Karnataka"];
    
    states.forEach(state => {
      const stateDistricts = districts[state] || [];
      if (stateDistricts.length === 0) return;
      
      let html = `
        <details style="margin-bottom:0.5rem;">
          <summary style="font-weight:bold; cursor:pointer; padding:0.25rem 0; color:#334155;">?? ${state}</summary>
          <div style="padding:0.5rem 0 0.5rem 1rem;">
      `;
      
      stateDistricts.forEach((d) => {
        html += `
          <label style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.25rem;">
            <input type="checkbox" value="${d}" class="district-cb" /> ${d}
          </label>
        `;
      });
      
      html += `</div></details>`;
      list.innerHTML += html;
    });
    
    if (list.innerHTML === "") {
      list.innerHTML = `<div class="text-muted text-sm">No districts added globally yet.</div>`;
    }
  }

  window.addDistrict = async function(state) {
    const inp = document.getElementById("new-district-" + state.replace(/\s+/g, ''));
    const val = inp.value.trim();
    if (!val) return;
    
    if (!districts[state]) districts[state] = [];
    
    // Check if exists globally to prevent duplicates across states
    let exists = false;
    for (const s of Object.keys(districts)) {
      if (districts[s].includes(val)) exists = true;
    }
    
    if (exists) { alert("District already exists in the system."); return; }
    
    districts[state].push(val);
    await saveDistricts(districts);
    inp.value = "";
    renderDistricts();
    renderDistrictCheckboxes();
  };

  window.removeDistrict = async function(state, i) {
    if (!confirm(`Remove this district from ${state}?`)) return;
    districts[state].splice(i, 1);
    await saveDistricts(districts);
    renderDistricts();
    renderDistrictCheckboxes();
  };

  function renderUsers() {
    const list = document.getElementById("team-list");
    list.innerHTML = "";
    if (users.length === 0) {
      list.innerHTML = `<div class="text-muted text-sm" style="padding:1rem;text-align:center;">No team members yet.</div>`;
    }
    users.forEach((u, i) => {
      list.innerHTML += `
        <div class="list-item" style="display:block;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
            <strong>${u.name}</strong>
            <div style="display:flex;gap:0.25rem;">
              <button class="btn btn-outline btn-sm" onclick="resetUserPassword('${u.name.replace(/'/g, "\\'")}')" title="Reset password to tfc@2014">?? Reset Pwd</button>
              <button class="btn btn-outline btn-sm" onclick="editUser(${i})">Edit</button>
              <button class="btn btn-ghost btn-sm" onclick="removeUser(${i})" style="color:var(--danger)">???</button>
            </div>
          </div>
          <div class="text-sm text-muted">Role: ${u.role === 'supervisor' ? 'Field Supervisor' : 'Other'}</div>
          ${u.role === 'supervisor' && u.districts && u.districts.length > 0 ? `<div class="text-sm" style="color:var(--primary)">?? ${u.districts.join(", ")}</div>` : ''}
        </div>
      `;
    });
  }

  window.editUser = function(i) {
    editUserIndex = i;
    const u = users[i];
    document.getElementById("form-title").textContent = "?? Edit Member: " + u.name;
    document.getElementById("tm-name").value = u.name;
    const role = u.role || 'supervisor';
    document.getElementById("tm-role").value = role;
    document.getElementById("tm-pwd").value = u.password || "tfc@2014";
    document.getElementById("district-assign-group").style.display = (role === 'supervisor') ? 'block' : 'none';
    
    document.getElementById("form-submit-btn").textContent = "Update Team Member";
    document.getElementById("form-cancel-btn").classList.remove("hidden");
    
    renderDistrictCheckboxes(); // re-render to free up their currently assigned districts
    
    // Check their boxes
    if (u.districts) {
      document.querySelectorAll(".district-cb").forEach(cb => {
        if (u.districts.includes(cb.value)) cb.checked = true;
      });
    }
  };

  window.resetUserPassword = async function(name) {
    if (confirm(`Are you sure you want to reset ${name}'s password back to tfc@2014?`)) {
      const idx = users.findIndex(u => u.name === name);
      if (idx !== -1) {
        users[idx].password = 'tfc@2014';
        await saveUsers(users);
        alert(`Password for ${name} has been reset to tfc@2014.`);
      }
    }
  };

  window.cancelEdit = function() {
    editUserIndex = -1;
    document.getElementById("form-title").textContent = "+ Add New Member";
    document.getElementById("tm-name").value = "";
    document.getElementById("tm-role").value = "supervisor";
    document.getElementById("tm-pwd").value = "tfc@2014";
    document.getElementById("district-assign-group").style.display = 'block';
    
    document.getElementById("form-submit-btn").textContent = "Save Team Member";
    document.getElementById("form-cancel-btn").classList.add("hidden");
    
    renderDistrictCheckboxes();
  };

  window.saveTeamMember = async function() {
    const name = document.getElementById("tm-name").value.trim();
    const role = document.getElementById("tm-role").value;
    const pwd = document.getElementById("tm-pwd").value.trim() || 'tfc@2014';
    
    if (!name || !pwd) { alert("Name and password are required."); return; }
    
    if (editUserIndex === -1 && users.find(u => u.name === name)) { 
      alert("User already exists!"); return; 
    }

    const assigned = [];
    if (role === 'supervisor') {
      document.querySelectorAll(".district-cb:checked").forEach(cb => assigned.push(cb.value));
    }

    if (editUserIndex > -1) {
      users[editUserIndex] = { name, role, password: pwd, districts: assigned };
    } else {
      users.push({ name, role, password: pwd, districts: assigned });
    }

    await saveUsers(users);
    cancelEdit();
    renderUsers();
  };

  window.removeUser = async function(i) {
    if (!confirm(`Delete user ${users[i].name}?`)) return;
    users.splice(i, 1);
    await saveUsers(users);
    renderUsers();
  };

  window.doLogout = function() {
    clearManagerSession();
    window.location.href = "index.html";
  };

  // Toggle district select based on role
  document.getElementById("tm-role").addEventListener("change", (e) => {
    document.getElementById("district-assign-group").style.display = (e.target.value === 'supervisor') ? 'block' : 'none';
  });
