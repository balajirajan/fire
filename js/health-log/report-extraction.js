// Checkup Report auto-detect — pattern-matches common lab values out of a
// PDF's text layer client-side.
//
// This is NOT a true AI/LLM read of the report. EnrichMe is a static site
// that talks directly to Supabase from the browser with no server-side
// compute — safely calling a real AI API requires a secret key held on a
// server, which would mean standing up a Supabase Edge Function first.
// That's a deliberate, documented gap, not an oversight (see the comment
// above medical_reports in supabase-schema.sql). What this DOES give: a
// real, useful auto-fill for digital PDF reports today, with the user
// always reviewing/editing every value before it's saved either way.
// Scanned/photographed reports (images) skip auto-detect entirely and go
// straight to manual entry — OCR accuracy on phone photos of lab reports
// is unreliable enough that a wrong silent auto-fill would be worse than
// no auto-fill.
//
// Loaded after pdf.js (see health-checkup-reports.html) and before that
// page's own <script>.
var ReportExtraction = (function () {
  var METRIC_DEFS = [
    { key: 'height_cm', label: 'Height', unit: 'cm', group: 'General', patterns: ['height'] },
    { key: 'weight_kg', label: 'Weight', unit: 'kg', group: 'General', patterns: ['weight'] },
    { key: 'bmi', label: 'BMI', unit: 'kg/m²', group: 'General', low: 18.5, high: 24.9, patterns: ['bmi', 'body mass index'] },
    { key: 'blood_sugar_fasting', label: 'Fasting Blood Sugar', unit: 'mg/dL', group: 'Blood Sugar', low: 70, high: 100, patterns: ['fasting (blood )?(glucose|sugar)', 'fbs'] },
    { key: 'blood_sugar_pp', label: 'Post-Prandial Blood Sugar', unit: 'mg/dL', group: 'Blood Sugar', low: 70, high: 140, patterns: ['(post.?prandial|pp) (blood )?(glucose|sugar)', 'ppbs'] },
    { key: 'hba1c', label: 'HbA1c', unit: '%', group: 'Blood Sugar', low: 4, high: 5.6, patterns: ['hba1c', 'glycated h(a)?emoglobin'] },
    { key: 'total_cholesterol', label: 'Total Cholesterol', unit: 'mg/dL', group: 'Lipid Profile', low: 0, high: 200, patterns: ['total cholesterol'] },
    { key: 'hdl_cholesterol', label: 'HDL Cholesterol', unit: 'mg/dL', group: 'Lipid Profile', low: 40, high: 60, patterns: ['hdl'] },
    { key: 'ldl_cholesterol', label: 'LDL Cholesterol', unit: 'mg/dL', group: 'Lipid Profile', low: 0, high: 100, patterns: ['ldl'] },
    { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', group: 'Lipid Profile', low: 0, high: 150, patterns: ['triglycerides'] },
    { key: 'tsh', label: 'TSH', unit: 'µIU/mL', group: 'Thyroid', low: 0.4, high: 4.0, patterns: ['tsh'] },
    { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', group: 'Kidney', low: 0.6, high: 1.3, patterns: ['creatinine'] },
    { key: 'urea', label: 'Blood Urea', unit: 'mg/dL', group: 'Kidney', low: 15, high: 40, patterns: ['urea'] },
    { key: 'sgot', label: 'SGOT / AST', unit: 'U/L', group: 'Liver', low: 0, high: 40, patterns: ['sgot', 'ast\\b'] },
    { key: 'sgpt', label: 'SGPT / ALT', unit: 'U/L', group: 'Liver', low: 0, high: 40, patterns: ['sgpt', 'alt\\b'] },
    { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', group: 'Blood Count', low: 13, high: 17, patterns: ['h(a)?emoglobin', '\\bhb\\b'] },
    { key: 'wbc_count', label: 'WBC Count', unit: '/µL', group: 'Blood Count', low: 4000, high: 11000, patterns: ['wbc', 'white blood cell'] },
    { key: 'platelet_count', label: 'Platelet Count', unit: '/µL', group: 'Blood Count', low: 150000, high: 450000, patterns: ['platelet'] },
    { key: 'vitamin_d', label: 'Vitamin D', unit: 'ng/mL', group: 'Vitamins', low: 30, high: 100, patterns: ['vitamin d'] },
    { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'pg/mL', group: 'Vitamins', low: 200, high: 900, patterns: ['vitamin b.?12', '\\bb12\\b'] }
  ];

  var BP_DEF = { key: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', group: 'General' };

  async function extractTextFromPdf(file) {
    var arrayBuffer = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var text = '';
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      text += content.items.map(function (it) { return it.str; }).join(' ') + '\n';
    }
    return text;
  }

  // Returns { metric_key: number } for numeric metrics, plus
  // blood_pressure as a "120/80" string if found.
  function parseMetricsFromText(text) {
    var found = {};

    METRIC_DEFS.forEach(function (def) {
      for (var i = 0; i < def.patterns.length; i++) {
        var re = new RegExp('(' + def.patterns[i] + ')[^0-9\\-]{0,25}(-?\\d+\\.?\\d*)', 'i');
        var m = text.match(re);
        if (m) { found[def.key] = parseFloat(m[2]); break; }
      }
    });

    var bpMatch = text.match(/(blood pressure|\bbp\b)[^0-9]{0,15}(\d{2,3})\s*\/\s*(\d{2,3})/i);
    if (bpMatch) found[BP_DEF.key] = bpMatch[2] + '/' + bpMatch[3];

    return found;
  }

  function flagForValue(def, value) {
    if (def.low === undefined || def.high === undefined || value === null || value === undefined || value === '' || isNaN(value)) return null;
    if (value < def.low) return 'low';
    if (value > def.high) return 'high';
    return 'normal';
  }

  // Blood pressure is a systolic threshold, not a low/high range — handled
  // separately from flagForValue. Simplified on purpose (a single 120mmHg
  // cutoff, not the full staged clinical guidance) — same "rule of thumb,
  // not medical advice" spirit as this app's other simplified calculators.
  function flagForBloodPressure(valueText) {
    if (!valueText) return null;
    var systolic = parseInt(valueText.split('/')[0], 10);
    if (isNaN(systolic)) return null;
    return systolic >= 120 ? 'high' : 'normal';
  }

  return {
    METRIC_DEFS: METRIC_DEFS,
    BP_DEF: BP_DEF,
    extractTextFromPdf: extractTextFromPdf,
    parseMetricsFromText: parseMetricsFromText,
    flagForValue: flagForValue,
    flagForBloodPressure: flagForBloodPressure
  };
})();
