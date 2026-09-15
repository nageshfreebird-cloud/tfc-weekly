with open("team.html", "r", encoding="utf-8") as f:
    html = f.read()

old_loop = """    // Fetch schools for each district to build District_Level string
    let distLevelSet = new Set();
    for (const d of supe.districts) {
      const schools = await getSchools(d);
      schools.forEach(s => {
        if (s.Level) distLevelSet.add(`${d}_${s.Level}`);
      });
    }"""

new_loop = """    // Fetch schools for each district to build District_Level string (Parallel for speed)
    let distLevelSet = new Set();
    const schoolsArrays = await Promise.all(supe.districts.map(d => getSchools(d)));
    schoolsArrays.forEach(schools => {
      schools.forEach(s => {
        if (s.Level) distLevelSet.add(`${s.District}_${s.Level}`);
      });
    });"""

if old_loop in html:
    html = html.replace(old_loop, new_loop)
    with open("team.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Fixed sequential loop in team.html")
else:
    print("Could not find loop to replace.")
