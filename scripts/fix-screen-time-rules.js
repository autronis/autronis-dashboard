// Fix and improve screen time categorization rules
// Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/fix-screen-time-rules.js

const { createClient } = require("@libsql/client");

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // 1. Delete all existing rules
  await c.execute("DELETE FROM screen_time_regels");
  console.log("Oude regels verwijderd");

  // 2. Insert clean, comprehensive rules
  const regels = [
    // === DEVELOPMENT (apps) ===
    ["app", "^Code$", "development", 10],
    ["app", "^cursor$", "development", 10],
    ["app", "^Terminal$", "development", 8],
    ["app", "^cmd$", "development", 8],
    ["app", "^powershell$", "development", 8],
    ["app", "^WindowsTerminal$", "development", 8],
    ["app", "^GitKraken$", "development", 7],

    // === DEVELOPMENT (venstertitels) ===
    ["venstertitel", "github\\.com", "development", 6],
    ["venstertitel", "localhost", "development", 6],
    ["venstertitel", "stackoverflow", "development", 5],
    ["venstertitel", "npm|node|next\\.js|react|typescript|vercel|drizzle|prisma|tailwind", "development", 5],
    ["venstertitel", "youtube\\.com.*(claude|code|programming|tutorial|dev|react|next|rust|agent|cursor|api|typescript|javascript|python|automation|n8n|make)", "development", 100],
    ["venstertitel", "YouTube.*(Claude|Code|Agent|Team|Programming|Tutorial|Developer|Coding|API|Build|Setup)", "development", 100],
    ["venstertitel", "developer\\.mozilla|mdn|w3schools", "development", 5],
    ["venstertitel", "supabase|turso|planetscale|neon\\.tech", "development", 6],
    ["venstertitel", "openai|anthropic|claude\\.ai|chatgpt|huggingface", "development", 7],
    ["venstertitel", "make\\.com|n8n|zapier|pipedream", "development", 6],
    ["venstertitel", "autronis|dashboard\\.autronis", "development", 7],

    // === COMMUNICATIE ===
    ["app", "^Discord$", "communicatie", 10],
    ["app", "^Slack$", "communicatie", 10],
    ["app", "^Teams$", "communicatie", 10],
    ["app", "^WhatsApp$", "communicatie", 10],
    ["venstertitel", "gmail|outlook|mail|protonmail", "communicatie", 6],
    ["venstertitel", "slack\\.com", "communicatie", 6],
    ["venstertitel", "calendar\\.google|agenda", "communicatie", 5],
    ["venstertitel", "meet\\.google|zoom\\.us|teams\\.microsoft", "communicatie", 7],

    // === DESIGN ===
    ["app", "^Figma$", "design", 10],
    ["app", "^Canva$", "design", 10],
    ["venstertitel", "figma\\.com", "design", 7],
    ["venstertitel", "canva\\.com|dribbble|behance|coolors", "design", 6],

    // === ADMINISTRATIE ===
    ["app", "^Excel$", "administratie", 8],
    ["app", "^Word$", "administratie", 8],
    ["app", "^Notion$", "administratie", 8],
    ["venstertitel", "notion\\.so", "administratie", 6],
    ["venstertitel", "docs\\.google|spreadsheet|document", "administratie", 5],
    ["venstertitel", "moneybird|exact|twinfield|e-boekhouden", "administratie", 7],
    ["venstertitel", "kvk\\.nl|KVK|Kamer van Koophandel", "administratie", 100],
    ["venstertitel", "digid\\.nl|DigiD|mijnoverheid", "administratie", 100],
    ["venstertitel", "belastingdienst|btw-aangifte|aangifte|toeslagen", "administratie", 100],
    ["venstertitel", "eenmanszaak|vof|vennootschap|bedrijfsregistratie|ondernemingsrecht", "administratie", 100],
    ["venstertitel", "inschrijven|BSN|UBO|formulier.*KVK|rechtsvorm", "administratie", 100],

    // === FINANCE (NL + EN) ===
    ["app", "^TradingView$", "finance", 10],
    ["venstertitel", "System Investing", "finance", 9],
    ["venstertitel", "Bitcoin Lab", "finance", 9],
    ["venstertitel", "BTCUSD|ETHUSD|SOLUSD|SUIUSD|ETHBTC|SOLBTC", "finance", 8],
    ["venstertitel", "ResearchBitcoin", "finance", 8],
    ["venstertitel", "CoinAnk|Liquidation", "finance", 8],
    // NL finance termen
    ["venstertitel", "investering|investeren|beleggen|belegging|rendement|portfolio|vermogen", "finance", 8],
    ["venstertitel", "koers|markt|grafiek|technische.analyse", "finance", 6],
    ["venstertitel", "aandelen|fondsen|etf|obligaties|dividend", "finance", 6],
    // EN finance termen
    ["venstertitel", "investing|investment|trading|trader|crypto|binance|coinbase|kraken|bybit|kucoin", "finance", 7],
    ["venstertitel", "bitcoin|ethereum|solana|altcoin|defi|nft|blockchain", "finance", 7],
    ["venstertitel", "stock|shares|chart|candle|indicator|futures|options", "finance", 6],
    // Brokers
    ["venstertitel", "degiro|interactive.brokers|saxo|flatex|trade.republic|revolut.*trading", "finance", 8],

    // === AFLEIDING ===
    ["venstertitel", "youtube\\.com(?!.*(claude|code|programming|tutorial|dev|react|next|rust|agent|cursor|api|typescript|javascript|python|automation|n8n|make))", "afleiding", 6],
    ["venstertitel", "reddit\\.com", "afleiding", 6],
    ["venstertitel", "twitter\\.com|x\\.com", "afleiding", 6],
    ["venstertitel", "instagram\\.com|tiktok\\.com", "afleiding", 6],
    ["venstertitel", "netflix|primevideo|disney\\+", "afleiding", 8],

    // === OVERIG ===
    ["app", "^Spotify$", "overig", 10],
    ["app", "^explorer$", "overig", 8],
    ["app", "^SnippingTool$", "overig", 9],
    ["app", "^LockApp$", "overig", 5],
    ["app", "^Inactief$", "inactief", 10],
    ["app", "^desktop-agent$", "overig", 9],
    ["app", "^ShellHost$", "overig", 5],
  ];

  for (const [type, patroon, categorie, prioriteit] of regels) {
    await c.execute({
      sql: "INSERT INTO screen_time_regels (type, patroon, categorie, prioriteit, is_actief) VALUES (?, ?, ?, ?, 1)",
      args: [type, patroon, categorie, prioriteit],
    });
  }

  console.log(`${regels.length} nieuwe regels ingevoerd`);

  // 3. Re-categorize ALL existing entries based on new rules
  const alleRegelsDb = await c.execute(
    "SELECT type, patroon, categorie, prioriteit FROM screen_time_regels WHERE is_actief = 1 ORDER BY prioriteit DESC"
  );

  const entries = await c.execute("SELECT id, app, venster_titel, categorie FROM screen_time_entries");
  console.log(`${entries.rows.length} entries om te checken`);

  let updated = 0;
  for (const entry of entries.rows) {
    let bestMatch = null;
    let bestPrio = -1;

    for (const regel of alleRegelsDb.rows) {
      try {
        const re = new RegExp(String(regel.patroon), "i");
        const target = regel.type === "app" ? String(entry.app || "") : String(entry.venster_titel || "");
        if (re.test(target) && Number(regel.prioriteit) > bestPrio) {
          bestMatch = regel.categorie;
          bestPrio = Number(regel.prioriteit);
        }
      } catch {
        // Skip invalid regex
      }
    }

    if (bestMatch && bestMatch !== entry.categorie) {
      await c.execute({
        sql: "UPDATE screen_time_entries SET categorie = ? WHERE id = ?",
        args: [bestMatch, entry.id],
      });
      updated++;
    }
  }

  console.log(`${updated} entries gehercategoriseerd`);
}

main().catch((e) => {
  console.error("Fout:", e);
  process.exit(1);
});
