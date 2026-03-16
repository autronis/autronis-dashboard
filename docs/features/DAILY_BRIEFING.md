# Feature: Daily Briefing

## Overzicht
Gepersonaliseerde ochtend-briefing als eerste widget op de dashboard homepagina.
Elke gebruiker (Sem/Syb) ziet zijn eigen briefing met een AI-samenvatting van de dag.

## Probleem
Je begint je dag en moet eerst 10 apps checken: mail, agenda, taken, CRM, LinkedIn.
Kost 20-30 minuten voordat je weet wat er speelt en wat prioriteit heeft.

## Oplossing
Een briefing widget op de homepagina die alles samenvat in één overzicht.
Gepersonaliseerd per ingelogde gebruiker. Gecached in database, instant laden.

## Wat zit erin
- **"Goedemorgen [naam]"** header met AI-samenvatting van de dag in 2-3 zinnen
- **Agenda vandaag** — meetings, deadlines, belangrijke momenten
- **Openstaande taken** — top 3 prioriteit, overdue items
- **Nieuwe berichten** — onbeantwoorde mails, formulier-inzendingen (via n8n)
- **Project updates** — status van lopende klantprojecten
- **Quick wins** — taken die <5 min kosten maar wel af moeten
- **AI nieuwtje** — 1 relevant item uit Learning Radar (koppeling)

## Technische Aanpak

### Backend
- n8n flow die elke ochtend draait (bijv. 07:00)
- Haalt data op uit: database (taken, projecten, agenda), externe bronnen via API
- Claude/OpenAI genereert samenvatting
- Resultaat opgeslagen in database tabel `briefings`

### Nieuwe Database Tabel: briefings
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | INTEGER PK | Auto increment |
| gebruiker_id | INTEGER FK | → gebruikers.id |
| datum | TEXT NOT NULL | ISO datum (YYYY-MM-DD) |
| samenvatting | TEXT | AI-gegenereerde samenvatting |
| agenda_items | TEXT | JSON array van agenda items |
| taken_prioriteit | TEXT | JSON array van top taken |
| project_updates | TEXT | JSON array van updates |
| quick_wins | TEXT | JSON array van quick wins |
| ai_nieuws | TEXT | JSON object met 1 Learning Radar item |
| aangemaakt_op | TEXT | ISO timestamp |

### Frontend
- Briefing widget component op dashboard homepagina
- Cards/secties per onderdeel
- Klikbaar: klik op taak → ga naar taak, klik op meeting → open agenda
- Skeleton loading state
- Fallback als briefing nog niet gegenereerd is

### API
- tRPC endpoint: `briefing.getVandaag` — haalt briefing op voor ingelogde gebruiker
- tRPC endpoint: `briefing.regenereer` — handmatig opnieuw genereren

### n8n Flow
- Trigger: dagelijks om 07:00
- Stap 1: Haal taken, projecten, agenda op uit database
- Stap 2: Haal externe data op (mail count, etc.)
- Stap 3: Stuur naar Claude/OpenAI met samenvattingsprompt
- Stap 4: Sla resultaat op in briefings tabel

## Optioneel
- Push notification via email/Telegram als reminder om dashboard te openen
- Avond-briefing: samenvatting van wat je gedaan hebt die dag

## Afhankelijkheden
- Autronis Dashboard Fase 2+ (taken, projecten, agenda moeten bestaan)
- n8n instance
- OpenAI/Claude API key
- Learning Radar (voor AI nieuws widget, optioneel)

## Implementatie Volgorde
1. Database tabel aanmaken
2. tRPC endpoints bouwen
3. Frontend widget bouwen met mock data
4. n8n flow opzetten
5. Koppelen en testen
