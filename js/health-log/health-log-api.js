// Family Medicine Tracker — data access layer.
//
// Deliberately isolated from every financial module (transactions/accounts/
// obligations): its own file, its own namespace, its own tables
// (family_members, medical_events, prescribed_medicines,
// vaccination_records, medication_schedules, medical_reports,
// medical_report_metrics, plus the 'medical-reports' Storage bucket — see
// supabase-schema.sql). Nothing outside this file talks to those tables
// directly, so a future per-member/per-user permission layer can gate this
// module by changing only this boundary.
//
// Loaded after js/supabase-client.js on health-medicine-tracker.html and
// health-checkup-reports.html.
var HealthLog = (function () {
  async function listMembers() {
    var { data, error } = await supabaseClient.from('family_members').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function addMember(payload) {
    var { data, error } = await supabaseClient.from('family_members').insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function listMedicalEvents(memberId) {
    var { data, error } = await supabaseClient
      .from('medical_events')
      .select('*, prescribed_medicines(*)')
      .eq('member_id', memberId)
      .order('event_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function addMedicalEvent(eventPayload, medicines) {
    var { data: event, error } = await supabaseClient.from('medical_events').insert(eventPayload).select().single();
    if (error) throw error;
    await replaceMedicines(event.id, medicines);
    return event;
  }

  async function updateMedicalEvent(id, eventPayload, medicines) {
    var { error } = await supabaseClient.from('medical_events').update(eventPayload).eq('id', id);
    if (error) throw error;
    await replaceMedicines(id, medicines);
  }

  async function replaceMedicines(medicalEventId, medicines) {
    var { error: delError } = await supabaseClient.from('prescribed_medicines').delete().eq('medical_event_id', medicalEventId);
    if (delError) throw delError;
    if (!medicines || !medicines.length) return;
    var rows = medicines.map(function (m) {
      return { medical_event_id: medicalEventId, medicine_name: m.medicine_name, dosage: m.dosage, duration: m.duration };
    });
    var { error: insError } = await supabaseClient.from('prescribed_medicines').insert(rows);
    if (insError) throw insError;
  }

  async function deleteMedicalEvent(id) {
    var { error } = await supabaseClient.from('medical_events').delete().eq('id', id);
    if (error) throw error;
  }

  async function listVaccinations(memberId) {
    var { data, error } = await supabaseClient
      .from('vaccination_records')
      .select('*')
      .eq('member_id', memberId)
      .order('date_given', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function addVaccination(payload) {
    var { error } = await supabaseClient.from('vaccination_records').insert(payload);
    if (error) throw error;
  }

  async function updateVaccination(id, payload) {
    var { error } = await supabaseClient.from('vaccination_records').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function deleteVaccination(id) {
    var { error } = await supabaseClient.from('vaccination_records').delete().eq('id', id);
    if (error) throw error;
  }

  // Medication Tracker / Pill Reminder / Supplement Tracker — one table,
  // filtered by `category` client-side into the three tabs.
  async function listSchedules(memberId) {
    var { data, error } = await supabaseClient
      .from('medication_schedules')
      .select('*')
      .eq('member_id', memberId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function addSchedule(payload) {
    var { error } = await supabaseClient.from('medication_schedules').insert(payload);
    if (error) throw error;
  }

  async function updateSchedule(id, payload) {
    var { error } = await supabaseClient.from('medication_schedules').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function deleteSchedule(id) {
    var { error } = await supabaseClient.from('medication_schedules').delete().eq('id', id);
    if (error) throw error;
  }

  // Checkup Reports — file goes to the private 'medical-reports' Storage
  // bucket (not client-side encrypted like Document Vault, since the
  // extraction feature needs to read it), metadata + extracted metrics go
  // to medical_reports / medical_report_metrics.
  async function listReports(memberId) {
    var { data, error } = await supabaseClient
      .from('medical_reports')
      .select('*, medical_report_metrics(*)')
      .eq('member_id', memberId)
      .order('report_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function uploadReportFile(file, userId) {
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var path = userId + '/' + crypto.randomUUID() + '-' + safeName;
    var { error } = await supabaseClient.storage.from('medical-reports').upload(path, file, { contentType: file.type || 'application/octet-stream' });
    if (error) throw error;
    return path;
  }

  async function addReport(reportPayload, metrics) {
    var { data: report, error } = await supabaseClient.from('medical_reports').insert(reportPayload).select().single();
    if (error) throw error;
    await replaceReportMetrics(report.id, metrics);
    return report;
  }

  async function updateReport(id, reportPayload, metrics) {
    var { error } = await supabaseClient.from('medical_reports').update(reportPayload).eq('id', id);
    if (error) throw error;
    await replaceReportMetrics(id, metrics);
  }

  async function replaceReportMetrics(reportId, metrics) {
    var { error: delError } = await supabaseClient.from('medical_report_metrics').delete().eq('report_id', reportId);
    if (delError) throw delError;
    if (!metrics || !metrics.length) return;
    var rows = metrics.map(function (m) {
      return {
        report_id: reportId,
        metric_key: m.metric_key,
        metric_label: m.metric_label,
        value: m.value === undefined ? null : m.value,
        value_text: m.value_text || null,
        unit: m.unit || null,
        normal_low: m.normal_low === undefined ? null : m.normal_low,
        normal_high: m.normal_high === undefined ? null : m.normal_high,
        flag: m.flag || null
      };
    });
    var { error: insError } = await supabaseClient.from('medical_report_metrics').insert(rows);
    if (insError) throw insError;
  }

  async function deleteReport(report) {
    await supabaseClient.storage.from('medical-reports').remove([report.storage_path]);
    var { error } = await supabaseClient.from('medical_reports').delete().eq('id', report.id);
    if (error) throw error;
  }

  async function downloadReportFile(report) {
    var { data, error } = await supabaseClient.storage.from('medical-reports').download(report.storage_path);
    if (error) throw error;
    return data;
  }

  return {
    listMembers: listMembers,
    addMember: addMember,
    listMedicalEvents: listMedicalEvents,
    addMedicalEvent: addMedicalEvent,
    updateMedicalEvent: updateMedicalEvent,
    deleteMedicalEvent: deleteMedicalEvent,
    listVaccinations: listVaccinations,
    addVaccination: addVaccination,
    updateVaccination: updateVaccination,
    deleteVaccination: deleteVaccination,
    listSchedules: listSchedules,
    addSchedule: addSchedule,
    updateSchedule: updateSchedule,
    deleteSchedule: deleteSchedule,
    listReports: listReports,
    uploadReportFile: uploadReportFile,
    addReport: addReport,
    updateReport: updateReport,
    deleteReport: deleteReport,
    downloadReportFile: downloadReportFile
  };
})();
