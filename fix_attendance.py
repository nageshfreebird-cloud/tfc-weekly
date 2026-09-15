import re

with open("attendance.html", "r", encoding="utf-8") as f:
    html = f.read()

# Add showLoading definition before loadModels
if 'function showLoading' not in html:
    html = html.replace('async function loadModels()', 'function showLoading(msg) {\n      if (typeof Swal !== "undefined") Swal.fire({title: msg, allowOutsideClick: false, didOpen: () => Swal.showLoading()});\n    }\n\n    async function loadModels()')

with open("attendance.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Fixed showLoading in attendance.html")
