import mongoose from 'mongoose';
import { Prescription } from '../models/Prescription.js';
import { TherapySession } from '../models/TherapySession.js';
import { Hospital } from '../models/Hospital.js';
import { Room } from '../models/Room.js';
import RescheduleRequest from '../models/RescheduleRequest.js';
import { User } from '../models/User.js';

function to2(n){ return String(n).padStart(2,'0'); }
function dateStr(d){ return `${d.getFullYear()}-${to2(d.getMonth()+1)}-${to2(d.getDate())}`; }
function timeToMin(s){ const [h,m] = String(s||'').split(':'); return (Number(h)||0)*60+(Number(m)||0); }
function sameDayRange(d){ const a=new Date(d); a.setHours(0,0,0,0); const b=new Date(d); b.setHours(23,59,59,999); return [a,b]; }

async function hasOverlapForPatientOrStaff(hospitalId, patientId, staffId, start, end){
  const [dayStart, dayEnd] = sameDayRange(start);
  const filter = { hospital_id: hospitalId, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } };
  const daySessions = await TherapySession.find(filter).select('patient_id assigned_staff_id scheduled_at duration_min');
  return daySessions.some(s => {
    if (String(s.patient_id) !== String(patientId) && (!staffId || String(s.assigned_staff_id) !== String(staffId))) return false;
    const sStart = new Date(s.scheduled_at);
    const sEnd = new Date(sStart.getTime() + (Number(s.duration_min)||60)*60000);
    return sStart < end && start < sEnd;
  });
}

async function pickRoomWithCapacity(hospitalId, start, end){
  const rooms = await Room.find({ hospital_id: hospitalId, status: 'active' }).select('_id capacity');
  if (!rooms.length) return null;
  const [dayStart, dayEnd] = sameDayRange(start);
  const sessions = await TherapySession.find({ hospital_id: hospitalId, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } }).select('room_id scheduled_at duration_min');
  for (const r of rooms){
    const cap = Math.max(1, Number(r.capacity)||1);
    const count = sessions.filter(s => String(s.room_id) === String(r._id) && (() => { const sStart = new Date(s.scheduled_at); const sEnd = new Date(sStart.getTime() + (Number(s.duration_min)||60)*60000); return sStart < end && start < sEnd; })()).length;
    if (count < cap) return { id: r._id };
  }
  return null;
}

async function pickTherapistIfNeeded(hospitalId, start){
  const therapists = await User.find({ hospital_id: hospitalId, role: 'therapist' }).select('_id');
  if (!therapists.length) return null;
  const [dayStart, dayEnd] = sameDayRange(start);
  const loads = await Promise.all(therapists.map(async t => ({
    id: t._id,
    count: await TherapySession.countDocuments({ hospital_id: hospitalId, assigned_staff_id: t._id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } })
  })));
  return loads.sort((a,b)=>a.count-b.count)[0]?.id || null;
}

function normalizeTherapyType(name){
  return String(name||'').toLowerCase().trim().replace(/\s+/g,'_');
}

function withinHours(bh, dt){
  const mins = dt.getHours()*60 + dt.getMinutes();
  return (timeToMin(bh.start) <= mins) && (mins < timeToMin(bh.end));
}

async function scheduleFromPrescriptions({ horizonDays = 14 } = {}){
  try {
    const now = new Date();
    const later = new Date(); later.setDate(later.getDate()+horizonDays);
    const prescs = await Prescription.find({}).select('hospital_id patient_id therapies');
    for (const pr of prescs){
      const hospital = await Hospital.findById(pr.hospital_id);
      if (!hospital) continue;
      const policies = hospital.policies || {};
      const leadH = Math.max(0, Number(policies.lead_time_hours) || 0);
      const biz = hospital.business_hours || {};
      const cfgAll = hospital.therapy_config || {};

      for (const t of (pr.therapies||[])){
        const sessions = Number(t.plan_sessions)||0;
        const intervalDays = Math.max(1, Number(t.plan_interval_days)||1);
        const startDate = t.plan_start_date ? new Date(t.plan_start_date) : null;
        const dur = Number(t.plan_duration_min)||0;
        if (!sessions || !startDate || !dur) continue;
        const prefTime = t.plan_preferred_time || '10:00';
        const prefDays = Array.isArray(t.plan_preferred_days) ? t.plan_preferred_days : [];
        const staffFixed = t.plan_assigned_staff_id || null;
        const therapyType = normalizeTherapyType(t.name);
        const therapyCfg = cfgAll[therapyType] || {};
        const bufferMin = Math.max(0, Number(therapyCfg.buffer_min)||0);
        const allowed = therapyCfg.allowed_hours || null;

        for (let i=0;i<sessions;i++){
          const target = new Date(startDate);
          target.setDate(target.getDate() + i*intervalDays);
          if (target < now || target > later) continue; // only horizon
          // apply preferred time
          try {
            const [hh,mm] = String(prefTime).split(':').map(Number);
            target.setHours(hh||10, mm||0, 0, 0);
          } catch {}
          // lead time
          if (leadH > 0 && target.getTime() < (Date.now() + leadH*3600000)) continue;
          // blackout
          const dstr = dateStr(target);
          if (Array.isArray(hospital.blackout_dates) && hospital.blackout_dates.includes(dstr)) continue;
          // DOW business hours
          const dow = ['sun','mon','tue','wed','thu','fri','sat'][target.getDay()];
          const bh = biz[dow];
          if (!bh) continue;
          if (!withinHours(bh, target)) continue;
          if (allowed && !(timeToMin(allowed.start) <= (target.getHours()*60+target.getMinutes()) && (target.getHours()*60+target.getMinutes()) < timeToMin(allowed.end))) continue;
          // preferred weekday constraint if provided
          if (prefDays.length>0 && !prefDays.includes(dow)) continue;

          const end = new Date(target.getTime() + (dur + bufferMin)*60000);
          // daily caps
          const [dayStart, dayEnd] = sameDayRange(target);
          if (policies.max_sessions_per_patient_per_day){
            const pc = await TherapySession.countDocuments({ hospital_id: pr.hospital_id, patient_id: pr.patient_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } });
            if (pc >= policies.max_sessions_per_patient_per_day) continue;
          }
          // pick staff
          let staffId = staffFixed || null;
          if (!staffId && policies.auto_assign_staff) staffId = await pickTherapistIfNeeded(pr.hospital_id, target);
          if (policies.max_sessions_per_staff_per_day && staffId){
            const sc = await TherapySession.countDocuments({ hospital_id: pr.hospital_id, assigned_staff_id: staffId, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } });
            if (sc >= policies.max_sessions_per_staff_per_day) continue;
          }
          // overlap check
          if (await hasOverlapForPatientOrStaff(pr.hospital_id, pr.patient_id, staffId, target, end)) continue;
          // room pick
          const room = await pickRoomWithCapacity(pr.hospital_id, target, end);
          if (!room) continue;
          // idempotency: skip if already exists similar session
          const exists = await TherapySession.findOne({ hospital_id: pr.hospital_id, patient_id: pr.patient_id, therapy_type: therapyType, scheduled_at: target });
          if (exists) continue;
          // create
          await TherapySession.create({
            hospital_id: pr.hospital_id,
            patient_id: pr.patient_id,
            therapy_type: therapyType,
            assigned_staff_id: staffId || undefined,
            scheduled_at: target,
            duration_min: dur,
            room_id: room.id,
            status: 'awaiting_confirmation',
          });
        }
      }
    }
  } catch (e) {
    console.error('[Scheduler] scheduleFromPrescriptions error', e);
  }
}

async function autoApproveRequests(){
  try {
    const reqs = await RescheduleRequest.find({ status: 'pending', requested_date: { $ne: null }, requested_time: { $ne: null } }).limit(100);
    for (const r of reqs){
      const sess = await TherapySession.findById(r.session_id);
      if (!sess) continue;
      const hospital = await Hospital.findById(sess.hospital_id);
      if (!hospital) continue;
      const biz = hospital.business_hours || {};
      const cfg = (hospital.therapy_config || {})[String(sess.therapy_type||'').toLowerCase()] || {};
      const bufferMin = Math.max(0, Number(cfg.buffer_min)||0);
      const dur = Number(sess.duration_min)||60;
      const start = new Date(`${r.requested_date}T${r.requested_time}:00`);
      if (isNaN(start.getTime())) continue;
      const dstr = `${r.requested_date}`;
      if (Array.isArray(hospital.blackout_dates) && hospital.blackout_dates.includes(dstr)) continue;
      const dow = ['sun','mon','tue','wed','thu','fri','sat'][start.getDay()];
      const bh = biz[dow];
      if (!bh) continue;
      if (!withinHours(bh, start)) continue;
      if (cfg.allowed_hours) {
        const mins = start.getHours()*60+start.getMinutes();
        if (!(timeToMin(cfg.allowed_hours.start) <= mins && mins < timeToMin(cfg.allowed_hours.end))) continue;
      }
      const end = new Date(start.getTime() + (dur + bufferMin)*60000);
      // Lead time
      const leadH = Math.max(0, Number(hospital?.policies?.lead_time_hours)||0);
      if (leadH > 0 && start.getTime() < Date.now()+leadH*3600000) continue;
      // Overlap
      if (await hasOverlapForPatientOrStaff(sess.hospital_id, sess.patient_id, sess.assigned_staff_id, start, end)) continue;
      // Room
      const room = await pickRoomWithCapacity(sess.hospital_id, start, end);
      if (!room) continue;
      // Apply
      sess.scheduled_at = start; sess.room_id = room.id; sess.status = 'awaiting_confirmation';
      await sess.save();
      r.status = 'approved'; r.processed_at = new Date(); await r.save();
    }
  } catch (e) {
    console.error('[Scheduler] autoApproveRequests error', e);
  }
}

let _timer = null;
export function startScheduler(){
  if (_timer) return;
  const run = async () => {
    await scheduleFromPrescriptions({ horizonDays: 14 });
    await autoApproveRequests();
  };
  // initial delay to allow server to become ready
  setTimeout(run, 3000);
  _timer = setInterval(run, 10 * 60 * 1000);
  console.log('[Scheduler] started: every 10 minutes');
}

export default { startScheduler };
