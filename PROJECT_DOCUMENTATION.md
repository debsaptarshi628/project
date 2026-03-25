# SeniorPill Project Documentation

## 1) Purpose (What problem this solves)
SeniorPill is an IoT-based smart medication management system designed to improve medication adherence for elderly patients and to reduce caregiver burden.

It provides:
- Scheduled medication reminders (patient-side hardware: buzzer + LED)
- Real-time visibility for caregivers (web dashboard backed by Firebase)
- Automatic caregiver notifications when a dose is missed (email reminders)
- Automated monitoring for low stock alerts (based on pill counts stored in Firebase)

The overall goal is to ensure medications are taken on time and that caregivers are notified immediately when adherence fails.

## 2) High-level Architecture (3 layers)
The system is split into three main layers:

### A) Hardware layer (ESP32 + sensors)
- The device detects pill events using IR sensors.
- At scheduled times, it triggers reminders (buzzer/LED).
- It sends dose and device status updates to Firebase.
- The firmware supports offline behavior via local storage and sync on reconnect.

### B) Cloud layer (Firebase)
- Firebase Authentication controls user access (roles like patient/caregiver).
- Firestore stores:
  - Patient settings (dose schedules, caregiver email mapping, pill counts)
  - Dose logs (taken/missed events sent by hardware)
  - User metadata required by the dashboard

### C) Application layer (Web Dashboard + Email Service)
- Frontend: React app (Netlify) for caregivers/patients
- Backend email service: Node/Express app (Render) that sends emails via Gmail SMTP using Nodemailer

## 3) Frontend (React) — responsibilities and included features
### Key libraries / capabilities
- React 18 (UI)
- Tailwind CSS (styling)
- Recharts (charts/visualizations)
- React Router (navigation)
- Firebase SDK integration:
  - Authentication (login & role-based access)
  - Firestore (real-time updates)
  - Firebase Cloud Messaging (FCM) token handling (only in browser context)

### What the frontend does
- Provides caregiver dashboard views for patient schedules and adherence history
- Reads and writes Firestore data (where permitted by Firebase rules)
- Shows real-time status changes (listeners)
- Triggers “email notification requests” to the backend email service through frontend utility functions

### Frontend email integration (current implementation)
The frontend calls the backend using a hardcoded base URL:
- If running locally: `http://localhost:3001`
- Otherwise: `https://seniorpill-email-server.onrender.com`

This is implemented in:
- `src/utils/emailNotifications.js`

The functions there call these backend endpoints:
- `POST /api/email/reminder`
- `POST /api/email/dose-status`
- `POST /api/email/low-stock`

## 4) Backend Email Service (Node + Express) — responsibilities
Location:
- `server/index.js`

### HTTP API
The backend is an Express server that exposes:
- `GET /api/health`
  - Returns `{ status: 'ok', message: 'Email API server is running', method: 'Gmail SMTP' }`
- `POST /api/email/reminder`
  - Sends a caregiver email containing a medication reminder + patient dose details
- `POST /api/email/dose-status`
  - Sends caregiver email for taken vs missed events (includes delay & pill counts)
- `POST /api/email/low-stock`
  - Sends caregiver email when pill counts cross below-threshold conditions

### Email sending method (important)
The service uses:
- Nodemailer with Gmail SMTP

It does NOT use Resend for notification emails in the current SMTP version.

### Gmail SMTP configuration
The Gmail SMTP credentials are currently kept in code as:
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

Because Gmail SMTP requires 2-step verification and an App Password, if emails fail with an SMTP auth error, you must:
- Ensure the Gmail account has 2-Step Verification enabled
- Generate a valid Gmail App Password
- Update `GMAIL_APP_PASSWORD` in `server/index.js`

### Reliability improvement included
To reduce “silent failures”, the backend verifies SMTP credentials at startup.
It tries to authenticate (TLS on 465, fallback to STARTTLS on 587). If authentication fails, the service logs the error and will not send emails until auth is successful.

## 5) Automated Reminder Monitoring (background scheduler)
Beyond responding to frontend-triggered requests, the backend runs a continuous background checker:
- Runs periodically using `setInterval(checkAllPatientReminders, 10000)`
- Meaning it checks every ~10 seconds for due reminders and missed-dose conditions

### Firestore integration method
The backend fetches data using Firebase REST API calls:
- It uses hardcoded:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_API_KEY`
- Then it queries:
  - `settings` collection for patient schedules and caregiver email mapping
  - `doseLogs` collection for patient adherence history

### Duplicate prevention included
The service uses in-memory sets to avoid sending repeated emails for the same event keys:
- `sentEmails.reminders`
- `sentEmails.missed`
- `sentEmails.lowStock`

These sets are cleared when they grow too large to prevent memory buildup.

### Time logic included (timezone handling)
The backend computes:
- `today` as `YYYY-MM-DD`
- `currentHour/currentMin/currentSec`

using a fixed timezone:
- `TIME_ZONE = 'Asia/Kolkata'` (IST)

This prevents “server timezone mismatch” issues where Render’s default timezone could cause reminder windows to trigger at the wrong time.

### Reminder and missed-dose windows (current logic)
For each patient with both dose times set:
- A reminder is considered “in-window” when:
  - `differenceMinutes` is between `0` and `1` (and also exact-match checks)
- A missed-dose email is considered when:
  - `differenceMinutes` is between `2` and `5`
  - AND no matching “taken/missed log already exists today” for that dose type

If a patient is missing dose times in Firestore:
- the service skips them and logs: `SKIPPING ... Dose times not set`

## 6) Deployment (current approach)
### Frontend: Netlify
Frontend is deployed as a static React app.
Netlify build config:
- `netlify.toml`
  - Build: `npm run build`
  - Publish: `dist`
  - Redirects: SPA route support (`/*` → `/index.html`)

Important: With the current code, the frontend does not require any Netlify environment variables for `VITE_API_URL` because the backend URL is hardcoded in `emailNotifications.js`.

### Backend: Render
Backend is a separate Node service on Render.

The backend runs from:
- `server/`

Render service configuration should be:
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

Important: With the current code, the backend does not depend on custom Render environment variables for email sender credentials or Firebase keys because they are currently hardcoded in `server/index.js`.

## 7) Project files overview (what to look at)
Core deployment/config:
- `netlify.toml` (frontend build + publish configuration)

Frontend:
- `src/utils/emailNotifications.js` (calls backend endpoints; hardcoded backend URL)
- `src/firebase/config.js` (Firebase config + SDK initialization)
- React UI components in `src/` (dashboard, charts, views)

Backend:
- `server/index.js`
  - Express routes
  - Nodemailer Gmail SMTP sending
  - Background scheduler
  - Firestore REST API calls

Firmware:
- `firmware/` (ESP32/Arduino code; reads schedules and logs dose events to Firebase)

## 8) How to test end-to-end (recommended)
1. Verify Firebase has:
   - Each patient’s `morningDoseTime` and `eveningDoseTime`
   - Each patient’s `caregiverEmail` mapping in `settings/{patientId}`
2. Start backend locally:
   - `cd server`
   - `npm install`
   - `npm start`
3. Watch backend logs:
   - Confirm SMTP authentication verified (or auth failure)
   - Confirm reminder scheduler starts
4. Trigger dose activity (either:
   - wait for scheduled time, OR
   - send dose logs from hardware (ESP32) / update dose logs in Firestore)
5. Confirm caregiver receives:
   - reminder emails
   - dose status emails
   - low stock emails (when implemented by pill-count thresholds)

## 9) Notes and limitations (important)
- Gmail SMTP requires a valid App Password. If credentials are wrong, Nodemailer will log `535 5.7.8 Username and Password not accepted`.
- The reminder scheduler uses IST timezone (`Asia/Kolkata`). If your intended schedule is in a different timezone, update `TIME_ZONE` in `server/index.js`.
- Current backend uses in-memory duplicate prevention. If you restart the service, it may resend some emails depending on timing and existing dose logs.

