"use client";

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "breeze-clock-app-v2";
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

function nowIso() {
  return new Date().toISOString();
}

function formatDateTimeNZ(value) {
  return new Date(value).toLocaleString("en-NZ", {
    timeZone: NZ_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateNZ(value) {
  return new Date(value).toLocaleDateString("en-NZ", {
    timeZone: NZ_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function hoursBetween(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

function getFortnightOptions(count = 8) {
  const today = new Date();
  const day = today.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setHours(0, 0, 0, 0);
  currentMonday.setDate(today.getDate() - daysSinceMonday);

  const options = [];
  for (let i = 0; i < count; i += 1) {
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

function loadState() {
  if (typeof window === "undefined") {
    return {
      employees: defaultEmployees,
      entries: [],
      leaveRequests: [],
      activeShifts: {},
      adminSettings: { email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD },
      timesheetSubmissions: [],
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        employees: defaultEmployees,
        entries: [],
        leaveRequests: [],
        activeShifts: {},
        adminSettings: { email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD },
        timesheetSubmissions: [],
      };
    }

    const parsed = JSON.parse(raw);
    return {
      employees: parsed.employees || defaultEmployees,
      entries: parsed.entries || [],
      leaveRequests: parsed.leaveRequests || [],
      activeShifts: parsed.activeShifts || {},
      adminSettings: parsed.adminSettings || { email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD },
      timesheetSubmissions: parsed.timesheetSubmissions || [],
    };
  } catch {
    return {
      employees: defaultEmployees,
      entries: [],
      leaveRequests: [],
      activeShifts: {},
      adminSettings: { email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD },
      timesheetSubmissions: [],
    };
  }
}

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box",
  };
}

function buttonStyle(kind = "primary") {
  const base = {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #111827",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  };

  if (kind === "secondary") return { ...base, background: "#fff", color: "#111827" };
  if (kind === "danger") return { ...base, background: "#991b1b", color: "#fff", borderColor: "#991b1b" };
  if (kind === "ghost") return { ...base, background: "#f3f4f6", color: "#111827", borderColor: "#d1d5db" };
  return { ...base, background: "#111827", color: "#fff" };
}

function cardStyle() {
  return {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
}

export default function Page() {
  const [state, setState] = useState(loadState);
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    if (!adminUnlocked) return undefined;

    let timeoutId;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setAdminUnlocked(false);
        setMessage("Admin logged out after 10 minutes of inactivity.");
      }, ADMIN_IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [adminUnlocked]);

  const selectedEmployee = useMemo(
    () => state.employees.find((employee) => employee.id === employeeId),
    [state.employees, employeeId]
  );

  const selectedEmployeeByEmail = useMemo(
    () => state.employees.find((employee) => employee.active !== false && (employee.email || "").toLowerCase() === employeeEmail.trim().toLowerCase()),
    [state.employees, employeeEmail]
  );

  const selectedFortnightRange = useMemo(
    () => fortnightOptions.find((option) => option.value === selectedFortnight) || fortnightOptions[0],
    [fortnightOptions, selectedFortnight]
  );

  const selectedAdminFortnightRange = useMemo(
    () => fortnightOptions.find((option) => option.value === selectedAdminFortnight) || fortnightOptions[0],
    [fortnightOptions, selectedAdminFortnight]
  );

  const filteredEntries = useMemo(() => {
    const start = selectedAdminFortnightRange ? new Date(selectedAdminFortnightRange.startIso) : null;
    const end = selectedAdminFortnightRange ? new Date(selectedAdminFortnightRange.endIso) : null;

    const byPeriod = state.entries.filter((entry) => {
      if (!start || !end) return true;
      const clockIn = new Date(entry.clockIn);
      return clockIn >= start && clockIn <= end;
    });

    if (adminFilter === "open") return byPeriod.filter((entry) => !entry.clockOut);
    if (adminFilter === "closed") return byPeriod.filter((entry) => !!entry.clockOut);
    return byPeriod;
  }, [state.entries, adminFilter, selectedAdminFortnightRange]);

  const fortnightEntries = useMemo(() => {
    if (!employeeId || !selectedFortnightRange) return [];
    const start = new Date(selectedFortnightRange.startIso);
    const end = new Date(selectedFortnightRange.endIso);

    const grouped = state.entries
      .filter((entry) => entry.employeeId === employeeId && entry.clockOut)
      .filter((entry) => {
        const clockIn = new Date(entry.clockIn);
        return clockIn >= start && clockIn <= end;
      })
      .reduce((acc, entry) => {
        const dateKey = formatDateNZ(entry.clockIn);
        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, hours: 0, sortValue: new Date(entry.clockIn).getTime(), shifts: [] };
        }
        acc[dateKey].hours += entry.totalHours || 0;
        acc[dateKey].shifts.push(entry);
        return acc;
      }, {});

    return Object.values(grouped).sort((a, b) => b.sortValue - a.sortValue);
  }, [state.entries, employeeId, selectedFortnightRange]);

  const fortnightHours = useMemo(
    () => fortnightEntries.reduce((sum, row) => sum + row.hours, 0),
    [fortnightEntries]
  );

  const filteredLeaveRequests = useMemo(() => {
    if (leaveStatusFilter === "all") return state.leaveRequests;
    return state.leaveRequests.filter((request) => request.status.toLowerCase() === leaveStatusFilter);
  }, [state.leaveRequests, leaveStatusFilter]);

  const filteredTimesheetSubmissions = useMemo(() => {
    if (timesheetStatusFilter === "all") return state.timesheetSubmissions;
    return state.timesheetSubmissions.filter((item) => item.status.toLowerCase() === timesheetStatusFilter);
  }, [state.timesheetSubmissions, timesheetStatusFilter]);

  const employeeSummary = useMemo(() => {
    const totals = {};
    state.entries.forEach((entry) => {
      if (!totals[entry.employeeId]) {
        totals[entry.employeeId] = {
          employeeName: entry.employeeName,
          role: entry.role,
          shifts: 0,
          open: 0,
          hours: 0,
        };
      }
      totals[entry.employeeId].shifts += 1;
      totals[entry.employeeId].hours += entry.totalHours || 0;
      if (!entry.clockOut) totals[entry.employeeId].open += 1;
    });
    return Object.values(totals).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [state.entries]);

  function handleEmployeeLogin() {
    if (!selectedEmployeeByEmail) {
      setMessage("No active staff account found for this email.");
      return;
    }
    if (selectedEmployeeByEmail.password !== employeePassword) {
      setMessage("Incorrect password.");
      return;
    }
    setEmployeeId(selectedEmployeeByEmail.id);
    setEmployeeLoggedIn(true);
    setActiveTab("staff");
    setShowForgotStaffPassword(false);
    setEmployeePassword("");
    setMessage(`${selectedEmployeeByEmail.name} logged in successfully.`);
  }

  function handleEmployeeLogout() {
    setEmployeeLoggedIn(false);
    setEmployeeId("");
    setEmployeeEmail("");
    setEmployeePassword("");
    setMessage("Staff logged out.");
  }

  function handleClockIn() {
    if (!selectedEmployee) return;
    if (state.activeShifts[selectedEmployee.id]) {
      setMessage("Already clocked in.");
      return;
    }

    const stamp = nowIso();
    const newEntry = {
      id: `shift-${Date.now()}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      role: selectedEmployee.role,
      clockIn: stamp,
      clockOut: null,
      totalHours: null,
    };

    setState((prev) => ({
      ...prev,
      entries: [newEntry, ...prev.entries],
      activeShifts: { ...prev.activeShifts, [selectedEmployee.id]: newEntry.id },
    }));
    setMessage(`${selectedEmployee.name} clocked in.`);
  }

  function handleClockOut() {
    if (!selectedEmployee) return;
    const activeId = state.activeShifts[selectedEmployee.id];
    if (!activeId) {
      setMessage("Not clocked in.");
      return;
    }

    const stamp = nowIso();
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.id === activeId
          ? { ...entry, clockOut: stamp, totalHours: hoursBetween(entry.clockIn, stamp) }
          : entry
      ),
      activeShifts: Object.fromEntries(Object.entries(prev.activeShifts).filter(([key]) => key !== selectedEmployee.id)),
    }));
    setMessage(`${selectedEmployee.name} clocked out.`);
  }

  function handleLeaveRequest() {
    if (!selectedEmployee) return;
    if (!leaveStartDate || !leaveEndDate) {
      setMessage("Please select leave start and end dates.");
      return;
    }
    if (new Date(leaveEndDate) < new Date(leaveStartDate)) {
      setMessage("Leave end date cannot be before start date.");
      return;
    }

    const newRequest = {
      id: `leave-${Date.now()}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      type: leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason.trim(),
      status: "Pending",
      requestedAt: nowIso(),
    };

    setState((prev) => ({ ...prev, leaveRequests: [newRequest, ...prev.leaveRequests] }));
    setLeaveType("annual");
    setLeaveStartDate("");
    setLeaveEndDate("");
    setLeaveReason("");
    setMessage("Leave request submitted.");
  }

  function handleSubmitTimesheet() {
    if (!selectedEmployee || !selectedFortnightRange) return;
    const existingPending = state.timesheetSubmissions.find(
      (item) => item.employeeId === selectedEmployee.id && item.period === selectedFortnightRange.label && item.status === "Pending"
    );
    if (existingPending) {
      setMessage("A timesheet for this fortnight is already pending approval.");
      return;
    }

    const submission = {
      id: `ts-${Date.now()}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      period: selectedFortnightRange.label,
      hours: fortnightHours,
      status: "Pending",
      submittedAt: nowIso(),
      entries: fortnightEntries,
    };

    setState((prev) => ({ ...prev, timesheetSubmissions: [submission, ...prev.timesheetSubmissions] }));
    setMessage("Timesheet submitted for approval.");
  }

  function handleAdminUnlock() {
    if (adminPassword !== state.adminSettings.password) {
      setMessage("Incorrect admin password.");
      return;
    }
    setAdminUnlocked(true);
    setAdminPassword("");
    setShowAdminReset(false);
    setMessage("Admin access granted.");
  }

  function handleAdminLogout() {
    setAdminUnlocked(false);
    setMessage("Admin logged out.");
  }

  function handleAdminPasswordReset() {
    if (adminResetEmail.trim().toLowerCase() !== state.adminSettings.email.toLowerCase()) {
      setMessage("Admin verification failed.");
      return;
    }
    if (!newAdminPassword.trim()) {
      setMessage("Please enter a new admin password.");
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setMessage("Admin passwords do not match.");
      return;
    }

    setState((prev) => ({
      ...prev,
      adminSettings: { ...prev.adminSettings, password: newAdminPassword },
    }));
    setAdminResetEmail("");
    setNewAdminPassword("");
    setConfirmAdminPassword("");
    setShowAdminReset(false);
    setMessage("Admin password reset successfully.");
  }

  function handleAddEmployee() {
    const name = newEmployeeName.trim();
    const email = newEmployeeEmail.trim().toLowerCase();
    const password = newEmployeePassword.trim();
    if (!name || !email || !password) {
      setMessage("Please enter employee name, email, and password.");
      return;
    }
    const emailExists = state.employees.some((employee) => employee.email.toLowerCase() === email);
    if (emailExists) {
      setMessage("An employee with this email already exists.");
      return;
    }

    const employee = {
      id: `emp-${Date.now()}`,
      name,
      email,
      password,
      role: newEmployeeRole,
      active: true,
    };

    setState((prev) => ({ ...prev, employees: [...prev.employees, employee] }));
    setNewEmployeeName("");
    setNewEmployeeEmail("");
    setNewEmployeePassword("");
    setNewEmployeeRole("FOH");
    setMessage("Employee account created.");
  }

  function startEditEmployee(employee) {
    setEditingEmployeeId(employee.id);
    setEditingEmployeeName(employee.name);
    setEditingEmployeeEmail(employee.email);
    setEditingEmployeeRole(employee.role);
  }

  function saveEditEmployee(employeeIdToSave) {
    const name = editingEmployeeName.trim();
    const email = editingEmployeeEmail.trim().toLowerCase();
    if (!name || !email) {
      setMessage("Please enter employee name and email.");
      return;
    }
    const duplicateEmail = state.employees.some(
      (employee) => employee.id !== employeeIdToSave && employee.email.toLowerCase() === email
    );
    if (duplicateEmail) {
      setMessage("Another employee already uses this email.");
      return;
    }

    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((employee) =>
        employee.id === employeeIdToSave
          ? { ...employee, name, email, role: editingEmployeeRole }
          : employee
      ),
    }));

    if (selectedEmployee?.id === employeeIdToSave) {
      setEmployeeEmail(email);
    }

    setEditingEmployeeId("");
    setMessage("Employee details updated. Existing password stays the same.");
  }

  function cancelEditEmployee() {
    setEditingEmployeeId("");
  }

  function startResetPassword(employee) {
    setResetPasswordEmployeeId(employee.id);
    setResetPasswordValue(employee.password || "");
  }

  function saveResetPassword(employeeIdToSave) {
    const password = resetPasswordValue.trim();
    if (!password) {
      setMessage("Please enter a password.");
      return;
    }
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((employee) =>
        employee.id === employeeIdToSave ? { ...employee, password } : employee
      ),
    }));
    setResetPasswordEmployeeId("");
    setResetPasswordValue("");
    setMessage("Employee password reset successfully.");
  }

  function cancelResetPassword() {
    setResetPasswordEmployeeId("");
    setResetPasswordValue("");
  }

  function removeEmployee(employeeIdToRemove) {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((employee) => employee.id !== employeeIdToRemove),
      activeShifts: Object.fromEntries(Object.entries(prev.activeShifts).filter(([key]) => key !== employeeIdToRemove)),
    }));
    if (selectedEmployee?.id === employeeIdToRemove) handleEmployeeLogout();
    setMessage("Employee removed from staff accounts.");
  }

  function updateLeaveStatus(requestId, status) {
    setState((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.map((request) =>
        request.id === requestId ? { ...request, status } : request
      ),
    }));
    setMessage(`Leave request ${status.toLowerCase()}.`);
  }

  function updateTimesheetStatus(submissionId, status) {
    setState((prev) => ({
      ...prev,
      timesheetSubmissions: prev.timesheetSubmissions.map((item) =>
        item.id === submissionId ? { ...item, status } : item
      ),
    }));
    setMessage(`Timesheet ${status.toLowerCase()}.`);
  }

  function startEditTimesheet(item) {
    setEditingTimesheetId(item.id);
    setEditingTimesheetHours(String(item.hours.toFixed(2)));
  }

  function saveEditTimesheet(submissionId) {
    const parsedHours = Number(editingTimesheetHours);
    if (Number.isNaN(parsedHours) || parsedHours < 0) {
      setMessage("Please enter valid hours.");
      return;
    }
    setState((prev) => ({
      ...prev,
      timesheetSubmissions: prev.timesheetSubmissions.map((item) =>
        item.id === submissionId ? { ...item, hours: parsedHours } : item
      ),
    }));
    setEditingTimesheetId("");
    setEditingTimesheetHours("");
    setMessage("Timesheet hours updated.");
  }

  function cancelEditTimesheet() {
    setEditingTimesheetId("");
    setEditingTimesheetHours("");
  }

  function clearAllData() {
    setState({
      employees: defaultEmployees,
      entries: [],
      leaveRequests: [],
      activeShifts: {},
      adminSettings: { email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD },
      timesheetSubmissions: [],
    });
    setMessage("Demo data reset.");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 16, fontFamily: "Arial, sans-serif", color: "#111827" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={cardStyle()}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "#111827", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              B
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>Breeze Indian Restaurant</div>
              <div style={{ color: "#6b7280", marginTop: 4 }}>Staff clock in, timesheet and leave system</div>
            </div>
          </div>
        </div>

        {message ? <div style={{ ...cardStyle(), padding: 12 }}>{message}</div> : null}

        {!employeeLoggedIn ? (
          <div style={{ display: "flex", gap: 8, maxWidth: 320 }}>
            <button style={buttonStyle(activeTab === "staff" ? "primary" : "ghost")} onClick={() => setActiveTab("staff")}>Staff</button>
            <button style={buttonStyle(activeTab === "admin" ? "primary" : "ghost")} onClick={() => setActiveTab("admin")}>Admin</button>
          </div>
        ) : (
          <div style={{ color: "#6b7280", fontSize: 13 }}>Staff session active</div>
        )}

        {activeTab === "staff" ? (
          <div style={{ display: "grid", gap: 16, maxWidth: 540 }}>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Staff Portal</h2>
              {!employeeLoggedIn ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Email</div>
                    <input style={inputStyle()} value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} placeholder="Enter your email" type="email" />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Password</div>
                    <input style={inputStyle()} value={employeePassword} onChange={(e) => setEmployeePassword(e.target.value)} placeholder="Enter your password" type="password" />
                  </div>
                  <button style={buttonStyle()} onClick={handleEmployeeLogin}>Log In</button>
                  <button style={{ ...buttonStyle("ghost"), border: "none", background: "transparent", textDecoration: "underline" }} onClick={() => setShowForgotStaffPassword((prev) => !prev)}>
                    Forgot password?
                  </button>
                  {showForgotStaffPassword ? (
                    <div style={{ borderRadius: 14, padding: 12, background: "#fef3c7", border: "1px solid #f59e0b" }}>
                      Please ask the business owner to reset your password from the admin page.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ ...cardStyle(), padding: 14, background: "#f9fafb" }}>
                    <div style={{ fontWeight: 700 }}>{selectedEmployee?.name}</div>
                    <div style={{ color: "#6b7280", marginTop: 4 }}>{state.activeShifts[selectedEmployee?.id] ? "Clocked In" : "Not Clocked In"}</div>
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
                    <select style={inputStyle()} value={selectedFortnight} onChange={(e) => setSelectedFortnight(e.target.value)}>
                      {fortnightOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 32, fontWeight: 700, marginTop: 14 }}>{fortnightHours.toFixed(2)} hrs</div>
                    <div style={{ color: "#6b7280", marginTop: 4 }}>Total hours worked in the selected fortnight (NZ time)</div>
                    <div style={{ overflowX: "auto", marginTop: 14 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: "8px 0" }}>Date</th>
                            <th style={{ textAlign: "right", padding: "8px 0" }}>Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fortnightEntries.length === 0 ? (
                            <tr><td colSpan={2} style={{ padding: "8px 0", color: "#6b7280" }}>No records</td></tr>
                          ) : fortnightEntries.map((row) => (
                            <tr key={row.date}>
                              <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                                <div>{row.date}</div>
                                <div style={{ color: "#6b7280", fontSize: 12 }}>
                                  {row.shifts.map((shift) => `${formatDateTimeNZ(shift.clockIn)} - ${shift.clockOut ? formatDateTimeNZ(shift.clockOut) : "Open"}`).join(" | ")}
                                </div>
                              </td>
                              <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>{row.hours.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button style={buttonStyle()} onClick={handleSubmitTimesheet}>Submit for Approval</button>
                    </div>
                  </div>

                  <div style={cardStyle()}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Leave Request</div>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Leave type</div>
                        <select style={inputStyle()} value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                          <option value="annual">Annual Leave</option>
                          <option value="sick">Sick Leave</option>
                          <option value="unpaid">Unpaid Leave</option>
                          <option value="bereavement">Bereavement Leave</option>
                          <option value="other">Other Leave</option>
                        </select>
                      </div>
                      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                        <div>
                          <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Start date</div>
                          <input style={inputStyle()} type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>End date</div>
                          <input style={inputStyle()} type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Reason (optional)</div>
                        <input style={inputStyle()} value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Optional reason" />
                      </div>
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
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Admin Password</div>
                    <input style={inputStyle()} type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter admin password" />
                  </div>
                  <button style={buttonStyle()} onClick={handleAdminUnlock}>Unlock Admin View</button>
                  <button style={{ ...buttonStyle("ghost"), border: "none", background: "transparent", textDecoration: "underline" }} onClick={() => setShowAdminReset((prev) => !prev)}>
                    Forgot admin password?
                  </button>
                  {showAdminReset ? (
                    <div style={{ borderRadius: 14, padding: 14, background: "#fef3c7", border: "1px solid #f59e0b", display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>Reset admin password</div>
                      <div style={{ fontSize: 12 }}>Only the business owner should use this section.</div>
                      <input style={inputStyle()} type="email" value={adminResetEmail} onChange={(e) => setAdminResetEmail(e.target.value)} placeholder="Enter verification email" />
                      <input style={inputStyle()} type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="New admin password" />
                      <input style={inputStyle()} type="password" value={confirmAdminPassword} onChange={(e) => setConfirmAdminPassword(e.target.value)} placeholder="Confirm new admin password" />
                      <button style={buttonStyle("secondary")} onClick={handleAdminPasswordReset}>Reset Admin Password</button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button style={buttonStyle("ghost")} onClick={handleAdminLogout}>Log Out (Admin)</button>
                </div>

                <div style={cardStyle()}>
                  <h3 style={{ marginTop: 0 }}>Employee Accounts</h3>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
                    <input style={inputStyle()} placeholder="Employee name" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} />
                    <input style={inputStyle()} placeholder="Employee email" value={newEmployeeEmail} onChange={(e) => setNewEmployeeEmail(e.target.value)} type="email" />
                    <input style={inputStyle()} placeholder="Set password" value={newEmployeePassword} onChange={(e) => setNewEmployeePassword(e.target.value)} />
                    <select style={inputStyle()} value={newEmployeeRole} onChange={(e) => setNewEmployeeRole(e.target.value)}>
                      {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <button style={buttonStyle()} onClick={handleAddEmployee}>Add Employee</button>

                  <div style={{ overflowX: "auto", marginTop: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Name</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Email</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Role</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Edit</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Password Reset</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.employees.map((employee) => (
                          <tr key={employee.id}>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                              {editingEmployeeId === employee.id ? <input style={inputStyle()} value={editingEmployeeName} onChange={(e) => setEditingEmployeeName(e.target.value)} /> : employee.name}
                            </td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                              {editingEmployeeId === employee.id ? <input style={inputStyle()} value={editingEmployeeEmail} onChange={(e) => setEditingEmployeeEmail(e.target.value)} /> : employee.email}
                            </td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                              {editingEmployeeId === employee.id ? (
                                <select style={inputStyle()} value={editingEmployeeRole} onChange={(e) => setEditingEmployeeRole(e.target.value)}>
                                  {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                                </select>
                              ) : employee.role}
                            </td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                              {editingEmployeeId === employee.id ? (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button style={buttonStyle("secondary")} onClick={() => saveEditEmployee(employee.id)}>Save</button>
                                  <button style={buttonStyle("ghost")} onClick={cancelEditEmployee}>Cancel</button>
                                </div>
                              ) : (
                                <button style={buttonStyle("secondary")} onClick={() => startEditEmployee(employee)}>Edit</button>
                              )}
                            </td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                              {resetPasswordEmployeeId === employee.id ? (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <input style={{ ...inputStyle(), maxWidth: 140 }} value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} placeholder="New password" />
                                  <button style={buttonStyle("secondary")} onClick={() => saveResetPassword(employee.id)}>Save</button>
                                  <button style={buttonStyle("ghost")} onClick={cancelResetPassword}>Cancel</button>
                                </div>
                              ) : (
                                <button style={buttonStyle("secondary")} onClick={() => startResetPassword(employee)}>Reset Password</button>
                              )}
                            </td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
                              <button style={buttonStyle("danger")} onClick={() => removeEmployee(employee.id)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <div style={cardStyle()}><div style={{ color: "#6b7280" }}>Total Recorded Shifts</div><div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{state.entries.length}</div></div>
                  <div style={cardStyle()}><div style={{ color: "#6b7280" }}>Open Shifts</div><div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{state.entries.filter((entry) => !entry.clockOut).length}</div></div>
                  <div style={cardStyle()}><div style={{ color: "#6b7280" }}>Total Hours</div><div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{state.entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0).toFixed(2)}</div></div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Admin View</h3>
                      <div style={{ color: "#6b7280", marginTop: 4 }}>Review all employee shifts in NZ time</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <select style={inputStyle()} value={selectedAdminFortnight} onChange={(e) => setSelectedAdminFortnight(e.target.value)}>
                        {fortnightOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select style={inputStyle()} value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)}>
                        <option value="all">All shifts</option>
                        <option value="open">Open only</option>
                        <option value="closed">Closed only</option>
                      </select>
                      <button style={buttonStyle("danger")} onClick={clearAllData}>Reset Demo Data</button>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto", marginTop: 14 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Employee</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Role</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Clock In</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Clock Out</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: "8px 0", color: "#6b7280" }}>No shift records yet.</td></tr>
                        ) : filteredEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{entry.employeeName}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{entry.role}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{formatDateTimeNZ(entry.clockIn)}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{entry.clockOut ? formatDateTimeNZ(entry.clockOut) : "Still clocked in"}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>{entry.totalHours != null ? entry.totalHours.toFixed(2) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Leave Requests</h3>
                      <div style={{ color: "#6b7280", marginTop: 4 }}>Approve or reject staff leave requests</div>
                    </div>
                    <select style={inputStyle()} value={leaveStatusFilter} onChange={(e) => setLeaveStatusFilter(e.target.value)}>
                      <option value="all">All requests</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div style={{ overflowX: "auto", marginTop: 14 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Employee</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Type</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Start</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>End</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Reason</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Status</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaveRequests.length === 0 ? (
                          <tr><td colSpan={7} style={{ padding: "8px 0", color: "#6b7280" }}>No leave requests yet.</td></tr>
                        ) : filteredLeaveRequests.map((request) => (
                          <tr key={request.id}>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{request.employeeName}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textTransform: "capitalize" }}>{request.type}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{request.startDate}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{request.endDate}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{request.reason || "—"}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{request.status}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <button style={buttonStyle()} onClick={() => updateLeaveStatus(request.id, "Approved")}>Approve</button>
                                <button style={buttonStyle("secondary")} onClick={() => updateLeaveStatus(request.id, "Rejected")}>Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Timesheet Approvals</h3>
                      <div style={{ color: "#6b7280", marginTop: 4 }}>Review and approve submitted timesheets</div>
                    </div>
                    <select style={inputStyle()} value={timesheetStatusFilter} onChange={(e) => setTimesheetStatusFilter(e.target.value)}>
                      <option value="all">All timesheets</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div style={{ overflowX: "auto", marginTop: 14 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Employee</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Period</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Hours</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Submitted</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Status</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Edit Hours</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTimesheetSubmissions.length === 0 ? (
                          <tr><td colSpan={7} style={{ padding: "8px 0", color: "#6b7280" }}>No submitted timesheets yet.</td></tr>
                        ) : filteredTimesheetSubmissions.map((item) => (
                          <tr key={item.id}>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{item.employeeName}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{item.period}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>{item.hours.toFixed(2)}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{formatDateTimeNZ(item.submittedAt)}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{item.status}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                              {editingTimesheetId === item.id ? (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <input style={{ ...inputStyle(), maxWidth: 120 }} type="number" step="0.01" min="0" value={editingTimesheetHours} onChange={(e) => setEditingTimesheetHours(e.target.value)} />
                                  <button style={buttonStyle("secondary")} onClick={() => saveEditTimesheet(item.id)}>Save</button>
                                  <button style={buttonStyle("ghost")} onClick={cancelEditTimesheet}>Cancel</button>
                                </div>
                              ) : (
                                <button style={buttonStyle("secondary")} onClick={() => startEditTimesheet(item)}>Edit</button>
                              )}
                            </td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <button style={buttonStyle()} onClick={() => updateTimesheetStatus(item.id, "Approved")}>Approve</button>
                                <button style={buttonStyle("secondary")} onClick={() => updateTimesheetStatus(item.id, "Rejected")}>Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={cardStyle()}>
                  <h3 style={{ marginTop: 0 }}>Employee Summary</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Employee</th>
                          <th style={{ textAlign: "left", padding: "8px 0" }}>Role</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Shifts</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Open</th>
                          <th style={{ textAlign: "right", padding: "8px 0" }}>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeSummary.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: "8px 0", color: "#6b7280" }}>No summary available yet.</td></tr>
                        ) : employeeSummary.map((row) => (
                          <tr key={row.employeeName}>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{row.employeeName}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>{row.role}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>{row.shifts}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>{row.open}</td>
                            <td style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>{row.hours.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
