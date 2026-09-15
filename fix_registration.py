import re

with open("attendance.html", "r", encoding="utf-8") as f:
    html = f.read()

# We need to replace the card.innerHTML assignment to include the Register button.
old_template = """      card.innerHTML = `
        <div class="user-info">
          <div class="user-name">${u.name}</div>
          <div class="user-role">${roleDisplay}</div>
        </div>
        <div class="btn-group">
          <button id="btn-in-${cleanName}" class="btn-in ${inActive}" onclick="window.punchAttendance('${u.name}', 'IN')">IN</button>
          <button id="btn-out-${cleanName}" class="btn-out ${outActive}" onclick="window.punchAttendance('${u.name}', 'OUT')">OUT</button>
        </div>
      `;"""

new_template = """      const isRegistered = !!u.faceDescriptor;
      const regBtnText = isRegistered ? "✅ Re-Register" : "📸 Register Face";
      const regBtnStyle = isRegistered ? "background: transparent; color: var(--text-muted); font-size: 0.75rem; border: 1px solid var(--border);" : "background: var(--pending-light); color: var(--pending); font-size: 0.75rem; border: 1px solid var(--pending);";
      
      card.innerHTML = `
        <div class="user-info">
          <div class="user-name">${u.name}</div>
          <div class="user-role">${roleDisplay}</div>
          <button onclick="window.registerFace('${u.name}')" style="margin-top: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; ${regBtnStyle}">${regBtnText}</button>
        </div>
        <div class="btn-group">
          <button id="btn-in-${cleanName}" class="btn-in ${inActive}" onclick="window.punchAttendance('${u.name}', 'IN')">IN</button>
          <button id="btn-out-${cleanName}" class="btn-out ${outActive}" onclick="window.punchAttendance('${u.name}', 'OUT')">OUT</button>
        </div>
      `;"""

if 'card.innerHTML = `' in html:
    # Use regex to do a safer replacement, ignoring exact whitespace
    pattern = re.compile(r'card\.innerHTML\s*=\s*`\s*<div class="user-info">.*?</div>\s*`;', re.DOTALL)
    
    match = pattern.search(html)
    if match:
        html = html.replace(match.group(0), new_template)
        with open("attendance.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Patched renderUsers with Registration button!")
    else:
        print("Regex did not match.")
else:
    print("Could not find card.innerHTML.")
