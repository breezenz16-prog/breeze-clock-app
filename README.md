# 🍛 Breeze Clock App
**Version: 90**
Live URL: https://breeze-clock-app.vercel.app
Breeze Indian Restaurant — Staff Clock In, Timesheet & Management System
16 Hood St, Hamilton Central · 07 949 8159

---

## 🔥 Core
- Real-time Firebase sync across all devices
- Animated gold Breeze loading screen
- Gold & black Breeze branding throughout
- Mobile optimised card layout
- Breeze logo home screen icon (PWA)

## 👷 Staff Portal
- Email & password login
- Welcome message with date
- Round gold Clock In button
- Round white Clock Out button
- "Are you sure?" confirmation on clock out
- 📍 GPS location lock (50m from restaurant)
- 🧪 Test mode for noor & seema accounts
- Live clock-in status — 🟢 Currently Clocked In / ⚪ Not Clocked In
- Fortnight timesheet — Week 1 & Week 2 breakdown
- Each shift shows date, clock in → clock out, and hours
- Week subtotal and fortnight total in gold bar
- Timesheet submission with "Are you sure?" confirmation
- ✅ Staff can see Approved / ⏳ Pending status on submitted timesheets
- 🎂 Happy Birthday message shown on staff portal on their birthday

## 👑 Admin Portal
- Password protected login
- Auto logout after 10 mins idle
- Centred red logout button
- Add / Edit / Remove employees
- Employee cards with ▼ dropdown for Edit, Reset PW, Remove
- Reset employee passwords
- "Are you sure?" on all destructive actions
- Live shifts from all devices 🔥
- ➕ Add Manual Shift — admin can manually add a shift for any employee (with optional clock out)
- ✕ Clear Clock Out button in Edit Shift form
- Per-employee hours total in shift cards
- Grand total hours for selected fortnight
- Fortnight selector & shift filter
- ✏️ Edit shift times manually
- 🗑️ Delete shifts
- Timesheet approvals — Pending & Approved only
- ↩️ Undo timesheet approval
- ⬇️ Download Timesheet CSV for Xero
- 12-hour AM/PM time format

## 👤 Employee Profiles
- 🎂 Birthday field (optional) — shown on employee card
- 📅 Joining date field (optional) — shown with duration e.g. "1 yr 2 months"
- 🎂 icon shown on employee card on their birthday
- Yellow birthday banner in Admin View on the day
- 📧 Send reminder email button on birthday banner — fires to breezenz16@gmail.com

## 📊 Summary View
- List / Summary toggle in Admin View
- One card per employee showing fortnightly total hours
- Tap to expand — shows Week 1 & Week 2 breakdown
- Each shift displays date, clock in → clock out, and hours
- Week subtotal and fortnight total per employee
- All staff period total at the bottom
- Split shifts on the same day shown as separate rows
- CSV download available in both List and Summary views

## ⚠️ Shift Warnings
- Orange border & ⚠️ badge on any shift open or over 12 hrs
- If staff clocks in with a forgotten open shift from a previous day — auto-closes it at midnight and shows a warning message to check with manager

## 🇳🇿 NZ Public Holidays
- Shifts on public holidays highlighted in yellow
- Holiday name shown on the shift card
- Reminder: "Public holiday pay rate applies"
- Covers 2026–2027 NZ public holidays including Matariki, ANZAC Day, Waitangi Day, Christmas, Boxing Day, and more

## 📅 Pay Cycle
- Fortnightly periods anchored to 13/04/2026
- Aligns perfectly with pay day on 28/04/2026
- Auto-generates correct fortnights forever from anchor date

## 💰 Cost
- Vercel hosting: Free ✅
- Firebase database: Free ✅
- EmailJS notifications: Free ✅
- Total: $0 forever 🎉

## 🔑 Tech Stack
- Next.js 14
- Firebase Firestore
- EmailJS
- Vercel
