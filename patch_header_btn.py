with open("attendance.html", "r", encoding="utf-8") as f:
    html = f.read()
import re

old_header = r'(<h2 style="margin:0; font-size:1.5rem;">.*?Live Attendance</h2>\s*</div>\s*<p style="opacity:0.8; font-size:0.9rem; margin-top:0.5rem; text-align:left; margin-left:55px;" id="today-date"></p>\s*</div>)'

# Let's just find the closing </div> of the header and insert the button right before it
# The exact structure is:
# <div class="header">
#   <div style="...">
#     <button>...</button>
#     <h2>...</h2>
#   </div>
#   <p ... id="today-date"></p>
# </div>

def replacer(match):
    return match.group(0)[:-6] + '\n      <button onclick="window.requestLeaveFlow()" style="margin-top:1rem; width:100%; max-width:200px; background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.5); padding:0.5rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; box-shadow:0 2px 5px rgba(0,0,0,0.1);">&#9973;&#65039; Request Leave</button>\n    </div>'

html = re.sub(r'<div class="header">.*?id="today-date"></p>\s*</div>', replacer, html, flags=re.DOTALL)

with open("attendance.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Injected request leave button into header")
