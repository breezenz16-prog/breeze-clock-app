"use client";
import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyBPqNbYoM3LaCCIlTFiMngbxCNbTKkVfsM",
  authDomain: "breeze-clock-6a4f3.firebaseapp.com",
  projectId: "breeze-clock-6a4f3",
  storageBucket: "breeze-clock-6a4f3.firebasestorage.app",
  messagingSenderId: "84838183547",
  appId: "1:84838183547:web:87d229bd39c80f75c428de",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ADMIN_EMAIL = "breezenz16@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "02041462704";
const NZ_TIMEZONE = "Pacific/Auckland";
const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const SHIFT_QUOTES = [
  "Great service starts with a great attitude.",
  "Every guest deserves to feel like a regular.",
  "The secret ingredient is always the team.",
  "A smile costs nothing but means everything.",
  "Good food, good mood — you make it happen.",
  "Teamwork makes the dream work.",
  "Your energy sets the tone for the whole shift.",
  "Small acts of kindness make big impressions.",
  "Hospitality is making people feel at home, even when you're not.",
  "The best ingredient in any dish is passion.",
];
const SHIFT_FACTS = [
  "The word 'restaurant' comes from the French word meaning 'to restore'.",
  "Naan bread has been around for over 2,500 years!",
  "India has the world's largest vegetarian population.",
  "Chai means 'tea' in Hindi — so 'chai tea' means 'tea tea'!",
  "Saffron is the world's most expensive spice by weight.",
  "The first restaurant in the world opened in Paris in 1765.",
  "Turmeric has been used in cooking for over 4,000 years.",
  "Basmati rice can be stored for decades and actually improves with age!",
  "Cardamom is the third most expensive spice in the world after saffron and vanilla.",
  "The mango is the national fruit of India, Pakistan and the Philippines.",
];
const DAY_MESSAGES = ["Happy Sunday! A quiet start to the week.", "Happy Monday! New week, fresh start. Let's go!", "Happy Tuesday! You're doing great. Keep it up!", "Halfway through the week! Wednesday vibes.", "Happy Thursday! Nearly there!", "It's Friday! The weekend is almost here!", "Happy Saturday! Busiest day — you've got this!"];
const EMAILJS_SERVICE_ID = "service_22q7wqe";
const EMAILJS_TEMPLATE_ID = "template_9npp595";
const EMAILJS_PUBLIC_KEY = "0Gyw2c9jKIx3MCFKx";
const EMAILJS_BIRTHDAY_TEMPLATE_ID = "template_14chz3h";
const TEST_ACCOUNTS = ["noor@breeze.local", "seema@breeze.local"];
const RESTAURANT_LAT = -37.7870;
const RESTAURANT_LNG = 175.2793;
const MAX_DISTANCE_METERS = 50;
const NZ_PUBLIC_HOLIDAYS = {
  "2026-01-01": "New Year's Day",
  "2026-01-02": "Day after New Year's Day",
  "2026-02-06": "Waitangi Day",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Easter Monday",
  "2026-04-25": "ANZAC Day",
  "2026-04-27": "ANZAC Day (observed)",
  "2026-06-01": "King's Birthday",
  "2026-06-28": "Matariki",
  "2026-10-26": "Labour Day",
  "2026-12-25": "Christmas Day",
  "2026-12-26": "Boxing Day",
  "2026-12-28": "Boxing Day (observed)",
  "2027-01-01": "New Year's Day",
  "2027-01-04": "New Year's Day (observed)",
};
function getPublicHoliday(isoDateStr) {
  const d = new Date(isoDateStr);
  const key = d.toLocaleDateString("en-CA", { timeZone: NZ_TIMEZONE });
  return NZ_PUBLIC_HOLIDAYS[key] || null;
}
async function sendEmailNotification(staffName, role, action) {
  try {
    const time = new Date().toLocaleString("en-NZ", { timeZone: NZ_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: true, weekday: "short", day: "numeric", month: "short" });
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { staff_name: staffName, role, action, time } }),
    });
  } catch (err) { console.error("Email notification failed:", err); }
}
async function sendBirthdayEmail(staffName) {
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_BIRTHDAY_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { staff_name: staffName } }),
    });
  } catch (err) { console.error("Birthday email failed:", err); }
}
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function checkLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject("You are not in Breeze Restaurant. Please contact your manager."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, RESTAURANT_LAT, RESTAURANT_LNG);
        dist <= MAX_DISTANCE_METERS ? resolve(dist) : reject("You are not in Breeze Restaurant. Please contact your manager.");
      },
      () => reject("You are not in Breeze Restaurant. Please contact your manager."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
const defaultEmployees = [
  { id: "emp-1", name: "Noor", email: "noor@breeze.local", password: "1111", role: "FOH", active: true },
  { id: "emp-2", name: "Smith", email: "smith@breeze.local", password: "2222", role: "Chef", active: true },
  { id: "emp-3", name: "Ramzan", email: "ramzan@breeze.local", password: "3333", role: "Cook", active: true },
  { id: "emp-4", name: "Seema", email: "seema@breeze.local", password: "4444", role: "FOH", active: true },
];
const roleOptions = ["FOH", "Manager", "Chef", "Cook", "Kitchen"];
const defaultAdminSettings = { email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD };
function nowIso() { return new Date().toISOString(); }
function formatDateTimeNZ(v) { return new Date(v).toLocaleString("en-NZ", { timeZone: NZ_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }); }
function formatDateNZ(v) { return new Date(v).toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }); }
function formatTimeNZ(v) { return new Date(v).toLocaleTimeString("en-NZ", { timeZone: NZ_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: true }); }
function hoursBetween(s, e) { return Math.max(0, (new Date(e).getTime() - new Date(s).getTime()) / 3600000); }
function getFortnightOptions(count = 8) {
  const anchor = new Date("2026-04-13T00:00:00");
  const today = new Date();
  const diffMs = today - anchor;
  const diffFn = Math.floor(diffMs / (14 * 24 * 60 * 60 * 1000));
  const currentStart = new Date(anchor);
  currentStart.setDate(anchor.getDate() + diffFn * 14);
  currentStart.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const s = new Date(currentStart); s.setDate(currentStart.getDate() - i * 14); s.setHours(0, 0, 0, 0);
    const e = new Date(s); e.setDate(s.getDate() + 13); e.setHours(23, 59, 59, 999);
    return { value: `${s.toISOString()}__${e.toISOString()}`, label: `${formatDateNZ(s)} - ${formatDateNZ(e)}`, startIso: s.toISOString(), endIso: e.toISOString() };
  });
}
const iStyle = () => ({ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" });
const bStyle = (k = "primary") => {
  const b = { padding: "12px 14px", borderRadius: 12, border: "1px solid #111827", cursor: "pointer", fontSize: 14, fontWeight: 600 };
  if (k === "secondary") return { ...b, background: "#fff", color: "#111827" };
  if (k === "danger") return { ...b, background: "#991b1b", color: "#fff", borderColor: "#991b1b" };
  if (k === "ghost") return { ...b, background: "#f3f4f6", color: "#111827", borderColor: "#d1d5db" };
  return { ...b, background: "#111827", color: "#fff" };
};
const cStyle = () => ({ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" });
export default function Page() {
  const [employees, setEmployees] = useState(defaultEmployees);
  const [entries, setEntries] = useState([]);
  const [timesheetSubmissions, setTimesheetSubmissions] = useState([]);
  const [activeShifts, setActiveShifts] = useState({});
  const [adminSettings, setAdminSettings] = useState(defaultAdminSettings);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("staff");
  const [msg, setMsg] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPw, setEmpPw] = useState("");
  const [empId, setEmpId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [adminFilter, setAdminFilter] = useState("all");
  const [tsFilter, setTsFilter] = useState("all");
  const [selFN, setSelFN] = useState("");
  const [selAdminFN, setSelAdminFN] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmpPw, setNewEmpPw] = useState("");
  const [newRole, setNewRole] = useState("FOH");
  const [editEmpId, setEditEmpId] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("FOH");
  const [resetPwId, setResetPwId] = useState("");
  const [resetPwVal, setResetPwVal] = useState("");
  const [expandedEmpId, setExpandedEmpId] = useState("");
  const [editTsId, setEditTsId] = useState("");
  const [editTsHrs, setEditTsHrs] = useState("");
  const [editShiftId, setEditShiftId] = useState("");
  const [editShiftIn, setEditShiftIn] = useState("");
  const [editShiftOut, setEditShiftOut] = useState("");
  const [showAddShift, setShowAddShift] = useState(false);
  const [addShiftEmpId, setAddShiftEmpId] = useState("");
  const [addShiftIn, setAddShiftIn] = useState("");
  const [addShiftOut, setAddShiftOut] = useState("");
  const [liveTime, setLiveTime] = useState(new Date());
  // NEW: Summary view toggle and expanded employee cards
  const [adminViewMode, setAdminViewMode] = useState("list");
  const [expandedSummaryEmpId, setExpandedSummaryEmpId] = useState("");
  // Birthday & joining date fields
  const [newBirthday, setNewBirthday] = useState("");
  const [newJoinDate, setNewJoinDate] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editJoinDate, setEditJoinDate] = useState("");
  const fnOpts = useMemo(() => getFortnightOptions(), []);
  useEffect(() => {
    if (!selFN && fnOpts[0]) setSelFN(fnOpts[0].value);
    if (!selAdminFN && fnOpts[0]) setSelAdminFN(fnOpts[0].value);
  }, [fnOpts, selFN, selAdminFN]);
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "shifts"), orderBy("clockIn", "desc")), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEntries(data);
      const open = {};
      data.forEach(e => { if (!e.clockOut) open[e.employeeId] = e.id; });
      setActiveShifts(open);
    });
    const u2 = onSnapshot(collection(db, "employees"), snap => {
      if (snap.empty) defaultEmployees.forEach(e => addDoc(collection(db, "employees"), e));
      else setEmployees(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    const u3 = onSnapshot(query(collection(db, "timesheetSubmissions"), orderBy("submittedAt", "desc")), snap => {
      setTimesheetSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u4 = onSnapshot(collection(db, "settings"), snap => {
      if (snap.empty) addDoc(collection(db, "settings"), defaultAdminSettings);
      else setAdminSettings(snap.docs[0].data());
    });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);
  useEffect(() => {
    if (!adminUnlocked) return;
    let tid;
    const reset = () => { clearTimeout(tid); tid = setTimeout(() => { setAdminUnlocked(false); setMsg("Admin logged out after 10 minutes of inactivity."); }, ADMIN_IDLE_TIMEOUT_MS); };
    const evts = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    evts.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(tid); evts.forEach(e => window.removeEventListener(e, reset)); };
  }, [adminUnlocked]);
  const selEmp = useMemo(() => employees.find(e => e.id === empId), [employees, empId]);
  const selEmpByEmail = useMemo(() => employees.find(e => e.active !== false && (e.email||"").toLowerCase() === empEmail.trim().toLowerCase()), [employees, empEmail]);
  const selFNRange = useMemo(() => fnOpts.find(o => o.value === selFN) || fnOpts[0], [fnOpts, selFN]);
  const selAdminFNRange = useMemo(() => fnOpts.find(o => o.value === selAdminFN) || fnOpts[0], [fnOpts, selAdminFN]);
  const filteredEntries = useMemo(() => {
    const s = selAdminFNRange ? new Date(selAdminFNRange.startIso) : null;
    const e = selAdminFNRange ? new Date(selAdminFNRange.endIso) : null;
    const byP = entries.filter(x => { if (!s||!e) return true; const ci = new Date(x.clockIn); return ci >= s && ci <= e; });
    if (adminFilter === "open") return byP.filter(x => !x.clockOut);
    if (adminFilter === "closed") return byP.filter(x => !!x.clockOut);
    return byP;
  }, [entries, adminFilter, selAdminFNRange]);
  const fnEntries = useMemo(() => {
    if (!empId || !selFNRange) return [];
    const s = new Date(selFNRange.startIso), e = new Date(selFNRange.endIso);
    const g = entries.filter(x => x.employeeId === empId && x.clockOut).filter(x => { const ci = new Date(x.clockIn); return ci >= s && ci <= e; })
      .reduce((acc, x) => {
        const dk = formatDateNZ(x.clockIn);
        if (!acc[dk]) acc[dk] = { date: dk, hours: 0, sortValue: new Date(x.clockIn).getTime(), shifts: [] };
        acc[dk].hours += x.totalHours || 0; acc[dk].shifts.push(x);
        return acc;
      }, {});
    return Object.values(g).sort((a, b) => b.sortValue - a.sortValue);
  }, [entries, empId, selFNRange]);
  const fnHours = useMemo(() => fnEntries.reduce((s, r) => s + r.hours, 0), [fnEntries]);
  const filteredTs = useMemo(() => {
    const notRej = timesheetSubmissions.filter(i => i.status.toLowerCase() !== "rejected");
    return tsFilter === "all" ? notRej : notRej.filter(i => i.status.toLowerCase() === tsFilter);
  }, [timesheetSubmissions, tsFilter]);

  // NEW: Build summary data grouped by employee for the selected fortnight
  const summaryData = useMemo(() => {
    if (!selAdminFNRange) return [];
    const s = new Date(selAdminFNRange.startIso);
    const e = new Date(selAdminFNRange.endIso);
    const week1End = new Date(s); week1End.setDate(s.getDate() + 6); week1End.setHours(23,59,59,999);
    const closedInPeriod = entries.filter(x => x.clockOut && new Date(x.clockIn) >= s && new Date(x.clockIn) <= e);
    const byEmp = {};
    closedInPeriod.forEach(shift => {
      const key = shift.employeeName;
      if (!byEmp[key]) byEmp[key] = { employeeId: shift.employeeId, employeeName: shift.employeeName, role: shift.role, week1: [], week2: [], totalHours: 0 };
      const ci = new Date(shift.clockIn);
      const bucket = ci <= week1End ? "week1" : "week2";
      byEmp[key][bucket].push(shift);
      byEmp[key].totalHours += shift.totalHours || 0;
    });
    return Object.values(byEmp).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [entries, selAdminFNRange]);

  function downloadCSV() {
    const rows = [["Employee","Role","Period","Total Hours"]];
    const totals = {};
    filteredEntries.forEach(e => {
      if (!e.clockOut) return;
      if (!totals[e.employeeId]) totals[e.employeeId] = { name: e.employeeName, role: e.role, hours: 0 };
      totals[e.employeeId].hours += e.totalHours || 0;
    });
    Object.values(totals).forEach(t => rows.push([t.name, t.role, selAdminFNRange?.label||"", t.hours.toFixed(2)]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Breeze_Timesheet_${selAdminFNRange?.label||"fortnight"}.csv`;
    a.click();
  }
  function login() {
    if (!selEmpByEmail) { setMsg("No active staff account found for this email."); return; }
    if (selEmpByEmail.password !== empPw) { setMsg("Incorrect password."); return; }
    setEmpId(selEmpByEmail.id); setLoggedIn(true); setActiveTab("staff"); setShowForgot(false); setEmpPw("");
    setMsg(`${selEmpByEmail.name} logged in successfully.`);
  }
  function logout() { setLoggedIn(false); setEmpId(""); setEmpEmail(""); setEmpPw(""); setMsg("Staff logged out."); }
  async function clockIn() {
    if (!selEmp) return;
    const isTest = TEST_ACCOUNTS.includes(selEmp.email?.toLowerCase());
    const openShift = entries.find(e => e.employeeId === selEmp.id && !e.clockOut);
    if (openShift) {
      const openDate = formatDateNZ(openShift.clockIn);
      const todayDate = formatDateNZ(nowIso());
      if (openDate === todayDate) { setMsg("Already clocked in."); return; }
      const clockInDate = new Date(openShift.clockIn);
      const midnight = new Date(clockInDate);
      midnight.setDate(clockInDate.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      try {
        await updateDoc(doc(db, "shifts", openShift.id), { clockOut: midnight.toISOString(), totalHours: hoursBetween(openShift.clockIn, midnight.toISOString()) });
        setMsg("⚠️ You had an open shift from " + openDate + " — it has been closed at midnight. Please check with your manager.");
      } catch { setMsg("Error closing previous shift."); return; }
    }
    if (!isTest) {
      setMsg("📍 Checking your location...");
      try { await checkLocation(); } catch (err) { setMsg("❌ " + err); return; }
    }
    try {
      await addDoc(collection(db, "shifts"), { employeeId: selEmp.id, employeeName: selEmp.name, role: selEmp.role, clockIn: nowIso(), clockOut: null, totalHours: null });
      setMsg(selEmp.name + " clocked in. ✅");
    } catch { setMsg("Error clocking in."); }
  }
  async function clockOut() {
    if (!selEmp) return;
    const openShift = entries.find(e => e.employeeId === selEmp.id && !e.clockOut);
    if (!openShift) { setMsg("Not clocked in."); return; }
    if (!window.confirm(`Are you sure you want to clock out, ${selEmp.name}?`)) return;
    const isTest = TEST_ACCOUNTS.includes(selEmp.email?.toLowerCase());
    if (!isTest) {
      setMsg("📍 Checking your location...");
      try { await checkLocation(); } catch (err) { setMsg(`❌ ${err}`); return; }
    }
    const stamp = nowIso();
    try {
      await updateDoc(doc(db, "shifts", openShift.id), { clockOut: stamp, totalHours: hoursBetween(openShift.clockIn, stamp) });
      setMsg(`${selEmp.name} clocked out. ✅`);
    } catch { setMsg("Error clocking out."); }
  }
  async function submitTS() {
    if (!selEmp || !selFNRange) return;
    if (timesheetSubmissions.find(i => i.employeeId === selEmp.id && i.period === selFNRange.label && i.status === "Pending")) { setMsg("A timesheet for this fortnight is already pending."); return; }
    if (!window.confirm(`Are you sure you want to submit your timesheet for ${selFNRange.label}?`)) return;
    try {
      await addDoc(collection(db, "timesheetSubmissions"), { employeeId: selEmp.id, employeeName: selEmp.name, period: selFNRange.label, hours: fnHours, status: "Pending", submittedAt: nowIso() });
      setMsg("Timesheet submitted. ✅");
    } catch { setMsg("Error submitting timesheet."); }
  }
  function unlockAdmin() {
    if (adminPw !== adminSettings.password) { setMsg("Incorrect admin password."); return; }
    setAdminUnlocked(true); setAdminPw(""); setShowReset(false); setMsg("Admin access granted.");
  }
  async function resetAdminPw() {
    if (resetEmail.trim().toLowerCase() !== adminSettings.email.toLowerCase()) { setMsg("Admin verification failed."); return; }
    if (!newPw.trim()) { setMsg("Please enter a new password."); return; }
    if (newPw !== confirmPw) { setMsg("Passwords do not match."); return; }
    try {
      const snap = await getDocs(collection(db, "settings"));
      if (!snap.empty) await updateDoc(doc(db, "settings", snap.docs[0].id), { password: newPw });
      setResetEmail(""); setNewPw(""); setConfirmPw(""); setShowReset(false); setMsg("Admin password reset. ✅");
    } catch { setMsg("Error resetting password."); }
  }
  async function addEmployee() {
    const name = newName.trim(), email = newEmail.trim().toLowerCase(), pw = newEmpPw.trim();
    if (!name||!email||!pw) { setMsg("Please fill all fields."); return; }
    if (employees.some(e => e.email.toLowerCase() === email)) { setMsg("Email already exists."); return; }
    try {
      await addDoc(collection(db, "employees"), { name, email, password: pw, role: newRole, active: true, birthday: newBirthday || null, joinDate: newJoinDate || null });
      setNewName(""); setNewEmail(""); setNewEmpPw(""); setNewRole("FOH"); setNewBirthday(""); setNewJoinDate(""); setMsg("Employee created. ✅");
    } catch { setMsg("Error creating employee."); }
  }
  async function saveEditEmp(id) {
    const name = editName.trim(), email = editEmail.trim().toLowerCase();
    if (!name||!email) { setMsg("Please fill all fields."); return; }
    if (employees.some(e => e.id !== id && e.email.toLowerCase() === email)) { setMsg("Email already in use."); return; }
    try { await updateDoc(doc(db, "employees", id), { name, email, role: editRole, birthday: editBirthday || null, joinDate: editJoinDate || null }); setEditEmpId(""); setMsg("Employee updated. ✅"); }
    catch { setMsg("Error updating."); }
  }
  async function savePwReset(id) {
    const pw = resetPwVal.trim();
    if (!pw) { setMsg("Please enter a password."); return; }
    if (!window.confirm("Are you sure you want to reset this employee's password?")) return;
    try { await updateDoc(doc(db, "employees", id), { password: pw }); setResetPwId(""); setResetPwVal(""); setMsg("Password reset. ✅"); }
    catch { setMsg("Error resetting."); }
  }
  async function removeEmp(id) {
    const emp = employees.find(e => e.id === id);
    if (!window.confirm(`Are you sure you want to remove ${emp?.name}?`)) return;
    try { await updateDoc(doc(db, "employees", id), { active: false }); if (selEmp?.id === id) logout(); setMsg("Employee removed. ✅"); }
    catch { setMsg("Error removing."); }
  }
  async function updateTsStatus(id, status) {
    try { await updateDoc(doc(db, "timesheetSubmissions", id), { status }); setMsg(`Timesheet ${status.toLowerCase()}. ✅`); }
    catch { setMsg("Error updating."); }
  }
  async function saveTsEdit(id) {
    const h = Number(editTsHrs);
    if (isNaN(h)||h<0) { setMsg("Invalid hours."); return; }
    try { await updateDoc(doc(db, "timesheetSubmissions", id), { hours: h }); setEditTsId(""); setEditTsHrs(""); setMsg("Hours updated. ✅"); }
    catch { setMsg("Error updating."); }
  }
  async function saveShiftEdit(id) {
    if (!editShiftIn) { setMsg("Please enter clock in time."); return; }
    if (!window.confirm("Save changes to this shift?")) return;
    try {
      const toIso = s => { const [d,t] = s.split("T"); const [y,m,day] = d.split("-"); const [h,min] = t.split(":"); return new Date(`${y}-${m}-${day}T${h}:${min}:00`).toISOString(); };
      const ci = toIso(editShiftIn), co = editShiftOut ? toIso(editShiftOut) : null;
      await updateDoc(doc(db, "shifts", id), { clockIn: ci, clockOut: co, totalHours: co ? hoursBetween(ci, co) : null });
      setEditShiftId(""); setMsg("Shift updated. ✅");
    } catch { setMsg("Error updating shift."); }
  }
  async function delShift(id) {
    if (!window.confirm("Delete this shift?")) return;
    try { await deleteDoc(doc(db, "shifts", id)); setMsg("Shift deleted. ✅"); }
    catch { setMsg("Error deleting."); }
  }
  async function addManualShift() {
    if (!addShiftEmpId || !addShiftIn) { setMsg("Please select an employee and enter clock in time."); return; }
    if (!window.confirm("Add this manual shift?")) return;
    const emp = employees.find(e => e.id === addShiftEmpId);
    if (!emp) { setMsg("Employee not found."); return; }
    try {
      const toIso = s => { const [d,t] = s.split("T"); const [y,m,day] = d.split("-"); const [h,min] = t.split(":"); return new Date(`${y}-${m}-${day}T${h}:${min}:00`).toISOString(); };
      const ci = toIso(addShiftIn);
      const co = addShiftOut ? toIso(addShiftOut) : null;
      await addDoc(collection(db, "shifts"), { employeeId: emp.id, employeeName: emp.name, role: emp.role, clockIn: ci, clockOut: co, totalHours: co ? hoursBetween(ci, co) : null });
      setAddShiftEmpId(""); setAddShiftIn(""); setAddShiftOut(""); setShowAddShift(false);
      setMsg("Manual shift added. ✅");
    } catch { setMsg("Error adding shift."); }
  }

  // NEW: Summary view week label helper
  function getSummaryWeekLabel(fnRange, weekNum) {
    if (!fnRange) return "";
    const s = new Date(fnRange.startIso);
    const weekStart = new Date(s);
    if (weekNum === 2) weekStart.setDate(s.getDate() + 7);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    return `Week ${weekNum} (${weekStart.toLocaleDateString("en-NZ",{timeZone:NZ_TIMEZONE,day:"numeric",month:"short"})} – ${weekEnd.toLocaleDateString("en-NZ",{timeZone:NZ_TIMEZONE,day:"numeric",month:"short"})})`;
  }

  // Birthday helpers
  function isBirthdayToday(birthdayStr) {
    if (!birthdayStr) return false;
    const today = new Date().toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, month: "2-digit", day: "2-digit" });
    const bday = new Date(birthdayStr).toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, month: "2-digit", day: "2-digit" });
    return today === bday;
  }
  function formatBirthday(birthdayStr) {
    if (!birthdayStr) return null;
    return new Date(birthdayStr).toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, day: "numeric", month: "short" });
  }
  function formatJoinDate(joinStr) {
    if (!joinStr) return null;
    const joined = new Date(joinStr);
    const now = new Date();
    const diffMs = now - joined;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30.44);
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    let duration = "";
    if (years > 0 && months > 0) duration = years + " yr " + months + " mo";
    else if (years > 0) duration = years + " yr";
    else if (months > 0) duration = months + " mo";
    else duration = diffDays + " days";
    return { label: joined.toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, day: "numeric", month: "short", year: "numeric" }), duration };
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Arial" }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.85}}@keyframes fadeInUp{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}@keyframes dot{0%,80%,100%{opacity:0}40%{opacity:1}}.dot1{animation:dot 1.4s infinite 0s}.dot2{animation:dot 1.4s infinite 0.2s}.dot3{animation:dot 1.4s infinite 0.4s}`}</style>
      <div style={{ animation: "pulse 2s ease-in-out infinite", width: 90, height: 90, borderRadius: 24, background: "linear-gradient(135deg,#b8860b,#ffd700,#b8860b)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 48, color: "#000", boxShadow: "0 0 40px rgba(255,215,0,0.4)", marginBottom: 24 }}>B</div>
      <div style={{ animation: "fadeInUp 0.8s ease forwards", color: "#fff", fontSize: 32, fontWeight: 900, letterSpacing: 2, marginBottom: 6 }}>Breeze</div>
      <div style={{ animation: "fadeInUp 1s ease forwards", color: "#ffd700", fontStyle: "italic", fontSize: 15, marginBottom: 32 }}>Indian Restaurant</div>
      <div style={{ display: "flex", gap: 8 }}>
        <span className="dot1" style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffd700", display: "inline-block" }} />
        <span className="dot2" style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffd700", display: "inline-block" }} />
        <span className="dot3" style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffd700", display: "inline-block" }} />
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "#111827", padding: 16, fontFamily: "Arial, sans-serif", color: "#111827" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={{ background: "#000", borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#b8860b,#ffd700,#b8860b)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 28, color: "#000", flexShrink: 0 }}>B</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>Breeze</div>
              <div style={{ fontSize: 13, color: "#ffd700", fontStyle: "italic", marginTop: 1 }}>Indian Restaurant</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>16 Hood St, Hamilton Central · 07 949 8159</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#1a1a1a", borderRadius: 10, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>Staff Clock In · Timesheet</div>
        </div>
        {msg && <div style={{ background: "#ffd700", borderRadius: 14, padding: 12, fontWeight: 600, color: "#000" }}>{msg}</div>}
        {!loggedIn ? (
          <div style={{ display: "flex", gap: 8, maxWidth: 320 }}>
            <button style={{ ...bStyle(activeTab==="staff"?"primary":"ghost"), background: activeTab==="staff" ? "linear-gradient(135deg,#b8860b,#ffd700)" : "#1f2937", color: activeTab==="staff" ? "#000" : "#9ca3af", border: "none", fontWeight: 700 }} onClick={() => setActiveTab("staff")}>Staff</button>
            <button style={{ ...bStyle(activeTab==="admin"?"primary":"ghost"), background: activeTab==="admin" ? "linear-gradient(135deg,#b8860b,#ffd700)" : "#1f2937", color: activeTab==="admin" ? "#000" : "#9ca3af", border: "none", fontWeight: 700 }} onClick={() => setActiveTab("admin")}>Admin</button>
          </div>
        ) : <div style={{ color: "#ffd700", fontSize: 13, fontWeight: 600 }}>✅ Staff session active</div>}
        {activeTab === "staff" ? (
          <div style={{ display: "grid", gap: 16, maxWidth: 540 }}>
            <div style={cStyle()}>
              <h2 style={{ marginTop: 0 }}>Staff Portal</h2>
              {!loggedIn ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div><div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Email</div><input style={iStyle()} value={empEmail} onChange={e => setEmpEmail(e.target.value)} placeholder="Enter your email" type="email" /></div>
                  <div><div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Password</div><input style={iStyle()} value={empPw} onChange={e => setEmpPw(e.target.value)} placeholder="Enter your password" type="password" /></div>
                  <button style={bStyle()} onClick={login}>Log In</button>
                  <button style={{ ...bStyle("ghost"), border: "none", background: "transparent", textDecoration: "underline" }} onClick={() => setShowForgot(p => !p)}>Forgot password?</button>
                  {showForgot && <div style={{ borderRadius: 14, padding: 12, background: "#fef3c7", border: "1px solid #f59e0b" }}>Please ask the business owner to reset your password from the admin page.</div>}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ ...cStyle(), padding: 16, background: "#111827", borderRadius: 16 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#ffd700" }}>
                      {selEmp && isBirthdayToday(selEmp.birthday) ? "🎂 Happy Birthday, " + selEmp.name + "!" : "👋 Welcome, " + (selEmp?.name || "") + "!"}
                    </div>
                    {selEmp && isBirthdayToday(selEmp.birthday) && (
                      <div style={{ marginTop: 6, background: "#fef3c7", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#92400e", fontWeight: 600 }}>🎉 Happy Birthday from the Breeze team!</div>
                    )}
                    {(() => {
                      const d = liveTime.getDay();
                      const seed = liveTime.getDate() + liveTime.getMonth() * 31;
                      const quote = SHIFT_QUOTES[seed % SHIFT_QUOTES.length];
                      const fact = SHIFT_FACTS[(seed + 3) % SHIFT_FACTS.length];
                      return (
                        <>
                          <div style={{ marginTop: 8, background: "#1a1a1a", borderRadius: 10, padding: "6px 12px", fontSize: 12, color: "#ffd700", fontWeight: 600 }}>{DAY_MESSAGES[d]}</div>
                          <div style={{ marginTop: 8, background: "#1a1a1a", borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Quote of the shift</div>
                            <div style={{ fontSize: 12, color: "#e5e7eb", fontStyle: "italic", lineHeight: 1.5 }}>"{quote}"</div>
                          </div>
                          <div style={{ marginTop: 8, background: "#1a1a1a", borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Did you know?</div>
                            <div style={{ fontSize: 12, color: "#e5e7eb", lineHeight: 1.5 }}>{fact}</div>
                          </div>
                        </>
                      );
                    })()}
                    <div style={{ color: "#9ca3af", marginTop: 6, fontSize: 14 }}>{liveTime.toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, weekday: "long", day: "numeric", month: "long" })}</div>
                    <div style={{ marginTop: 8, display: "inline-block", background: entries.some(e => e.employeeId === selEmp?.id && !e.clockOut) ? "#065f46" : "#1f2937", borderRadius: 10, padding: "4px 12px", fontSize: 13, fontWeight: 600, color: entries.some(e => e.employeeId === selEmp?.id && !e.clockOut) ? "#6ee7b7" : "#9ca3af" }}>
                      {entries.some(e => e.employeeId === selEmp?.id && !e.clockOut) ? "🟢 Currently Clocked In" : "⚪ Not Clocked In"}
                    </div>
                  </div>
                  <div style={cStyle()}>
                    <div style={{ fontWeight: 700, marginBottom: 16 }}>Attendance</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <button style={{ padding: "18px 12px", borderRadius: 50, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 800, background: "linear-gradient(135deg,#b8860b,#ffd700)", color: "#000" }} onClick={clockIn}>⏵ Clock In</button>
                      <button style={{ padding: "18px 12px", borderRadius: 50, border: "2px solid #d1d5db", cursor: "pointer", fontSize: 15, fontWeight: 800, background: "#fff", color: "#111827" }} onClick={clockOut}>⏹ Clock Out</button>
                    </div>
                  </div>
                  <div style={cStyle()}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Timesheet</div>
                    <select style={iStyle()} value={selFN} onChange={e => setSelFN(e.target.value)}>
                      {fnOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {fnEntries.length === 0 ? (
                      <div style={{ color: "#6b7280", marginTop: 14 }}>No records for this period.</div>
                    ) : (
                      <div style={{ marginTop: 14, display: "grid", gap: 0 }}>
                        {(() => {
                          if (!selFNRange) return null;
                          const s = new Date(selFNRange.startIso);
                          const week1End = new Date(s); week1End.setDate(s.getDate() + 6); week1End.setHours(23,59,59,999);
                          const week1 = fnEntries.filter(r => new Date(r.shifts[0].clockIn) <= week1End);
                          const week2 = fnEntries.filter(r => new Date(r.shifts[0].clockIn) > week1End);
                          const week1Hrs = week1.reduce((s,r) => s+r.hours, 0);
                          const week2Hrs = week2.reduce((s,r) => s+r.hours, 0);
                          const renderWeek = (rows, label, weekHrs) => rows.length === 0 ? null : (
                            <div key={label} style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", padding: "10px 0 6px" }}>{label}</div>
                              {rows.map(row => row.shifts.map(sh => (
                                <div key={sh.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid #f3f4f6" }}>
                                  <div style={{ fontSize: 13, color: "#6b7280", minWidth: 80 }}>
                                    {new Date(sh.clockIn).toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, weekday: "short", day: "numeric", month: "short" })}
                                  </div>
                                  <div style={{ fontSize: 13, color: "#111827" }}>
                                    {formatTimeNZ(sh.clockIn)} → {sh.clockOut ? formatTimeNZ(sh.clockOut) : "🟢 open"}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", minWidth: 56, textAlign: "right" }}>
                                    {(sh.totalHours||0).toFixed(2)} hrs
                                  </div>
                                </div>
                              )))}
                              <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0", borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#6b7280" }}>
                                Week total: <span style={{ fontWeight: 700, color: "#111827", marginLeft: 4 }}>{weekHrs.toFixed(2)} hrs</span>
                              </div>
                            </div>
                          );
                          return (
                            <>
                              {renderWeek(week1, getSummaryWeekLabel(selFNRange, 1), week1Hrs)}
                              {renderWeek(week2, getSummaryWeekLabel(selFNRange, 2), week2Hrs)}
                              <div style={{ padding: "10px 14px", background: "#111827", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: 13, color: "#9ca3af" }}>Fortnight total</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#ffd700" }}>{fnHours.toFixed(2)} hrs</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      {timesheetSubmissions.filter(t => t.employeeId === empId).length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Submission Status</div>
                          {timesheetSubmissions.filter(t => t.employeeId === empId).map(t => (
                            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f9fafb", borderRadius: 10, marginBottom: 6, border: "1px solid #e5e7eb" }}>
                              <div style={{ fontSize: 13 }}>{t.period}</div>
                              <span style={{ background: t.status==="Approved" ? "#065f46" : t.status==="Rejected" ? "#991b1b" : "#92400e", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                                {t.status==="Approved" ? "✅ Approved" : t.status==="Rejected" ? "❌ Rejected" : "⏳ Pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button style={bStyle()} onClick={submitTS}>Submit for Approval</button>
                    </div>
                  </div>
                  <button style={bStyle("ghost")} onClick={logout}>Log Out</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {!adminUnlocked ? (
              <div style={{ ...cStyle(), maxWidth: 540 }}>
                <h2 style={{ marginTop: 0 }}>Admin Login</h2>
                <div style={{ display: "grid", gap: 12 }}>
                  <div><div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Admin Password</div><input style={iStyle()} type="password" value={adminPw} onChange={e => setAdminPw(e.target.value)} placeholder="Enter admin password" /></div>
                  <button style={bStyle()} onClick={unlockAdmin}>Unlock Admin View</button>
                  <button style={{ ...bStyle("ghost"), border: "none", background: "transparent", textDecoration: "underline" }} onClick={() => setShowReset(p => !p)}>Forgot admin password?</button>
                  {showReset && (
                    <div style={{ borderRadius: 14, padding: 14, background: "#fef3c7", border: "1px solid #f59e0b", display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>Reset admin password</div>
                      <input style={iStyle()} type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Verification email" />
                      <input style={iStyle()} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" />
                      <input style={iStyle()} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm password" />
                      <button style={bStyle("secondary")} onClick={resetAdminPw}>Reset Admin Password</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {employees.filter(e => e.active !== false && isBirthdayToday(e.birthday)).map(e => (
                  <div key={e.id} style={{ background: "#fef3c7", border: "1px solid #d97706", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🎂</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>Today is {e.name}'s birthday!</div>
                        <div style={{ fontSize: 12, color: "#92400e" }}>Don't forget to wish them well 🎉</div>
                      </div>
                    </div>
                    <button style={{ background: "#92400e", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={() => { sendBirthdayEmail(e.name); setMsg("🎂 Birthday reminder sent to your email! ✅"); }}>📧 Send reminder</button>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button style={{ ...bStyle("danger"), minWidth: 180 }} onClick={() => { setAdminUnlocked(false); setMsg("Admin logged out."); }}>Log Out (Admin)</button>
                </div>
                <div style={cStyle()}>
                  <h3 style={{ marginTop: 0 }}>Employee Accounts</h3>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
                    <input style={iStyle()} placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
                    <input style={iStyle()} placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" />
                    <input style={iStyle()} placeholder="Password" value={newEmpPw} onChange={e => setNewEmpPw(e.target.value)} />
                    <select style={iStyle()} value={newRole} onChange={e => setNewRole(e.target.value)}>
                      {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div><div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>🎂 Birthday (optional)</div><input style={iStyle()} type="date" value={newBirthday} onChange={e => setNewBirthday(e.target.value)} /></div>
                    <div><div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>📅 Joining date (optional)</div><input style={iStyle()} type="date" value={newJoinDate} onChange={e => setNewJoinDate(e.target.value)} /></div>
                  </div>
                  <button style={{ ...bStyle(), width: "100%" }} onClick={addEmployee}>Add Employee</button>
                  <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                    {employees.filter(e => e.active !== false).map(emp => (
                      <div key={emp.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                        {editEmpId === emp.id ? (
                          <div style={{ display: "grid", gap: 10 }}>
                            <input style={iStyle()} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                            <input style={iStyle()} value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" />
                            <select style={iStyle()} value={editRole} onChange={e => setEditRole(e.target.value)}>
                              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <div><div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>🎂 Birthday</div><input style={iStyle()} type="date" value={editBirthday} onChange={e => setEditBirthday(e.target.value)} /></div>
                            <div><div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>📅 Joining date</div><input style={iStyle()} type="date" value={editJoinDate} onChange={e => setEditJoinDate(e.target.value)} /></div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <button style={bStyle()} onClick={() => saveEditEmp(emp.id)}>Save</button>
                              <button style={bStyle("ghost")} onClick={() => setEditEmpId("")}>Cancel</button>
                            </div>
                          </div>
                        ) : resetPwId === emp.id ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={{ fontWeight: 700 }}>{emp.name} — Reset Password</div>
                            <input style={iStyle()} value={resetPwVal} onChange={e => setResetPwVal(e.target.value)} placeholder="New password" />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <button style={bStyle()} onClick={() => savePwReset(emp.id)}>Save</button>
                              <button style={bStyle("ghost")} onClick={() => setResetPwId("")}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpandedEmpId(expandedEmpId === emp.id ? "" : emp.id)}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{emp.name}</div>
                                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2, wordBreak: "break-all" }}>{emp.email}</div>
                                <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                                  {emp.birthday && <div style={{ fontSize: 12, color: isBirthdayToday(emp.birthday) ? "#92400e" : "#6b7280", fontWeight: isBirthdayToday(emp.birthday) ? 700 : 400 }}>🎂 {isBirthdayToday(emp.birthday) ? "Today! " : ""}{formatBirthday(emp.birthday)}</div>}
                                  {emp.joinDate && (() => { const jd = formatJoinDate(emp.joinDate); return jd ? <div style={{ fontSize: 12, color: "#6b7280" }}>📅 Joined {jd.label} · {jd.duration}</div> : null; })()}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ background: "#111827", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12 }}>{emp.role}</span>
                                {isBirthdayToday(emp.birthday) && <span style={{ fontSize: 16 }}>🎂</span>}
                                <span style={{ fontSize: 18, color: "#6b7280" }}>{expandedEmpId === emp.id ? "▲" : "▼"}</span>
                              </div>
                            </div>
                            {expandedEmpId === emp.id && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                                <button style={bStyle("secondary")} onClick={() => { setEditEmpId(emp.id); setEditName(emp.name); setEditEmail(emp.email); setEditRole(emp.role); setEditBirthday(emp.birthday||""); setEditJoinDate(emp.joinDate||""); }}>✏️ Edit</button>
                                <button style={bStyle("secondary")} onClick={() => { setResetPwId(emp.id); setResetPwVal(emp.password||""); }}>🔑 Reset PW</button>
                                <button style={bStyle("danger")} onClick={() => removeEmp(emp.id)}>🗑️ Remove</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={cStyle()}>
                  {/* Admin View header with List/Summary toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h3 style={{ margin: 0 }}>Admin View</h3>
                    <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden" }}>
                      <button
                        onClick={() => setAdminViewMode("list")}
                        style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: adminViewMode === "list" ? "#111827" : "#f3f4f6", color: adminViewMode === "list" ? "#fff" : "#6b7280" }}
                      >List</button>
                      <button
                        onClick={() => setAdminViewMode("summary")}
                        style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: adminViewMode === "summary" ? "#111827" : "#f3f4f6", color: adminViewMode === "summary" ? "#fff" : "#6b7280" }}
                      >Summary</button>
                    </div>
                  </div>
                  <div style={{ color: "#6b7280", marginBottom: 12, fontSize: 13 }}>Live shifts from all devices 🔥</div>

                  {/* Fortnight selector — shared between both views */}
                  <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                    <select style={iStyle()} value={selAdminFN} onChange={e => setSelAdminFN(e.target.value)}>
                      {fnOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {adminViewMode === "list" && (
                      <select style={iStyle()} value={adminFilter} onChange={e => setAdminFilter(e.target.value)}>
                        <option value="all">All shifts</option>
                        <option value="open">Open only</option>
                        <option value="closed">Closed only</option>
                      </select>
                    )}
                  </div>

                  {adminViewMode === "list" ? (
                    <>
                      <button style={{ ...bStyle("secondary"), width: "100%", marginBottom: 12 }} onClick={() => setShowAddShift(p => !p)}>➕ Add Manual Shift</button>
                      {showAddShift && (
                        <div style={{ border: "2px solid #ffd700", borderRadius: 14, padding: 14, marginBottom: 16, background: "#fffbeb", display: "grid", gap: 10 }}>
                          <div style={{ fontWeight: 700 }}>➕ Add Manual Shift</div>
                          <select style={iStyle()} value={addShiftEmpId} onChange={e => setAddShiftEmpId(e.target.value)}>
                            <option value="">Select employee...</option>
                            {employees.filter(e => e.active !== false).map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                            ))}
                          </select>
                          <div>
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Clock In</div>
                            <input style={iStyle()} type="datetime-local" value={addShiftIn} onChange={e => setAddShiftIn(e.target.value)} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Clock Out <span style={{ fontWeight: 400 }}>(leave blank if still working)</span></div>
                            <input style={iStyle()} type="datetime-local" value={addShiftOut} onChange={e => setAddShiftOut(e.target.value)} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button style={bStyle()} onClick={addManualShift}>Save Shift</button>
                            <button style={bStyle("ghost")} onClick={() => { setShowAddShift(false); setAddShiftEmpId(""); setAddShiftIn(""); setAddShiftOut(""); }}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {editShiftId && (
                        <div style={{ ...cStyle(), marginBottom: 16, border: "2px solid #ffd700" }}>
                          <div style={{ fontWeight: 700, marginBottom: 12 }}>✏️ Edit Shift</div>
                          <div style={{ display: "grid", gap: 10 }}>
                            <div><div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Clock In</div><input style={iStyle()} type="datetime-local" value={editShiftIn} onChange={e => setEditShiftIn(e.target.value)} /></div>
                            <div><div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Clock Out</div><div style={{ display: "flex", gap: 8 }}><input style={{ ...iStyle(), flex: 1 }} type="datetime-local" value={editShiftOut} onChange={e => setEditShiftOut(e.target.value)} /><button style={{ ...bStyle("ghost"), whiteSpace: "nowrap", padding: "12px 10px" }} onClick={() => setEditShiftOut("")}>✕ Clear</button></div></div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <button style={bStyle()} onClick={() => saveShiftEdit(editShiftId)}>Save</button>
                              <button style={bStyle("ghost")} onClick={() => setEditShiftId("")}>Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {filteredEntries.length === 0 ? (
                        <div style={{ color: "#6b7280", padding: "8px 0" }}>No shift records yet.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {Object.values(filteredEntries.reduce((g, e) => {
                            const dk = formatDateNZ(e.clockIn);
                            const k = `${e.employeeId}_${dk}`;
                            if (!g[k]) g[k] = { employeeId: e.employeeId, employeeName: e.employeeName, role: e.role, date: dk, shifts: [], totalHours: 0, sortValue: new Date(e.clockIn).getTime() };
                            g[k].shifts.push(e); g[k].totalHours += e.totalHours || 0;
                            return g;
                          }, {})).sort((a, b) => b.sortValue - a.sortValue).map(group => (
                            <div key={`${group.employeeId}_${group.date}`} style={{ border: group.shifts.some(s => !s.clockOut || (s.totalHours||0) > 12) ? "2px solid #f97316" : getPublicHoliday(group.shifts[0].clockIn) ? "1px solid #d97706" : "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: group.shifts.some(s => !s.clockOut || (s.totalHours||0) > 12) ? "#fff7ed" : getPublicHoliday(group.shifts[0].clockIn) ? "#fffbeb" : "#f9fafb" }}>
                              {group.shifts.some(s => !s.clockOut || (s.totalHours||0) > 12) && (
                                <div style={{ background: "#f97316", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, marginBottom: 10, display: "inline-block" }}>⚠️ Check this shift</div>
                              )}
                              {getPublicHoliday(group.shifts[0].clockIn) && (
                                <div style={{ background: "#fef3c7", color: "#92400e", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  🇳🇿 {getPublicHoliday(group.shifts[0].clockIn)} — Public holiday pay rate applies
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 16 }}>{group.employeeName}</div>
                                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{group.date}</div>
                                </div>
                                <span style={{ background: "#111827", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12 }}>{group.role}</span>
                              </div>
                              {group.shifts.map((e, i) => (
                                <div key={e.id}>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 6 }}>
                                    <div><div style={{ color: "#6b7280", marginBottom: 2 }}>Clock In</div><div style={{ fontWeight: 600 }}>{formatTimeNZ(e.clockIn)}</div></div>
                                    <div><div style={{ color: "#6b7280", marginBottom: 2 }}>Clock Out</div><div style={{ fontWeight: 600 }}>{e.clockOut ? formatTimeNZ(e.clockOut) : "🟢 Still in"}</div></div>
                                  </div>
                                  {e.totalHours != null && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Shift {i+1}: <strong>{e.totalHours.toFixed(2)} hrs</strong></div>}
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: i < group.shifts.length-1 ? 12 : 0 }}>
                                    <button style={bStyle("secondary")} onClick={() => { setEditShiftId(e.id); const toLocal = iso => { const d = new Date(iso); const nz = new Date(d.toLocaleString("en-US",{timeZone:NZ_TIMEZONE})); const p = n => String(n).padStart(2,"0"); return `${nz.getFullYear()}-${p(nz.getMonth()+1)}-${p(nz.getDate())}T${p(nz.getHours())}:${p(nz.getMinutes())}`; }; setEditShiftIn(toLocal(e.clockIn)); setEditShiftOut(e.clockOut ? toLocal(e.clockOut) : ""); }}>✏️ Edit</button>
                                    <button style={bStyle("danger")} onClick={() => delShift(e.id)}>🗑️ Delete</button>
                                  </div>
                                  {i < group.shifts.length-1 && <div style={{ borderTop: "1px dashed #e5e7eb", margin: "10px 0" }} />}
                                </div>
                              ))}
                              {group.shifts.length > 1 && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb", fontSize: 13, fontWeight: 700 }}>Day Total: {group.totalHours.toFixed(2)} hrs</div>}
                            </div>
                          ))}
                          <div style={{ padding: 14, background: "#111827", borderRadius: 14, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 14 }}>Total Hours (this period)</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: "#ffd700" }}>{filteredEntries.reduce((s, e) => s + (e.totalHours||0), 0).toFixed(2)} hrs</div>
                          </div>
                          <button style={{ ...bStyle(), background: "linear-gradient(135deg,#b8860b,#ffd700)", color: "#000", width: "100%", fontWeight: 800 }} onClick={downloadCSV}>⬇️ Download Timesheet CSV for Xero</button>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ── SUMMARY VIEW ── */
                    <div style={{ display: "grid", gap: 12 }}>
                      {summaryData.length === 0 ? (
                        <div style={{ color: "#6b7280", padding: "8px 0" }}>No completed shifts for this period.</div>
                      ) : (
                        <>
                          {summaryData.map(emp => {
                            const isOpen = expandedSummaryEmpId === emp.employeeId;
                            const week1Hrs = emp.week1.reduce((s, sh) => s + (sh.totalHours||0), 0);
                            const week2Hrs = emp.week2.reduce((s, sh) => s + (sh.totalHours||0), 0);
                            return (
                              <div key={emp.employeeId} style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", background: "#fff" }}>
                                {/* Card header — tap to expand */}
                                <div
                                  onClick={() => setExpandedSummaryEmpId(isOpen ? "" : emp.employeeId)}
                                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer", background: isOpen ? "#f9fafb" : "#fff" }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#ffd700", flexShrink: 0 }}>
                                      {emp.employeeName.slice(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{emp.employeeName}</div>
                                      <span style={{ background: "#111827", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{emp.role}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ textAlign: "right" }}>
                                      <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{emp.totalHours.toFixed(2)}</div>
                                      <div style={{ fontSize: 11, color: "#6b7280" }}>total hrs</div>
                                    </div>
                                    <span style={{ fontSize: 16, color: "#6b7280" }}>{isOpen ? "▲" : "▼"}</span>
                                  </div>
                                </div>

                                {/* Expanded shift breakdown */}
                                {isOpen && (
                                  <div style={{ borderTop: "1px solid #e5e7eb", padding: "0 16px 14px" }}>
                                    {[{ label: getSummaryWeekLabel(selAdminFNRange, 1), shifts: emp.week1, hrs: week1Hrs }, { label: getSummaryWeekLabel(selAdminFNRange, 2), shifts: emp.week2, hrs: week2Hrs }].map(week => (
                                      week.shifts.length > 0 && (
                                        <div key={week.label}>
                                          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 0 6px" }}>{week.label}</div>
                                          {week.shifts.sort((a,b) => new Date(a.clockIn)-new Date(b.clockIn)).map(sh => (
                                            <div key={sh.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid #f3f4f6" }}>
                                              <div style={{ fontSize: 13, color: "#6b7280", minWidth: 88 }}>
                                                {new Date(sh.clockIn).toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, weekday: "short", day: "numeric", month: "short" })}
                                              </div>
                                              <div style={{ fontSize: 13, color: "#111827" }}>
                                                {formatTimeNZ(sh.clockIn)} → {sh.clockOut ? formatTimeNZ(sh.clockOut) : "🟢 open"}
                                              </div>
                                              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", minWidth: 60, textAlign: "right" }}>
                                                {(sh.totalHours||0).toFixed(2)} hrs
                                              </div>
                                            </div>
                                          ))}
                                          <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0", borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#6b7280" }}>
                                            Week total: <span style={{ fontWeight: 700, color: "#111827", marginLeft: 4 }}>{week.hrs.toFixed(2)} hrs</span>
                                          </div>
                                        </div>
                                      )
                                    ))}
                                    {/* Fortnight total bar */}
                                    <div style={{ marginTop: 8, padding: "10px 14px", background: "#111827", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <div style={{ fontSize: 13, color: "#9ca3af" }}>Fortnight total</div>
                                      <div style={{ fontSize: 18, fontWeight: 700, color: "#ffd700" }}>{emp.totalHours.toFixed(2)} hrs</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {/* Period total across all employees */}
                          <div style={{ padding: 14, background: "#111827", borderRadius: 14, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 14 }}>All staff — period total</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: "#ffd700" }}>{summaryData.reduce((s,e)=>s+e.totalHours,0).toFixed(2)} hrs</div>
                          </div>
                          <button style={{ ...bStyle(), background: "linear-gradient(135deg,#b8860b,#ffd700)", color: "#000", width: "100%", fontWeight: 800 }} onClick={downloadCSV}>⬇️ Download Timesheet CSV for Xero</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div style={cStyle()}>
                  <h3 style={{ margin: "0 0 4px 0" }}>Timesheet Approvals</h3>
                  <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>Review and approve submitted timesheets</div>
                  <select style={{ ...iStyle(), marginBottom: 16 }} value={tsFilter} onChange={e => setTsFilter(e.target.value)}>
                    <option value="all">All timesheets</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                  </select>
                  {filteredTs.length === 0 ? (
                    <div style={{ color: "#6b7280" }}>No timesheets yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {filteredTs.map(item => (
                        <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontWeight: 700 }}>{item.employeeName}</div>
                            <span style={{ background: item.status==="Approved" ? "#065f46" : "#92400e", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12 }}>{item.status}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{item.period}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{item.hours.toFixed(2)} hrs</div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Submitted: {formatDateTimeNZ(item.submittedAt)}</div>
                          {editTsId === item.id ? (
                            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                              <input style={iStyle()} type="number" step="0.01" min="0" value={editTsHrs} onChange={e => setEditTsHrs(e.target.value)} placeholder="Edit hours" />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <button style={bStyle()} onClick={() => saveTsEdit(item.id)}>Save</button>
                                <button style={bStyle("ghost")} onClick={() => setEditTsId("")}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button style={{ ...bStyle("ghost"), width: "100%", marginBottom: 8 }} onClick={() => { setEditTsId(item.id); setEditTsHrs(String(item.hours.toFixed(2))); }}>Edit Hours</button>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button style={bStyle()} onClick={() => updateTsStatus(item.id, "Approved")}>Approve</button>
                            <button style={bStyle("secondary")} onClick={() => updateTsStatus(item.id, "Rejected")}>Reject</button>
                          </div>
                          {(item.status === "Approved" || item.status === "Rejected") && (
                            <button style={{ ...bStyle("ghost"), width: "100%", marginTop: 8 }} onClick={() => updateTsStatus(item.id, "Pending")}>↩️ Undo — Reset to Pending</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
