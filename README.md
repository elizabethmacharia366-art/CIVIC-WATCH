# CivicWatch

CivicWatch is a local issue-reporting portal for citizens, departments, and administrators.

## Run locally

Requires Node.js 18 or newer. No external packages or database are needed for the development build.

```bash
npm start
```

Open <http://localhost:3000>. The development API stores reports, tasks, feedback, and users in `data/store.json`; this file is intentionally not committed.

## Sign-in

Use the shared sign-in page at <http://localhost:3000/login.html>.

Citizens can create an account from the same page. Configure administrator and department accounts locally before starting the server:

```bash
export CIVIC_ADMIN_USERNAME="your-admin-username"
export CIVIC_ADMIN_PASSWORD="use-a-strong-password"
export CIVIC_DEPARTMENT_USERNAME="your-department-username"
export CIVIC_DEPARTMENT_PASSWORD="use-a-strong-password"
npm start
```

These values are not stored in Git.

## Checks

```bash
npm run check
```
