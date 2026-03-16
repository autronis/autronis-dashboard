# Feature: Meeting-to-Action

## Overzicht
Upload een meeting-opname (audio) → AI maakt automatisch een samenvatting,
haalt actiepunten eruit en zet taken direct in het dashboard. Gekoppeld aan
projecten en klanten.

## Probleem
Na elk klantgesprek of intern overleg moet je handmatig notities maken,
actiepunten uitschrijven en taken aanmaken. Vaak vergeet je details, of het
blijft liggen en actiepunten verdwijnen.

## Oplossing
Een meeting-pipeline die audio omzet naar gestructureerde output:
samenvatting, actiepunten, besluiten en open vragen. Actiepunten worden
automatisch taken in het dashboard.

## Hoe het werkt
1. **Upload** — audio bestand uploaden via dashboard (of via n8n webhook vanuit telefoon)
2. **Transcriptie** — audio → tekst via Whisper API of Deepgram
3. **AI-verwerking** — Claude/OpenAI analyseert het transcript:
   - Samenvatting in 3-5 bullets
   - Actiepunten met wie verantwoordelijk is (Sem/Syb/klant)
   - Besluiten die genomen zijn
   - Open vragen die nog beantwoord moeten worden
4. **Taken aanmaken** — actiepunten worden automatisch taken in het dashboard
5. **Opslaan** — samenvatting + transcript gekoppeld aan project/klant

## Technische Aanpak

### Nieuwe Database Tabel: meetings
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | INTEGER PK | Auto increment |
| klant_id | INTEGER FK | → klanten.id (optioneel) |
| project_id | INTEGER FK | → projecten.id (optioneel) |
| titel | TEXT NOT NULL | Meeting titel |
| datum | TEXT NOT NULL | Datum van de meeting |
| audio_pad | TEXT | Pad naar audio bestand |
| transcript | TEXT | Volledige transcriptie |
| samenvatting | TEXT | AI-gegenereerde samenvatting |
| actiepunten | TEXT | JSON array van actiepunten |
| besluiten | TEXT | JSON array van besluiten |
| open_vragen | TEXT | JSON array van open vragen |
| status | TEXT DEFAULT 'verwerken' | verwerken / klaar / mislukt |
| aangemaakt_door | INTEGER FK | → gebruikers.id |
| aangemaakt_op | TEXT | ISO timestamp |

### Backend Pipeline
- n8n flow als processing pipeline:
  1. Webhook trigger (upload vanuit dashboard)
  2. Whisper API voor transcriptie
  3. Claude/OpenAI voor analyse
  4. Resultaat terugschrijven naar database
  5. Automatisch taken aanmaken in taken tabel

### Frontend
- **Meeting upload pagina** — drag & drop audio, selecteer klant/project
- **Meeting overzicht** — lijst van alle meetings, filterbaar per klant/project
- **Meeting detail pagina:**
  - Samenvatting bovenaan
  - Actiepunten als checkboxen (klikbaar → maak taak)
  - Besluiten en open vragen
  - Uitklapbaar: volledig transcript
  - Zoekbaar: "wat hebben we vorige maand met klant X besproken?"
- **Processing status** — spinner/progress tijdens verwerking

### API
- tRPC endpoint: `meeting.upload` — upload audio + metadata
- tRPC endpoint: `meeting.getAll` — lijst van meetings (met filters)
- tRPC endpoint: `meeting.getById` — detail van één meeting
- tRPC endpoint: `meeting.zoek` — zoek in transcripten en samenvattingen

### File Storage
- Audio bestanden opgeslagen via Supabase Storage (of lokaal in uploads/)
- Naamgeving: `meeting_[klant]_[datum]_[id].mp3`
- Max bestandsgrootte: 100MB

## Afhankelijkheden
- Autronis Dashboard Fase 2+ (klanten, projecten, taken moeten bestaan)
- n8n instance
- OpenAI Whisper API (of Deepgram) voor transcriptie
- Claude/OpenAI API voor analyse
- Supabase Storage (of lokale uploads/ directory)

## Implementatie Volgorde
1. Database tabel aanmaken
2. File upload endpoint bouwen
3. n8n processing pipeline opzetten (transcriptie + AI analyse)
4. tRPC endpoints voor CRUD
5. Frontend: upload pagina
6. Frontend: overzicht en detail pagina
7. Automatisch taken aanmaken vanuit actiepunten
8. Zoekfunctionaliteit
