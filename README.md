# Productivity Quest

Productivity Quest is a gamified productivity tracker for design, creative, and marketing teams. The app supports anonymous employee access for quick task logging and an HR-only dashboard for analytics, setup, and reports.

## Features

- Employee landing page at `/` with name search, team chips, and a personal productivity summary
- Add work tasks with team-specific points and status tracking
- Level progression, streaks, badges, and celebratory confetti
- HR admin portal at `/hr/login`, `/hr`, `/hr/manage`, and `/hr/reports`
- Firebase-backed persistence with Firestore documents for teams, employees, work types, tasks, and admins
- CSV export and print-friendly report summaries for admin analysis

## Tech stack

- React 18 + Vite + TypeScript
- Tailwind CSS with dark mode support
- React Router v6
- Firebase v10 modular SDK for auth and Firestore
- Recharts, canvas-confetti, date-fns, lucide-react, react-hot-toast, Zustand

## Firebase setup

1. Create a Firebase project.
2. Enable these Firebase products:
   - Firestore Database
   - Authentication
   - Hosting
3. In Authentication, enable:
   - Email/Password
   - Anonymous
4. Create a Firestore database in production or test mode.
5. Copy `.env.example` to `.env` and fill in all Firebase values.

Example:

```bash
cp .env.example .env
```

Then update the file with your project settings:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

## HR admin creation

Create the first HR account in Firebase Authentication using an email/password user. Then create a Firestore document at:

```text
admins/{uid}
```

with this content:

```json
{
  "email": "hr@example.com"
}
```

The HR login will check the authenticated UID against this collection and allow access only when the document exists.

## Firestore rules

The repository includes `firestore.rules` and `firestore.indexes.json` with the initial access model for employee and HR roles. The rules allow anyone to read shared data. Employees are not signed in, so the employee page may only mark a task as done (awarding the work type's points) or move it back to pending, plus the matching change to the employee's `totalPoints`. Creating, editing and deleting tasks, and managing teams, employees and work types, is admin-only.

## Deployment

### Install dependencies

```bash
npm install
```

### Local dev

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Firebase Hosting deploy

```bash
firebase login
firebase deploy --only hosting
```

If Firestore or Hosting rules need to be deployed, also run:

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

## Hardening note

Because anonymous employee users do not have passwords, a determined employee could theoretically tamper with task entries. In production, consider adding per-employee PINs or signed updates to reduce this risk. HR can still audit and correct anomalies in the reports screen.

## Default data

The app includes a small seeded demo dataset and a Load sample data button in the HR setup page so the dashboard can be explored quickly.
