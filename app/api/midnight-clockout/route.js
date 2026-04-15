import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPqNbYoM3LaCCIlTFiMngbxCNbTKkVfsM",
  authDomain: "breeze-clock-6a4f3.firebaseapp.com",
  projectId: "breeze-clock-6a4f3",
  storageBucket: "breeze-clock-6a4f3.firebasestorage.app",
  messagingSenderId: "84838183547",
  appId: "1:84838183547:web:87d229bd39c80f75c428de",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const EMAILJS_SERVICE_ID = "service_22q7wqe";
const EMAILJS_TEMPLATE_ID = "template_9npp595";
const EMAILJS_PUBLIC_KEY = "0Gyw2c9jKIx3MCFKx";
const NZ_TIMEZONE = "Pacific/Auckland";

export async function GET(request) {
  try {
    const now = new Date();
    const shiftsRef = collection(db, "shifts");
    const snapshot = await getDocs(query(shiftsRef, where("clockOut", "==", null)));

    if (snapshot.empty) {
      return Response.json({ message: "No open shifts found" });
    }

    const forgottenStaff = [];

    for (const docSnap of snapshot.docs) {
      const shift = docSnap.data();
      const clockInTime = shift.clockIn?.toDate?.() || new Date(shift.clockIn);
      const hours = (now - clockInTime) / (1000 * 60 * 60);

      await updateDoc(doc(db, "shifts", docSnap.id), {
        clockOut: now.toISOString(),
        totalHours: Math.round(hours * 100) / 100,
        autoClockOut: true,
      });

      forgottenStaff.push({ name: shift.employeeName || "Unknown", role: shift.role || "" });
    }

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

    return Response.json({ message: `Auto clocked out ${forgottenStaff.length} staff`, staff: forgottenStaff });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
