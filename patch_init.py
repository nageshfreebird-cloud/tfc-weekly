with open("manager-attendance.html", "r", encoding="utf-8") as f:
    html = f.read()

import re

# Find:
#      allAttendance = await getTeamAttendance();
#      renderTable();
#    } catch(err) {

html = re.sub(r'allAttendance = await getTeamAttendance\(\);\s*renderTable\(\);', 'allAttendance = await getTeamAttendance();\n    renderTable();\n    if (window.loadPendingLeaves) await window.loadPendingLeaves();', html)

with open("manager-attendance.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Injected")
