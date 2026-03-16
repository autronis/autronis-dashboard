# Technology Stack

Frontend

Next.js (App Router, Turbopack)
React 19
TypeScript
TailwindCSS v4 (custom autronis-* design tokens)
Framer Motion

UI libraries

Custom UI components (modal, toast, confirm-dialog, form-field, animated-number)
shadcn/ui (selectively, being added)

Backend

Next.js API routes
iron-session (cookie-based auth)
bcrypt (password hashing)

Data

SQLite via better-sqlite3 + Drizzle ORM (WAL mode)

AI

OpenAI APIs
AI assistants

Automation

Make
n8n

Infrastructure

Vercel (hosting)
Resend (email)
@react-pdf/renderer (PDF generation)

---

# Coding Rules

Prefer TypeScript.

Avoid any.

Use clear types.

Keep components small.

Avoid overly complex state logic.

Prefer reusable hooks.

---

# UI Rules

Keep UI minimal and clean.

Dashboard design should stay consistent.

Respect dark mode.

Avoid unnecessary visual complexity.