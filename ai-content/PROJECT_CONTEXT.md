# Autronis Dashboard Context

This project is an internal system for Autronis.

Autronis builds automation systems, AI workflows and integrations for SMB companies.

This dashboard is used internally to manage:

- finance
- projects
- proposals
- operations
- AI assistants
- team workflows
- client systems

The dashboard acts as an internal operating system for the company.

---

# Key Features

The dashboard may include:

Finance tracking  
Proposal generation  
Client management  
Project tracking  
AI assistants  
Internal CRM  
Operations dashboard  
Reporting and analytics  

---

# Architecture Goal

The system should be:

- scalable
- modular
- easy to maintain
- clear TypeScript code
- minimal complexity

Avoid unnecessary abstractions.

Prefer simple clear implementations.

---

# Development Philosophy

Speed of building is important.

Focus on:

- working features
- clear code
- maintainable structure

Avoid overengineering.

---

# Roadmap

## Phase 1 — Foundation
- Keep current stack (Next.js App Router, SQLite, Drizzle, iron-session, Tailwind, custom UI)
- Add TanStack React Query for data fetching + caching
- Add shadcn/ui selectively for consistent UI primitives
- Make all stub modules fully functional
- Add lightweight event system
- Add background job foundation
- Add global search foundation
- Add notification center foundation

## Phase 2 — Intelligence
- AI assistant with real business data (projects, hours, invoices, clients)
- Mollie payment integration for invoices
- Forecasting and smart insights

## Phase 3 — Automation
- Make.com / n8n integrations
- Automatic invoice reminders
- Client portal
- Push notifications
- Workflow automations

## Phase 4 — Scale
- Permissions / RBAC
- Audit logging
- Reports / exports
- API keys for external integrations
- Consider Postgres migration only when scale requires it