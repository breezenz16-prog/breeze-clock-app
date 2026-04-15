const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const EMAILJS_SERVICE_ID = "service_22q7wqe";
const EMAILJS_TEMPLATE_ID = "template_9npp595";
const EMAILJS_PUBLIC_KEY = "0Gyw2c9jKIx3MCFKx";
const NZ_TIMEZONE = "Pacific/Auckland";

exports.midnightAutoClockOut = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone(NZ_TIMEZONE)
  .onRun(async () => {
    const now = new Date();
    const snapshot = await db.collection("shifts")
      .where("clockOut", "==", null)
      .get();

    if (snapshot.empty) return null;

    const batch = db.batch();
    const forgottenStaff = [];

    snapshot.forEach((docSnap) => {
      const shift = docSnap.data();
      const clockInTime = shift.clockIn?.toDate?.() || new Date(shift.clockIn);
      const hours = (now - clockInTime) / (1000 * 60 * 60);
      batch.update(docSnap.ref, {
        clockOut: admin.firestore.Timestamp.now(),
        totalHours: Math.round(hours * 100) / 100,
        autoClockOut: true,
      });
      forgottenStaff.push({ name: shift.employeeName || "Unknown", role: shift.role || "" });
    });

    await batch.commit();

    for (const staff of forgottenStaff) {
      const time = now.toLocaleString("en-NZ", {
        timeZone: NZ_TIMEZONE, hour: "2-digit", minute: "2-digit",
        hour12: true, weekday: "short", day: "numeric", month: "short",
      });
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            staff_name: staff.name,
            role: staff.role,
            action: "auto clocked OUT at midnight (forgot to clock out)",
            time: time,
          },
        }),
      });
    }

    return null;
  });
