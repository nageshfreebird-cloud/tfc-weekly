import os
import re

with open("supervisor-drive.html", "r", encoding="utf-8") as f:
    c = f.read()

old_func_start = """  async function getSchoolAverages(dist, school, prefetchedData = null) {
    let schoolData = { District: dist, Mandal: dist, School_Name: school, classes: {} };
    const classList = ["3rd class", "4th class", "5th class"];"""

new_func_start = """  async function getSchoolAverages(dist, school, prefetchedData = null) {
    let mandalName = dist;
    try {
        let allSchools = await getSchools(dist);
        let schObj = allSchools.find(s => s['School Name'] === school);
        if (schObj && schObj.Mandal) mandalName = schObj.Mandal;
    } catch(e) {}
    
    let schoolData = { District: dist, Mandal: mandalName, School_Name: school, classes: {} };
    const classList = ["3rd class", "4th class", "5th class"];"""

if old_func_start in c:
    c = c.replace(old_func_start, new_func_start)
    with open("supervisor-drive.html", "w", encoding="utf-8") as f:
        f.write(c)
        print("Success")
else:
    print("Could not find target")

