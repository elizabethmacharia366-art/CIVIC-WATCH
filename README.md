# CivicWatch

CivicWatch is a local issue-reporting portal for citizens, departments, and administrators.

## Run locally

Requires Node.js 18 or newer. No external packages or database are needed for the development build.

```bash
npm start
```

Open <http://localhost:3000>. The development API stores reports, tasks, feedback, and users in `data/store.json`; this file is intentionally not committed.

## Demo sign-in

An administrator account is created on first start: `admin` / `admin123`. Citizens can register from the citizen dashboard.

## Checks

```bash
npm run check
```
