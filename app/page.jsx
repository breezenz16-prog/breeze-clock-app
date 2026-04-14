"use client";
import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, updateDoc, onSnapshot, query, orderBy
} from "firebase/firestore";

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

const defaultEmployees = [
  { id: "emp-1", name: "Noor", email: "noor@breeze.local", password: "1111", role: "FOH", active: true },
  { id: "emp-2", name: "Smith", email: "smith@breeze.local", password: "2222", role: "Chef", active: true },
  { id: "emp-3", name: "Ramzan", email: "ramzan@breeze.local", password: "3333", role: "Cook", active: true },
  { id: "emp-4", name: "Seema", email: "seema@breeze.local", password: "4444", role: "FOH", active: true },
];

const roleOptions = ["FOH", "Manager", "Chef", "Cook", "Kitchen"];

function nowIso() { return new Date().toISOString(); }

function formatDateTimeNZ(value) {
  return new Date(value).toLocaleString("en-NZ", {
    timeZone: NZ_TIMEZONE, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDateNZ(value) {
  return new Date(value).toLocaleDateString("en-NZ", {
    timeZone: NZ_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  });
}

function hoursBetween(start, end) {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60));
}

function getFortnightOptions(count = 8) {
  const today = new Date();
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setHours(0, 0, 0, 0);
  currentMonday.setDate(today.getDate() - daysSinceMonday);
  const options = [];
  for (let i = 0; i < count; i++) {
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() - i * 14);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 13);
    end.setHours(23, 59, 59, 999);
    options.push({
      value: `${start.toISOString()}__${end.toISOString()}`,
      label: `${formatDateNZ(start)} - ${formatDateNZ(end)}`,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
  }
  return options;
}

function inputStyle() {
  return { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" };
}

function buttonStyle(kind = "primary") {
  const base = { padding: "12px 14px", borderRadius: 12, border: "1px solid #111827", cursor: "pointer", fontSize: 14, fontWeight: 600 };
  if (kind === "secondary") return { ...base, background: "#fff", color: "#111827" };
  if (kind === "danger") return { ...base, background: "#991b1b", color: "#fff", borderColor: "#991b1b" };
  if (kind === "ghost") return { ...base, background: "#f3f4f6", color: "#111827", borderColor: "#d1d5db" };
  return { ...base, background: "#111827", color: "#fff" };
}

function cardStyle() {
  return { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
}

const defaultAdminSettings = { email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD };

export default function Page() {
  const [employees, setEmployees] = useState(defaultEmployees);
  const [entries, setEntries] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [timesheetSubmissions, setTimesheetSubmissions] = useState([]);
  const [activeShifts, setActiveShifts] = useState({});
  const [adminSettings, setAdminSettings] = useState(defaultAdminSettings);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("staff");
  const [message, setMessage] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employeeLoggedIn, setEmployeeLoggedIn] = useState(false);
  const [showForgotStaffPassword, setShowForgotStaffPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showAdminReset, setShowAdminReset] = useState(false);
  const [adminResetEmail, setAdminResetEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState("all");
  const [selectedFortnight, setSelectedFortnight] = useState("");
  const [selectedAdminFortnight, setSelectedAdminFortnight] = useState("");
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeePassword, setNewEmployeePassword] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState("FOH");
  const [editingEmployeeId, setEditingEmployeeId] = useState("");
  const [editingEmployeeName, setEditingEmployeeName] = useState("");
  const [editingEmployeeEmail, setEditingEmployeeEmail] = useState("");
  const [editingEmployeeRole, setEditingEmployeeRole] = useState("FOH");
  const [resetPasswordEmployeeId, setResetPasswordEmployeeId] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [editingTimesheetId, setEditingTimesheetId] = useState("");
  const [editingTimesheetHours, setEditingTimesheetHours] = useState("");

  const fortnightOptions = useMemo(() => getFortnightOptions(), []);

  useEffect(() => {
    if (!selectedFortnight && fortnightOptions[0]) setSelectedFortnight(fortnightOptions[0].value);
    if (!selectedAdminFortnight && fortnightOptions[0]) setSelectedAdminFortnight(fortnightOptions[0].value);
  }, [fortnightOptions, selectedFortnight, selectedAdminFortnight]);

  // 🔥 Load all data from Firestore in real time
  useEffect(() => {
    const unsubShifts = onSnapshot(query(collection(db, "shifts"), orderBy("clockIn", "desc")), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEntries(data);
      const open = {};
      data.forEach(e => { if (!e.clockOut) open[e.employeeId] = e.id; });
      setActiveShifts(open);
    });

    const unsubEmployees = onSnapshot(collection(db, "employees"), (snap) => {
      if (snap.empty) {
        // Seed default employees if none exist
        defaultEmployees.forEach(emp => addDoc(collection(db, "employees"), emp));
      } else {
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      setLoading(false);
    });

    const unsubLeave = onSnapshot(query(collection(db, "leaveRequests"), orderBy("requestedAt", "desc")), (snap) => {
      setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTimesheets = onSnapshot(query(collection(db, "timesheetSubmissions"), orderBy("submittedAt", "desc")), (snap) => {
      setTimesheetSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(collection(db, "settings"), (snap) => {
      if (snap.empty) {
        addDoc(collection(db, "settings"), defaultAdminSettings);
      } else {
        setAdminSettings(snap.docs[0].data());
      }
    });

    return () => { unsubShifts(); unsubEmployees(); unsubLeave(); unsubTimesheets(); unsubSettings(); };
  }, []);

  useEffect(() => {
    if (!adminUnlocked) return;
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { setAdminUnlocked(false); setMessage("Admin logged out after 10 minutes of inactivity."); }, ADMIN_IDLE_TIMEOUT_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => { clearTimeout(timeoutId); events.forEach(e => window.removeEventListener(e, resetTimer)); };
  }, [adminUnlocked]);

  const selectedEmployee = useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  const selectedEmployeeByEmail = useMemo(() => employees.find(e => e.active !== false && (e.email || "").toLowerCase() === employeeEmail.trim().toLowerCase()), [employees, employeeEmail]);
  const selectedFortnightRange = useMemo(() => fortnightOptions.find(o => o.value === selectedFortnight) || fortnightOptions[0], [fortnightOptions, selectedFortnight]);
  const selectedAdminFortnightRange = useMemo(() => fortnightOptions.find(o => o.value === selectedAdminFortnight) || fortnightOptions[0], [fortnightOptions, selectedAdminFortnight]);

  const filteredEntries = useMemo(() => {
    const start = selectedAdminFortnightRange ? new Date(selectedAdminFortnightRange.startIso) : null;
    const end = selectedAdminFortnightRange ? new Date(selectedAdminFortnightRange.endIso) : null;
    const byPeriod = entries.filter(e => {
      if (!start || !end) return true;
      const ci = new Date(e.clockIn);
      return ci >= start && ci <= end;
    });
    if (adminFilter === "open") return byPeriod.filter(e => !e.clockOut);
    if (adminFilter === "closed") return byPeriod.filter(e => !!e.clockOut);
    return byPeriod;
  }, [entries, adminFilter, selectedAdminFortnightRange]);

  const fortnightEntries = useMemo(() => {
    if (!employeeId || !selectedFortnightRange) return [];
    const start = new Date(selectedFortnightRange.startIso);
    const end = new Date(selectedFortnightRange.endIso);
    const grouped = entries
      .filter(e => e.employeeId === employeeId && e.clockOut)
      .filter(e => { const ci = new Date(e.clockIn); return ci >= start && ci <= end; })
      .reduce((acc, e) => {
        const dk = formatDateNZ(e.clockIn);
        if (!acc[dk]) acc[dk] = { date: dk, hours: 0, sortValue: new Date(e.clockIn).getTime(), shifts: [] };
        acc[dk].hours += e.totalHours || 0;
        acc[dk].shifts.push(e);
        return acc;
      }, {});
    return Object.values(grouped).sort((a, b) => b.sortValue - a.sortValue);
  }, [entries, employeeId, selectedFortnightRange]);

  const fortnightHours = useMemo(() => fortnightEntries.reduce((s, r) => s + r.hours, 0), [fortnightEntries]);
  const filteredLeaveRequests = useMemo(() => leaveStatusFilter === "all" ? leaveRequests : leaveRequests.filter(r => r.status.toLowerCase() === leaveStatusFilter), [leaveRequests, leaveStatusFilter]);
  const filteredTimesheetSubmissions = useMemo(() => timesheetStatusFilter === "all" ? timesheetSubmissions : timesheetSubmissions.filter(i => i.status.toLowerCase() === timesheetStatusFilter), [timesheetSubmissions, timesheetStatusFilter]);
  const employeeSummary = useMemo(() => {
    const totals = {};
    entries.forEach(e => {
      if (!totals[e.employeeId]) totals[e.employeeId] = { employeeName: e.employeeName, role: e.role, shifts: 0, open: 0, hours: 0 };
      totals[e.employeeId].shifts++;
      totals[e.employeeId].hours += e.totalHours || 0;
      if (!e.clockOut) totals[e.employeeId].open++;
    });
    return Object.values(totals).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [entries]);

  function handleEmployeeLogin() {
    if (!selectedEmployeeByEmail) { setMessage("No active staff account found for this email."); return; }
    if (selectedEmployeeByEmail.password !== employeePassword) { setMessage("Incorrect password."); return; }
    setEmployeeId(selectedEmployeeByEmail.id);
    setEmployeeLoggedIn(true);
    setActiveTab("staff");
    setShowForgotStaffPassword(false);
    setEmployeePassword("");
    setMessage(`${selectedEmployeeByEmail.name} logged in successfully.`);
  }

  function handleEmployeeLogout() {
    setEmployeeLoggedIn(false); setEmployeeId(""); setEmployeeEmail(""); setEmployeePassword(""); setMessage("Staff logged out.");
  }

  async function handleClockIn() {
    if (!selectedEmployee) return;
    if (activeShifts[selectedEmployee.id]) { setMessage("Already clocked in."); return; }
    try {
      await addDoc(collection(db, "shifts"), {
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        role: selectedEmployee.role,
        clockIn: nowIso(),
        clockOut: null,
        totalHours: null,
      });
      setMessage(`${selectedEmployee.name} clocked in. ✅`);
    } catch (err) { setMessage("Error clocking in. Please try again."); }
  }

  async function handleClockOut() {
    if (!selectedEmployee) return;
    const activeId = activeShifts[selectedEmployee.id];
    if (!activeId) { setMessage("Not clocked in."); return; }
    const stamp = nowIso();
    const entry = entries.find(e => e.id === activeId);
    if (!entry) return;
    try {
      await updateDoc(doc(db, "shifts", activeId), {
        clockOut: stamp,
        totalHours: hoursBetween(entry.clockIn, stamp),
      });
      setMessage(`${selectedEmployee.name} clocked out. ✅`);
    } catch (err) { setMessage("Error clocking out. Please try again."); }
  }

  async function handleLeaveRequest() {
    if (!selectedEmployee) return;
    if (!leaveStartDate || !leaveEndDate) { setMessage("Please select leave start and end dates."); return; }
    if (new Date(leaveEndDate) < new Date(leaveStartDate)) { setMessage("Leave end date cannot be before start date."); return; }
    try {
      await addDoc(collection(db, "leaveRequests"), {
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        type: leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason.trim(),
        status: "Pending",
        requestedAt: nowIso(),
      });
      setLeaveType("annual"); setLeaveStartDate(""); setLeaveEndDate(""); setLeaveReason("");
      setMessage("Leave request submitted. ✅");
    } catch (err) { setMessage("Error submitting leave request."); }
  }

  async function handleSubmitTimesheet() {
    if (!selectedEmployee || !selectedFortnightRange) return;
    const existingPending = timesheetSubmissions.find(i => i.employeeId === selectedEmployee.id && i.period === selectedFortnightRange.label && i.status === "Pending");
    if (existingPending) { setMessage("A timesheet for this fortnight is already pending approval."); return; }
    try {
      await addDoc(collection(db, "timesheetSubmissions"), {
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        period: selectedFortnightRange.label,
        hours: fortnightHours,
        status: "Pending",
        submittedAt: nowIso(),
      });
      setMessage("Timesheet submitted for approval. ✅");
    } catch (err) { setMessage("Error submitting timesheet."); }
  }

  function handleAdminUnlock() {
    if (adminPassword !== adminSettings.password) { setMessage("Incorrect admin password."); return; }
    setAdminUnlocked(true); setAdminPassword(""); setShowAdminReset(false); setMessage("Admin access granted.");
  }

  function handleAdminLogout() { setAdminUnlocked(false); setMessage("Admin logged out."); }

  async function handleAdminPasswordReset() {
    if (adminResetEmail.trim().toLowerCase() !== adminSettings.email.toLowerCase()) { setMessage("Admin verification failed."); return; }
    if (!newAdminPassword.trim()) { setMessage("Please enter a new admin password."); return; }
    if (newAdminPassword !== confirmAdminPassword) { setMessage("Admin passwords do not match."); return; }
    try {
      const snap = await getDocs(collection(db, "settings"));
      if (!snap.empty) await updateDoc(doc(db, "settings", snap.docs[0].id), { password: newAdminPassword });
      setAdminResetEmail(""); setNewAdminPassword(""); setConfirmAdminPassword(""); setShowAdminReset(false);
      setMessage("Admin password reset successfully.");
    } catch (err) { setMessage("Error resetting password."); }
  }

  async function handleAddEmployee() {
    const name = newEmployeeName.trim();
    const email = newEmployeeEmail.trim().toLowerCase();
    const password = newEmployeePassword.trim();
    if (!name || !email || !password) { setMessage("Please enter employee name, email, and password."); return; }
    if (employees.some(e => e.email.toLowerCase() === email)) { setMessage("An employee with this email already exists."); return; }
    try {
      await addDoc(collection(db, "employees"), { name, email, password, role: newEmployeeRole, active: true });
      setNewEmployeeName(""); setNewEmployeeEmail(""); setNewEmployeePassword(""); setNewEmployeeRole("FOH");
      setMessage("Employee account created. ✅");
    } catch (err) { setMessage("Error creating employee."); }
  }

  function startEditEmployee(emp) { setEditingEmployeeId(emp.id); setEditingEmployeeName(emp.name); setEditingEmployeeEmail(emp.email); setEditingEmployeeRole(emp.role); }

  async function saveEditEmployee(empId) {
    const name = editingEmployeeName.trim();
    const email = editingEmployeeEmail.trim().toLowerCase();
    if (!name || !email) { setMessage("Please enter employee name and email."); return; }
    if (employees.some(e => e.id !== empId && e.email.toLowerCase() === email)) { setMessage("Another employee already uses this email."); return; }
    try {
      await updateDoc(doc(db, "employees", empId), { name, email, role: editingEmployeeRole });
      setEditingEmployeeId(""); setMessage("Employee details updated. ✅");
    } catch (err) { setMessage("Error updating employee."); }
  }

  async function saveResetPassword(empId) {
    const password = resetPasswordValue.trim();
    if (!password) { setMessage("Please enter a password."); return; }
    try {
      await updateDoc(doc(db, "employees", empId), { password });
      setResetPasswordEmployeeId(""); setResetPasswordValue(""); setMessage("Employee password reset successfully. ✅");
    } catch (err) { setMessage("Error resetting password."); }
  }

  async function removeEmployee(empId) {
    try {
      await updateDoc(doc(db, "employees", empId), { active: false });
      if (selectedEmployee?.id === empId) handleEmployeeLogout();
      setMessage("Employee deactivated. ✅");
    } catch (err) { setMessage("Error removing employee."); }
  }

  async function updateLeaveStatus(reqId, status) {
    try {
      await updateDoc(doc(db, "leaveRequests", reqId), { status });
      setMessage(`Leave request ${status.toLowerCase()}. ✅`);
    } catch (err) { setMessage("Error updating leave request."); }
  }

  async function updateTimesheetStatus(subId, status) {
    try {
      await updateDoc(doc(db, "timesheetSubmissions", subId), { status });
      setMessage(`Timesheet ${status.toLowerCase()}. ✅`);
    } catch (err) { setMessage("Error updating timesheet."); }
  }

  async function saveEditTimesheet(subId) {
    const parsedHours = Number(editingTimesheetHours);
    if (isNaN(parsedHours) || parsedHours < 0) { setMessage("Please enter valid hours."); return; }
    try {
      await updateDoc(doc(db, "timesheetSubmissions", subId), { hours: parsedHours });
      setEditingTimesheetId(""); setEditingTimesheetHours(""); setMessage("Timesheet hours updated. ✅");
    } catch (err) { setMessage("Error updating timesheet."); }
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial", fontSize: 18 }}>Loading Breeze...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#111827", padding: 16, fontFamily: "Arial, sans-serif", color: "#111827" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={{ background: "#000", borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #b8860b, #ffd700, #b8860b)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 28, color: "#000", flexShrink: 0, boxShadow: "0 2px 8px rgba(184,134,11,0.4)" }}>B</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>Breeze</div>
              <div style={{ fontSize: 13, color: "#ffd700", fontStyle: "italic", marginTop: 1 }}>Indian Restaurant</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>16 Hood St, Hamilton Central · 07 949 8159</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#1a1a1a", borderRadius: 10, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            Staff Clock In · Timesheet · Leave System
          </div>
        </div>

        {message ? <div style={{ background: "#ffd700", borderRadius: 14, padding: 12, fontWeight: 600, color: "#000" }}>{message}</div> : null}

        {!employeeLoggedIn ? (
          <div style={{ display: "flex", gap: 8, maxWidth: 320 }}>
            <button style={{ ...buttonStyle(activeTab === "staff" ? "primary" : "ghost"), background: activeTab === "staff" ? "linear-gradient(135deg, #b8860b, #ffd700)" : "#1f2937", color: activeTab === "staff" ? "#000" : "#9ca3af", border: "none", fontWeight: 700 }} onClick={() => setActiveTab("staff")}>Staff</button>
            <button style={{ ...buttonStyle(activeTab === "admin" ? "primary" : "ghost"), background: activeTab === "admin" ? "linear-gradient(135deg, #b8860b, #ffd700)" : "#1f2937", color: activeTab === "admin" ? "#000" : "#9ca3af", border: "none", fontWeight: 700 }} onClick={() => setActiveTab("admin")}>Admin</button>
          </div>
        ) : <div style={{ color: "#ffd700", fontSize: 13, fontWeight: 600 }}>✅ Staff session active</div>}

        {activeTab === "staff" ? (
          <div style={{ display: "grid", gap: 16, maxWidth: 540 }}>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Staff Portal</h2>
              {!employeeLoggedIn ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Email</div>
                    <input style={inputStyle()} value={employeeEmail} onChange={e => setEmployeeEmail(e.target.value)} placeholder="Enter your email" type="email" />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Password</div>
                    <input style={inputStyle()} value={employeePassword} onChange={e => setEmployeePassword(e.target.value)} placeholder="Enter your password" type="password" />
                  </div>
                  <button style={buttonStyle()} onClick={handleEmployeeLogin}>Log In</button>
                  <button style={{ ...buttonStyle("ghost"), border: "none", background: "transparent", textDecoration: "underline" }} onClick={() => setShowForgotStaffPassword(p => !p)}>Forgot password?</button>
                  {showForgotStaffPassword && <div style={{ borderRadius: 14, padding: 12, background: "#fef3c7", border: "1px solid #f59e0b" }}>Please ask the business owner to reset your password from the admin page.</div>}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ ...cardStyle(), padding: 14, background: "#f9fafb" }}>
                    <div style={{ fontWeight: 700 }}>{selectedEmployee?.name}</div>
                    <div style={{ color: "#6b7280", marginTop: 4 }}>{activeShifts[selectedEmployee?.id] ? "🟢 Clocked In" : "⚪ Not Clocked In"}</div>
                  </div>
                  <div style={cardStyle()}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Attendance</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button style={buttonStyle()} onClick={handleClockIn}>Clock In</button>
                      <button style={buttonStyle("secondary")} onClick={handleClockOut}>Clock Out</button>
                    </div>
                  </div>
                  <div style={cardStyle()}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Timesheet</div>
                    <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Select fortnight</div>
                    <select style={inputStyle()} value={selectedFortnight} onChange={e => setSelectedFortnight(e.target.value)}>
                      {fortnightOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div style={{ fontSize: 32, fontWeight: 700, marginTop: 14 }}>{fortnightHours.toFixed(2)} hrs</div>
                    <div style={{ color: "#6b7280", marginTop: 4 }}>Total hours worked in the selected fortnight (NZ time)</div>
                    <div style={{ overflowX: "auto", marginTop: 14 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr><th style={{ textAlign: "left", padding: "8px 0" }}>Date</th><th style={{ textAlign: "right", padding: "8px 0" }}>Hours</th></tr></thead>
                        <tbody>
                          {fortnightEntries.length === 0 ? <tr><td colSpan={2} style={{ padding: "8px 0", color: "#6b7280" }}>No records</td></tr>
                            : fortnightEntries.map(row => (
                              <tr key={row.date}>
                                <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                                  <div>{row.date}</div>
                                  <div style={{ color: "#6b7280", fontSize: 12 }}>{row.shifts.map(s => `${formatDateTimeNZ(s.clockIn)} - ${s.clockOut ? formatDateTimeNZ(s.clockOut) : "Open"}`).join(" | ")}</div>
                                </td>
                                <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>{row.hours.toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 12 }}><button style={buttonStyle()} onClick={handleSubmitTimesheet}>Submit for Approval</button></div>
                  </div>
                  <div style={cardStyle()}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Leave Request</div>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Leave type</div>
                        <select style={inputStyle()} value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                          <option value="annual">Annual Leave</option>
                          <option value="sick">Sick Leave</option>
                          <option value="unpaid">Unpaid Leave</option>
                          <option value="bereavement">Bereavement Leave</option>
                          <option value="other">Other Leave</option>
                        </select>
                      </div>
                      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                        <div><div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Start date</div><input style={inputStyle()} type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} /></div>
                        <div><div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>End date</div><input style={inputStyle()} type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} /></div>
                      </div>
                      <div><div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Reason (optional)</div><input style={inputStyle()} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Optional reason" /></div>
                      <button style={buttonStyle("secondary")} onClick={handleLeaveRequest}>Submit Leave Request</button>
                    </div>
                  </div>
                  <button style={buttonStyle("ghost")} onClick={handleEmployeeLogout}>Log Out</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {!adminUnlocked ? (
              <div style={{ ...cardStyle(), maxWidth: 540 }}>
                <h2 style={{ marginTop: 0 }}>Admin Login</h2>
                <div style={{ display: "grid", gap: 12 }}>
                  <div><div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Admin Password</div><input style={inputStyle()} type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Enter admin password" /></div>
                  <button style={buttonStyle()} onClick={handleAdminUnlock}>Unlock Admin View</button>
                  <button style={{ ...buttonStyle("ghost"), border: "none", background: "transparent", textDecoration: "underline" }} onClick={() => setShowAdminReset(p => !p)}>Forgot admin password?</button>
                  {showAdminReset && (
                    <div style={{ borderRadius: 14, padding: 14, background: "#fef3c7", border: "1px solid #f59e0b", display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>Reset admin password</div>
                      <input style={inputStyle()} type="email" value={adminResetEmail} onChange={e => setAdminResetEmail(e.target.value)} placeholder="Enter verification email" />
                      <input style={inputStyle()} type="password" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} placeholder="New admin password" />
                      <input style={inputStyle()} type="password" value={confirmAdminPassword} onChange={e => setConfirmAdminPassword(e.target.value)} placeholder="Confirm new admin password" />
                      <button style={buttonStyle("secondary")} onClick={handleAdminPasswordReset}>Reset Admin Password</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center" }}><button style={{ ...buttonStyle("danger"), minWidth: 180 }} onClick={handleAdminLogout}>Log Out (Admin)</button></div>
                <div style={cardStyle()}>
                  <h3 style={{ marginTop: 0 }}>Employee Accounts</h3>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
                    <input style={inputStyle()} placeholder="Employee name" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} />
                    <input style={inputStyle()} placeholder="Employee email" value={newEmployeeEmail} onChange={e => setNewEmployeeEmail(e.target.value)} type="email" />
                    <input style={inputStyle()} placeholder="Set password" value={newEmployeePassword} onChange={e => setNewEmployeePassword(e.target.value)} />
                    <select style={inputStyle()} value={newEmployeeRole} onChange={e => setNewEmployeeRole(e.target.value)}>
                      {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <button style={{ ...buttonStyle(), width: "100%" }} onClick={handleAddEmployee}>Add Employee</button>

                  <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                    {employees.filter(e => e.active !== false).map(emp => (
                      <div key={emp.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                        {editingEmployeeId === emp.id ? (
                          <div style={{ display: "grid", gap: 10 }}>
                            <input style={inputStyle()} value={editingEmployeeName} onChange={e => setEditingEmployeeName(e.target.value)} placeholder="Name" />
                            <input style={inputStyle()} value={editingEmployeeEmail} onChange={e => setEditingEmployeeEmail(e.target.value)} placeholder="Email" />
                            <select style={inputStyle()} value={editingEmployeeRole} onChange={e => setEditingEmployeeRole(e.target.value)}>
                              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <button style={buttonStyle()} onClick={() => saveEditEmployee(emp.id)}>Save</button>
                              <button style={buttonStyle("ghost")} onClick={() => setEditingEmployeeId("")}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>{emp.name}</div>
                              <span style={{ background: "#111827", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12 }}>{emp.role}</span>
                            </div>
                            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12, wordBreak: "break-all" }}>{emp.email}</div>

                            {resetPasswordEmployeeId === emp.id ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                <input style={inputStyle()} value={resetPasswordValue} onChange={e => setResetPasswordValue(e.target.value)} placeholder="New password" />
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                  <button style={buttonStyle()} onClick={() => saveResetPassword(emp.id)}>Save</button>
                                  <button style={buttonStyle("ghost")} onClick={() => setResetPasswordEmployeeId("")}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                <button style={buttonStyle("secondary")} onClick={() => startEditEmployee(emp)}>Edit</button>
                                <button style={buttonStyle("secondary")} onClick={() => { setResetPasswordEmployeeId(emp.id); setResetPasswordValue(emp.password || ""); }}>Reset PW</button>
                                <button style={buttonStyle("danger")} onClick={() => removeEmployee(emp.id)}>Remove</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <h3 style={{ margin: "0 0 12px 0" }}>Admin View</h3>
                  <div style={{ color: "#6b7280", marginBottom: 12, fontSize: 13 }}>Live shifts from all devices 🔥</div>
                  <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                    <select style={inputStyle()} value={selectedAdminFortnight} onChange={e => setSelectedAdminFortnight(e.target.value)}>
                      {fortnightOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select style={inputStyle()} value={adminFilter} onChange={e => setAdminFilter(e.target.value)}>
                      <option value="all">All shifts</option>
                      <option value="open">Open only</option>
                      <option value="closed">Closed only</option>
                    </select>
                  </div>
                  {filteredEntries.length === 0
                    ? <div style={{ color: "#6b7280", padding: "8px 0" }}>No shift records yet.</div>
                    : <>
                        <div style={{ display: "grid", gap: 10 }}>
                          {filteredEntries.map(e => (
                            <div key={e.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{e.employeeName}</div>
                                <span style={{ background: "#111827", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12 }}>{e.role}</span>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                                <div>
                                  <div style={{ color: "#6b7280", marginBottom: 2 }}>Clock In</div>
                                  <div style={{ fontWeight: 600 }}>{formatDateTimeNZ(e.clockIn)}</div>
                                </div>
                                <div>
                                  <div style={{ color: "#6b7280", marginBottom: 2 }}>Clock Out</div>
                                  <div style={{ fontWeight: 600 }}>{e.clockOut ? formatDateTimeNZ(e.clockOut) : "🟢 Still in"}</div>
                                </div>
                              </div>
                              {e.totalHours != null && (
                                <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                                  Total: <strong>{e.totalHours.toFixed(2)} hrs</strong>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 14, padding: 14, background: "#111827", borderRadius: 14, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 14 }}>Total Hours (this period)</div>
                          <div style={{ fontSize: 24, fontWeight: 700 }}>{filteredEntries.reduce((s, e) => s + (e.totalHours || 0), 0).toFixed(2)} hrs</div>
                        </div>
                      </>
                  }
                </div>
                <div style={cardStyle()}>
                  <h3 style={{ margin: "0 0 4px 0" }}>Leave Requests</h3>
                  <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>Approve or reject staff leave requests</div>
                  <select style={{ ...inputStyle(), marginBottom: 16 }} value={leaveStatusFilter} onChange={e => setLeaveStatusFilter(e.target.value)}>
                    <option value="all">All requests</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                  </select>
                  {filteredLeaveRequests.length === 0
                    ? <div style={{ color: "#6b7280" }}>No leave requests yet.</div>
                    : <div style={{ display: "grid", gap: 10 }}>
                        {filteredLeaveRequests.map(r => (
                          <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ fontWeight: 700 }}>{r.employeeName}</div>
                              <span style={{ background: r.status === "Approved" ? "#065f46" : r.status === "Rejected" ? "#991b1b" : "#92400e", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12, textTransform: "capitalize" }}>{r.status}</span>
                            </div>
                            <div style={{ fontSize: 13, marginBottom: 6 }}>
                              <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{r.type}</span> · {r.startDate} → {r.endDate}
                            </div>
                            {r.reason && <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>{r.reason}</div>}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <button style={buttonStyle()} onClick={() => updateLeaveStatus(r.id, "Approved")}>Approve</button>
                              <button style={buttonStyle("secondary")} onClick={() => updateLeaveStatus(r.id, "Rejected")}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
                <div style={cardStyle()}>
                  <h3 style={{ margin: "0 0 4px 0" }}>Timesheet Approvals</h3>
                  <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>Review and approve submitted timesheets</div>
                  <select style={{ ...inputStyle(), marginBottom: 16 }} value={timesheetStatusFilter} onChange={e => setTimesheetStatusFilter(e.target.value)}>
                    <option value="all">All timesheets</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                  </select>
                  {filteredTimesheetSubmissions.length === 0
                    ? <div style={{ color: "#6b7280" }}>No submitted timesheets yet.</div>
                    : <div style={{ display: "grid", gap: 10 }}>
                        {filteredTimesheetSubmissions.map(item => (
                          <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div style={{ fontWeight: 700 }}>{item.employeeName}</div>
                              <span style={{ background: item.status === "Approved" ? "#065f46" : item.status === "Rejected" ? "#991b1b" : "#92400e", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12 }}>{item.status}</span>
                            </div>
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{item.period}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{item.hours.toFixed(2)} hrs</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Submitted: {formatDateTimeNZ(item.submittedAt)}</div>
                            {editingTimesheetId === item.id ? (
                              <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                                <input style={inputStyle()} type="number" step="0.01" min="0" value={editingTimesheetHours} onChange={e => setEditingTimesheetHours(e.target.value)} placeholder="Edit hours" />
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                  <button style={buttonStyle()} onClick={() => saveEditTimesheet(item.id)}>Save</button>
                                  <button style={buttonStyle("ghost")} onClick={() => setEditingTimesheetId("")}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button style={{ ...buttonStyle("ghost"), width: "100%", marginBottom: 8 }} onClick={() => { setEditingTimesheetId(item.id); setEditingTimesheetHours(String(item.hours.toFixed(2))); }}>Edit Hours</button>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <button style={buttonStyle()} onClick={() => updateTimesheetStatus(item.id, "Approved")}>Approve</button>
                              <button style={buttonStyle("secondary")} onClick={() => updateTimesheetStatus(item.id, "Rejected")}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>

              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
