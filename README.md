# Autronis Business Dashboard

Intern business dashboard voor Autronis — gebouwd met Next.js, SQLite en Tailwind CSS.

## Snel starten

### Vereisten

- Node.js 18+ (aanbevolen: 20+)
- npm

### Installatie

1. Clone de repository:

```bash
git clone <repo-url>
cd autronis-dashboard
```

2. Installeer dependencies:

```bash
npm install
```

3. Maak een `.env.local` bestand:

```bash
SESSION_SECRET=kies-een-geheim-wachtwoord-van-minimaal-32-tekens
```

4. Start de development server:

```bash
npm run dev
```

5. Open http://localhost:3000

6. Seed de database (eenmalig):

```bash
curl -X POST http://localhost:3000/api/seed
```

### Inloggegevens (demo)

| Gebruiker | Email | Wachtwoord |
|-----------|-------|------------|
| Sem Gijsberts | sem@autronis.com | Autronis2026! |
| Compagnon | compagnon@autronis.com | Autronis2026! |

## Technologie

- **Frontend:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 + custom Autronis thema
- **Database:** SQLite (via Drizzle ORM)
- **Auth:** iron-session (encrypted cookies)
- **Thema:** Donker/licht in Autronis huisstijl

## Projectstructuur

```
src/
├── app/           # Next.js pages en API routes
├── components/    # React componenten
├── lib/           # Database, auth, utilities
├── hooks/         # Custom React hooks
└── types/         # TypeScript types
```

## Modules

| Module | Status |
|--------|--------|
| Dashboard | 🏗️ Placeholder |
| Tijdregistratie | 🏗️ Placeholder |
| Klanten & Projecten | 🏗️ Placeholder |
| Financiën | 🏗️ Placeholder |
| Analytics | 🏗️ Placeholder |
| CRM / Leads | 🏗️ Placeholder |
| Agenda | 🏗️ Placeholder |
| Taken | 🏗️ Placeholder |
| Instellingen | ✅ Basis |

## Database

SQLite database in `data/autronis.db`. Dagelijkse backups in `backups/`.

### Migraties

```bash
npx drizzle-kit generate   # Genereer migratie
npx drizzle-kit push       # Pas toe op database
```
