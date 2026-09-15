import re
with open("attendance.html", "r", encoding="utf-8") as f:
    html = f.read()

html = re.sub(r'"[^"]*Re-Register"', '"✅ Re-Register"', html)
html = re.sub(r'"[^"]*Register Face"', '"📸 Register Face"', html)

with open("attendance.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Emojis really fixed.")
