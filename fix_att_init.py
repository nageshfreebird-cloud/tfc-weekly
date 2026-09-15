import re

with open("attendance.html", "r", encoding="utf-8") as f:
    html = f.read()

old_block = """        const holidays = await getHolidays();
        if (holidays.includes(todayStr)) {
            document.getElementById("app-content").innerHTML = `
              <div style="padding:2rem; text-align:center; margin-top:30%;">
                  <h2 style="color:#dc2626;">>" Not Allowed</h2>
                  <p>Today is marked as a Holiday or Weekend. Attendance is blocked.</p>
              </div>
            `;
            return;
        }
        
        const todayLogs = await getTodayTeamAttendance();
        todayLogs.forEach(a => {
            attMap[a.name] = { inTime: a.inTime, outTime: a.outTime };
        });
        
        const users = await getUsers();"""

new_block = """        const [holidays, todayLogs, users] = await Promise.all([
          getHolidays(),
          getTodayTeamAttendance(),
          getUsers()
        ]);
        
        if (holidays.includes(todayStr)) {
            document.getElementById("app-content").innerHTML = `
              <div style="padding:2rem; text-align:center; margin-top:30%;">
                  <h2 style="color:#dc2626;">🚫 Not Allowed</h2>
                  <p>Today is marked as a Holiday or Weekend. Attendance is blocked.</p>
              </div>
            `;
            return;
        }
        
        todayLogs.forEach(a => {
            attMap[a.name] = { inTime: a.inTime, outTime: a.outTime };
        });"""

# Because of emojis in the original code ('>"'), I will use regex matching carefully
import re
match = re.search(r'const holidays = await getHolidays\(\);.*?const users = await getUsers\(\);', html, re.DOTALL)
if match:
    html = html.replace(match.group(0), new_block)
    with open("attendance.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Parallelized queries in attendance.html")
else:
    print("Could not find the target block.")

