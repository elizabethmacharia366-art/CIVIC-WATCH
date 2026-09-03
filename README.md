# CivicWatch 🏛️

CivicWatch is a modern, responsive municipal public issue-reporting and management platform built for **Citizens**, **Department Officials**, and **System Administrators**. It features a unified WhatsApp Dark Theme design system, real-time analytics, and role-based access control.

---

## 🚀 Live Demo & Production URL

- **Production Deployment**: [https://civic-watch-pearl.vercel.app](https://civic-watch-pearl.vercel.app)
- **Login Portal**: [https://civic-watch-pearl.vercel.app/login.html](https://civic-watch-pearl.vercel.app/login.html)

---

## 🔑 Demo Test Credentials

You can test the system across all three user roles using the pre-seeded credentials below:

### 1. Administrator Accounts (System Oversight)
| Username | Password | Role | Full Name | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **Administrator** | Elizabeth Macharia | Full System Oversight & User Management |
| `admin2` | `admin123` | **Administrator** | David Kimani | Analytics & Content Management |

### 2. Department Accounts (Operations & Task Dispatch)
| Username | Password | Role | Department | Operations |
| :--- | :--- | :--- | :--- | :--- |
| `publicworks` | `dept123` | **Department** | Public Works | Roads, Lighting & Infrastructure Tasks |
| `sanitation` | `dept123` | **Department** | Sanitation | Waste Management & Drainage Tasks |

### 3. Citizen Accounts (Issue Reporting & Tracking)
| Username | Password | Role | Full Name | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| `citizen1` | `citizen123` | **Citizen** | Mary Wanjiku | Issue Submission, Tracking & Feedback |
| `citizen2` | `citizen123` | **Citizen** | John Kamau | Issue Submission & Map View |

> 💡 **Self-Registration**: Citizens can also create a new account directly on the [Login & Registration Page](https://civic-watch-pearl.vercel.app/login.html) by clicking **Create Account**.

---

## 🛠️ Quick Local Setup

Requires **Node.js 18+**. No external database setup is required (uses built-in JSON store).

1. **Clone the repository**:
   ```bash
   git clone https://github.com/elizabethmacharia366-art/CIVIC-WATCH.git
   cd CIVIC-WATCH
   ```

2. **Start the local server**:
   ```bash
   npm start
   ```

3. **Access the application**:
   Open your browser to [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/login.html](http://localhost:3000/login.html).

---

## 🌟 Key Features

- **WhatsApp Dark Theme**: Premium `#111b21` dark mode aesthetic with `#25d366` emerald accents, glassmorphic headers (`#202c33`), and responsive SVG icon navigation.
- **Role-Based Portals**:
  - **Citizen Portal**: Submit issues with location & evidence, view real-time status updates (`Pending`, `In Progress`, `Resolved`), multi-language switcher (English / Swahili).
  - **Department Portal**: Dispatch operations, manage assigned tasks, track resolution turnaround (SLA metrics), interactive dispatch map.
  - **Admin Portal**: Executive statistics dashboard, regional issue distribution charts, category breakdowns, user administration.
- **Secure Authentication**: Salted `crypto.scryptSync` password hashing, HTTP-only session cookies (`cw_session`), and automatic session purge on logout.
