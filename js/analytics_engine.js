import { SCHEMA_L1_L2, SCHEMA_L3_L4 } from './db.js';

export class AnalyticsEngine {
  constructor(allSchools, allAssessments) {
    this.allSchools = allSchools; // Array of school objects
    this.allAssessments = allAssessments; // Map: district_school_class -> Array of students
  }

  // Normalizes a raw score based on its max marks
  static normalizeScore(raw, max) {
    if (raw === undefined || raw === null || raw === "") return null;
    if (String(raw).toLowerCase() === "a" || String(raw).toLowerCase() === "ab") return "ABSENT";
    let num = Number(raw);
    if (isNaN(num)) return "INVALID";
    return (num / max) * 100;
  }

  // Gets the appropriate schema for a school level
  static getSchema(level) {
    return (level === "Level-3" || level === "Level-4") ? SCHEMA_L3_L4 : SCHEMA_L1_L2;
  }

  // Core filtering and aggregation function
  process(filters) {
    const { state, district, mandal, school, className, term, paramGrowth, paramDist } = filters;
    
    // 1. Filter Schools
    let filteredSchools = this.allSchools;
    if (district) filteredSchools = filteredSchools.filter(s => s.District === district);
    if (mandal) filteredSchools = filteredSchools.filter(s => s['Mandal Name'] === mandal);
    if (school) filteredSchools = filteredSchools.filter(s => s['School Name'] === school);
    
    // We need state filtering logic passed in, or rely on district if state is selected.
    // For now, assume if district is blank but state is active, the caller already filtered `allSchools` 
    // or passed the valid districts. We'll refine this later.

    let results = {
      kpi: { totalEnrolled: 0, assessed: 0, absent: 0, avgScore: 0, totalValidParamScores: 0, totalParamScoreSum: 0 },
      chartSkillPerf: { labels: [], data: [] },
      chartTermGrowth: { baseline: 0, midline: 0, endline: 0 },
      chartGeoRanking: {},
      chartDistribution: { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 },
      topStudents: [],
      dataQuality: []
    };

    let paramSums = {};
    let paramCounts = {};
    let termSums = { baseline: { sum: 0, max: 0, count: 0 }, midline: { sum: 0, max: 0, count: 0 }, endline: { sum: 0, max: 0, count: 0 } };

    // Initialize geo ranking map based on depth
    let geoKey = 'District';
    if (district) geoKey = 'Mandal Name';
    if (mandal) geoKey = 'School Name';
    if (school) geoKey = 'Class'; // We'll group by class

    // 2. Iterate through filtered schools and their assessments
    filteredSchools.forEach(sch => {
      const cleanSchool = sch['School Name'].replace(/[^a-zA-Z0-9]/g, "_");
      const classesToProcess = className ? [className] : ["3rd class", "4th class", "5th class"];
      const schema = AnalyticsEngine.getSchema(sch.Level);
      
      const geoLabel = school ? 'Class' : sch[geoKey]; // If school is selected, geoLabel is the class.

      classesToProcess.forEach(cls => {
        const docId = `${sch.District}_${cleanSchool}_${cls}`;
        const students = this.allAssessments[docId] || [];
        
        const currentGeo = school ? cls : geoLabel;
        if (!results.chartGeoRanking[currentGeo]) {
            results.chartGeoRanking[currentGeo] = { sum: 0, count: 0 };
        }

        students.forEach(student => {
          results.kpi.totalEnrolled++;
          
          // Track growth across all 3 terms for the line chart
          ['baseline', 'midline', 'endline'].forEach(t => {
             if (student[t]) {
                let tSum = 0; let tMax = 0; let tValid = false;
                schema.forEach((p, idx) => {
                     if (paramGrowth !== "" && paramGrowth !== undefined && String(idx) !== String(paramGrowth)) return;
                   const val = student[t][p.id];
                   if (val === undefined || val === null || val === "") return; // Skip blank cells completely
                     if (String(val).toLowerCase() === "a" || String(val).toLowerCase() === "ab") return; // Skip absent cells completely
                     
                     let num = Number(val);
                     if (!isNaN(num)) {
                        tSum += num; tMax += p.maxMarks; tValid = true;
                     }
                });
                if (tValid) {
                   termSums[t].sum += tSum; termSums[t].max += tMax;
                   termSums[t].count++;
                }
             }
          });

          // Focus on the specific active term for the rest of the analytics
          const activeTermData = student[term];
          if (!activeTermData) return; // Student has no data for the selected term
          
                      let studentRawSum = 0;
            let studentMaxSum = 0;
            let isAbsent = false;
  
            schema.forEach(p => {
              const rawVal = activeTermData[p.id];
              const normVal = AnalyticsEngine.normalizeScore(rawVal, p.maxMarks);
              
              if (normVal === "ABSENT") {
                 isAbsent = true;
              } else if (normVal === "INVALID") {
                 results.dataQuality.push({ school: sch['School Name'], class: cls, student: student.name, issue: `Invalid score for ${p.label}: ${rawVal}` });
              } else if (normVal !== null) {
                 if (!paramSums[p.label]) { paramSums[p.label] = 0; paramCounts[p.label] = 0; }
                 paramSums[p.label] += normVal;
                 paramCounts[p.label]++;
                 
                 let num = Number(rawVal);
                 if (rawVal === "" || rawVal === undefined) num = 0;
                 
                 studentRawSum += num;
                 studentMaxSum += p.maxMarks;
                 
                 // KPI relies on true sum vs true max
                 results.kpi.totalParamScoreSum += num;
                 results.kpi.totalValidParamScores += p.maxMarks;
              }
            });

          if (isAbsent) {
             results.kpi.absent++;
          } else if (studentMaxSum > 0) {
             results.kpi.assessed++;
             
             // Calculate this student's blended percentage (0-100)
             const studentAvg = (studentRawSum / studentMaxSum) * 100;
             
             // Geo Ranking
             results.chartGeoRanking[currentGeo].sum += studentAvg;
             results.chartGeoRanking[currentGeo].count++;
             
             // Distribution
               let distScore = studentAvg;
               if (paramDist !== "" && paramDist !== undefined) {
                   const pDef = schema[Number(paramDist)];
                   if (pDef) {
                       const rawVal = activeTermData[pDef.id];
                       const normVal = AnalyticsEngine.normalizeScore(rawVal, pDef.maxMarks);
                       distScore = (typeof normVal === 'number') ? normVal : -1;
                   } else {
                       distScore = -1;
                   }
               }
               
               if (distScore >= 0) {
                   if (distScore <= 20) results.chartDistribution['0-20']++;
                   else if (distScore <= 40) results.chartDistribution['21-40']++;
                   else if (distScore <= 60) results.chartDistribution['41-60']++;
                   else if (distScore <= 80) results.chartDistribution['61-80']++;
                   else results.chartDistribution['81-100']++;
               }
             
             // Top Students
             results.topStudents.push({
                name: student.name,
                school: sch['School Name'],
                mandal: sch['Mandal Name'],
                district: sch.District,
                class: cls,
                score: studentAvg
             });
          }
        });
      });
    });

    // Finalize KPI
    if (results.kpi.totalValidParamScores > 0) {
       results.kpi.avgScore = (results.kpi.totalParamScoreSum / results.kpi.totalValidParamScores) * 100;
    }

    // Finalize Skill Perf Chart
    Object.keys(paramSums).forEach(label => {
       results.chartSkillPerf.labels.push(label);
       results.chartSkillPerf.data.push(paramSums[label] / paramCounts[label]);
    });

    // Finalize Term Growth
    if (termSums.baseline.count > 0) results.chartTermGrowth.baseline = (termSums.baseline.sum / termSums.baseline.max) * 100;
    if (termSums.midline.count > 0) results.chartTermGrowth.midline = (termSums.midline.sum / termSums.midline.max) * 100;
    if (termSums.endline.count > 0) results.chartTermGrowth.endline = (termSums.endline.sum / termSums.endline.max) * 100;

    // Finalize Geo Ranking (convert to averages and sort)
    let rankedArr = [];
    Object.keys(results.chartGeoRanking).forEach(geo => {
       const stat = results.chartGeoRanking[geo];
       if (stat.count > 0) {
          rankedArr.push({ label: geo, avg: stat.sum / stat.count });
       }
    });
    rankedArr.sort((a,b) => b.avg - a.avg);
    results.chartGeoRanking = rankedArr; // Replace map with sorted array

    // Sort top students
    results.topStudents.sort((a,b) => b.score - a.score);
    // Just keep top 50 for the table to prevent massive memory usage
    // Keep top 10 and bottom 10 for the UI to select from
      if (results.topStudents.length > 20) {
          const top = results.topStudents.slice(0, 10);
          const bottom = results.topStudents.slice(-10);
          results.topStudents = [...top, ...bottom];
      }

    return results;
  }
}