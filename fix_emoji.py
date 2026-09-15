with open("attendance.html", "r", encoding="utf-8") as f:
    html = f.read()

html = html.replace('o. Re-Register', '✅ Re-Register')
html = html.replace('dY", Register Face', '📸 Register Face')

with open("attendance.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Emojis fixed.")
