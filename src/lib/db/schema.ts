import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============ GEBRUIKERS ============
export const gebruikers = sqliteTable("gebruikers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  naam: text("naam").notNull(),
  email: text("email").notNull().unique(),
  wachtwoordHash: text("wachtwoord_hash").notNull(),
  rol: text("rol", { enum: ["admin", "gebruiker"] }).default("gebruiker"),
  uurtariefStandaard: real("uurtarief_standaard"),
  themaVoorkeur: text("thema_voorkeur", { enum: ["donker", "licht"] }).default("donker"),
  tweeFactorGeheim: text("twee_factor_geheim"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ KLANTEN ============
export const klanten = sqliteTable("klanten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bedrijfsnaam: text("bedrijfsnaam").notNull(),
  contactpersoon: text("contactpersoon"),
  email: text("email"),
  telefoon: text("telefoon"),
  adres: text("adres"),
  uurtarief: real("uurtarief"),
  notities: text("notities"),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ PROJECTEN ============
export const projecten = sqliteTable("projecten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  klantId: integer("klant_id").references(() => klanten.id),
  naam: text("naam").notNull(),
  omschrijving: text("omschrijving"),
  status: text("status", { enum: ["actief", "afgerond", "on-hold"] }).default("actief"),
  voortgangPercentage: integer("voortgang_percentage").default(0),
  deadline: text("deadline"),
  geschatteUren: real("geschatte_uren"),
  werkelijkeUren: real("werkelijke_uren").default(0),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ TIJDREGISTRATIES ============
export const tijdregistraties = sqliteTable("tijdregistraties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  projectId: integer("project_id").references(() => projecten.id),
  omschrijving: text("omschrijving"),
  startTijd: text("start_tijd").notNull(),
  eindTijd: text("eind_tijd"),
  duurMinuten: integer("duur_minuten"),
  categorie: text("categorie", { enum: ["development", "meeting", "administratie", "overig"] }).default("development"),
  isHandmatig: integer("is_handmatig").default(0),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ FACTUREN ============
export const facturen = sqliteTable("facturen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  klantId: integer("klant_id").references(() => klanten.id),
  projectId: integer("project_id").references(() => projecten.id),
  factuurnummer: text("factuurnummer").notNull().unique(),
  status: text("status", { enum: ["concept", "verzonden", "betaald", "te_laat"] }).default("concept"),
  bedragExclBtw: real("bedrag_excl_btw").notNull(),
  btwPercentage: real("btw_percentage").default(21),
  btwBedrag: real("btw_bedrag"),
  bedragInclBtw: real("bedrag_incl_btw"),
  factuurdatum: text("factuurdatum"),
  vervaldatum: text("vervaldatum"),
  betaaldOp: text("betaald_op"),
  isTerugkerend: integer("is_terugkerend").default(0),
  terugkeerInterval: text("terugkeer_interval", { enum: ["wekelijks", "maandelijks"] }),
  notities: text("notities"),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ FACTUUR REGELS ============
export const factuurRegels = sqliteTable("factuur_regels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  factuurId: integer("factuur_id").references(() => facturen.id, { onDelete: "cascade" }),
  omschrijving: text("omschrijving").notNull(),
  aantal: real("aantal").notNull(),
  eenheidsprijs: real("eenheidsprijs").notNull(),
  btwPercentage: real("btw_percentage").default(21),
  totaal: real("totaal"),
});

// ============ INKOMSTEN ============
export const inkomsten = sqliteTable("inkomsten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  factuurId: integer("factuur_id").references(() => facturen.id),
  klantId: integer("klant_id").references(() => klanten.id),
  omschrijving: text("omschrijving").notNull(),
  bedrag: real("bedrag").notNull(),
  datum: text("datum").notNull(),
  categorie: text("categorie"),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ UITGAVEN ============
export const uitgaven = sqliteTable("uitgaven", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  omschrijving: text("omschrijving").notNull(),
  bedrag: real("bedrag").notNull(),
  datum: text("datum").notNull(),
  categorie: text("categorie", { enum: ["software", "hardware", "kantoor", "reis", "overig"] }).default("overig"),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ DOELEN ============
export const doelen = sqliteTable("doelen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  type: text("type", { enum: ["omzet", "uren"] }).notNull(),
  maand: integer("maand").notNull(),
  jaar: integer("jaar").notNull(),
  doelwaarde: real("doelwaarde").notNull(),
  huidigeWaarde: real("huidige_waarde").default(0),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
}, (table) => ({
  uniekDoel: uniqueIndex("uniek_doel").on(table.gebruikerId, table.type, table.maand, table.jaar),
}));

// ============ LEADS ============
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bedrijfsnaam: text("bedrijfsnaam").notNull(),
  contactpersoon: text("contactpersoon"),
  email: text("email"),
  telefoon: text("telefoon"),
  waarde: real("waarde"),
  status: text("status", { enum: ["nieuw", "contact", "offerte", "gewonnen", "verloren"] }).default("nieuw"),
  bron: text("bron"),
  notities: text("notities"),
  volgendeActie: text("volgende_actie"),
  volgendeActieDatum: text("volgende_actie_datum"),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ NOTIFICATIES ============
export const notificaties = sqliteTable("notificaties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").notNull().references(() => gebruikers.id),
  type: text("type", { enum: ["factuur_te_laat", "deadline_nadert", "factuur_betaald", "taak_toegewezen"] }).notNull(),
  titel: text("titel").notNull(),
  omschrijving: text("omschrijving"),
  link: text("link"),
  gelezen: integer("gelezen").notNull().default(0),
  aangemaaktOp: text("aangemaakt_op").notNull().default(sql`(datetime('now'))`),
});

// ============ LEAD ACTIVITEITEN ============
export const leadActiviteiten = sqliteTable("lead_activiteiten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  gebruikerId: integer("gebruiker_id").notNull().references(() => gebruikers.id),
  type: text("type", { enum: ["email_verstuurd", "status_gewijzigd", "notitie_toegevoegd", "gebeld", "vergadering"] }).notNull(),
  titel: text("titel").notNull(),
  omschrijving: text("omschrijving"),
  aangemaaktOp: text("aangemaakt_op").notNull().default(sql`(datetime('now'))`),
});

// ============ AGENDA ITEMS ============
export const agendaItems = sqliteTable("agenda_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  titel: text("titel").notNull(),
  omschrijving: text("omschrijving"),
  type: text("type", { enum: ["afspraak", "deadline", "belasting", "herinnering"] }).default("afspraak"),
  startDatum: text("start_datum").notNull(),
  eindDatum: text("eind_datum"),
  heleDag: integer("hele_dag").default(0),
  herinneringMinuten: integer("herinnering_minuten"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ TAKEN ============
export const taken = sqliteTable("taken", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").references(() => projecten.id),
  toegewezenAan: integer("toegewezen_aan").references(() => gebruikers.id),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  titel: text("titel").notNull(),
  omschrijving: text("omschrijving"),
  status: text("status", { enum: ["open", "bezig", "afgerond"] }).default("open"),
  deadline: text("deadline"),
  prioriteit: text("prioriteit", { enum: ["laag", "normaal", "hoog"] }).default("normaal"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ NOTITIES ============
export const notities = sqliteTable("notities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  klantId: integer("klant_id").references(() => klanten.id),
  projectId: integer("project_id").references(() => projecten.id),
  leadId: integer("lead_id").references(() => leads.id),
  inhoud: text("inhoud").notNull(),
  type: text("type", { enum: ["notitie", "belangrijk", "afspraak"] }).default("notitie"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ DOCUMENTEN ============
export const documenten = sqliteTable("documenten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  klantId: integer("klant_id").references(() => klanten.id),
  projectId: integer("project_id").references(() => projecten.id),
  leadId: integer("lead_id").references(() => leads.id),
  naam: text("naam").notNull(),
  bestandspad: text("bestandspad").default(""),
  url: text("url"),
  type: text("type", { enum: ["contract", "offerte", "link", "overig"] }).default("overig"),
  versie: integer("versie").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ AUDIT LOG ============
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  actie: text("actie", { enum: ["aangemaakt", "bijgewerkt", "verwijderd"] }).notNull(),
  entiteitType: text("entiteit_type").notNull(),
  entiteitId: integer("entiteit_id"),
  oudeWaarde: text("oude_waarde"),
  nieuweWaarde: text("nieuwe_waarde"),
  ipAdres: text("ip_adres"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ BEDRIJFSINSTELLINGEN ============
export const bedrijfsinstellingen = sqliteTable("bedrijfsinstellingen", {
  id: integer("id").primaryKey(),
  bedrijfsnaam: text("bedrijfsnaam").default("Autronis"),
  adres: text("adres"),
  kvkNummer: text("kvk_nummer"),
  btwNummer: text("btw_nummer"),
  iban: text("iban"),
  email: text("email"),
  telefoon: text("telefoon"),
  logoPad: text("logo_pad"),
  standaardBtw: real("standaard_btw").default(21),
  betalingstermijnDagen: integer("betalingstermijn_dagen").default(30),
  herinneringNaDagen: integer("herinnering_na_dagen").default(7),
});
