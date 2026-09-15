import re
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

old_block = """          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div class="card" style="margin-bottom:0; text-align:center; padding:1.75rem; border:1px solid var(--border); box-shadow:var(--shadow-sm); border-top: 4px solid var(--primary); background:var(--card);">
              <div style="font-size:3rem; font-weight:800; color:var(--primary); line-height:1.2; font-feature-settings: 'tnum';" id="stat-schools">0</div>
              <div class="text-muted" style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:1.5px; margin-top:0.25rem;">Total Schools</div>
            </div>
            <div class="card" style="margin-bottom:0; text-align:center; padding:1.75rem; border:1px solid var(--border); box-shadow:var(--shadow-sm); border-top: 4px solid var(--primary); background:var(--card);">
              <div style="font-size:3rem; font-weight:800; color:var(--primary); line-height:1.2; font-feature-settings: 'tnum';" id="stat-students">0</div>
              <div class="text-muted" style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:1.5px; margin-top:0.25rem;">Total Students</div>
            </div>
          </div>"""

new_block = """          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
            <div class="card" style="margin-bottom:0; display:flex; align-items:center; gap:1rem; padding:1.25rem; border:1px solid var(--border); box-shadow:var(--shadow-sm); border-left: 4px solid var(--primary); background:var(--card);">
              <div style="font-size:2.5rem; opacity:0.8; color:var(--primary);">🏫</div>
              <div>
                <div style="font-size:2rem; font-weight:800; color:var(--primary); line-height:1.1; font-feature-settings: 'tnum';" id="stat-schools">0</div>
                <div class="text-muted" style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-top:0.2rem;">Total Schools</div>
              </div>
            </div>
            <div class="card" style="margin-bottom:0; display:flex; align-items:center; gap:1rem; padding:1.25rem; border:1px solid var(--border); box-shadow:var(--shadow-sm); border-left: 4px solid var(--primary); background:var(--card);">
              <div style="font-size:2.5rem; opacity:0.8; color:var(--primary);">👨‍🎓</div>
              <div>
                <div style="font-size:2rem; font-weight:800; color:var(--primary); line-height:1.1; font-feature-settings: 'tnum';" id="stat-students">0</div>
                <div class="text-muted" style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-top:0.2rem;">Total Students</div>
              </div>
            </div>
          </div>"""

if old_block in html:
    html = html.replace(old_block, new_block)
    with open("dashboard.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Dashboard stats made compact!")
else:
    print("Could not find block. Trying regex...")
