# 🍛 Breeze Clock App
**Version: 79**
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
- Fortnight timesheet view with dates & hours
- Timesheet submission with "Are you sure?" confirmation
- ✅ Staff can see Approved / ⏳ Pending status on submitted timesheets

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
- Per-employee hours total in shift cards
- Grand total hours for selected fortnight
- Fortnight selector & shift filter
- ✏️ Edit shift times manually
- 🗑️ Delete shifts
- Timesheet approvals — Pending & Approved only
- ↩️ Undo timesheet approval
- ⬇️ Download Timesheet CSV for Xero
- 12-hour AM/PM time format
- Auto clock out at 11:55 PM NZST (server-side via Vercel cron — no client-side interference)
- 📧 Email alert when staff forgot to clock out

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

## 📝 Version History
- v79 — ➕ Add Manual Shift feature added to Admin View
- v78 — Removed buggy client-side auto clock-out (now server-side only via Vercel cron)
- v77 — Fortnight schedule fixed, anchored to correct pay cycle (13/04/2026)
- v59 — Download Timesheet CSV for Xero, rejected timesheets hidden, staff approval status visible
- v50 — GPS location lock, test mode accounts, auto clock-out at midnight, email alerts
