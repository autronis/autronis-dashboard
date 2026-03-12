import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

interface ParsedTransaction {
  datum: string;
  omschrijving: string;
  bedrag: number;
  type: "bij" | "af";
  categorie: string;
  tegenrekening: string;
  bank: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  software: ["software", "licentie", "github", "vercel", "netlify", "figma", "adobe", "notion", "slack", "zoom", "microsoft", "google workspace", "openai", "anthropic", "cursor"],
  hardware: ["hardware", "coolblue", "mediamarkt", "alternate", "azerty", "apple store"],
  kantoor: ["kantoor", "bol.com", "ikea", "staples", "bruna"],
  reiskosten: ["trein", "ns.nl", "brandstof", "shell", "bp ", "tinq", "esso", "parkeren", "ov-chipkaart", "uber", "taxi", "benzine"],
  marketing: ["google ads", "facebook", "linkedin", "instagram", "meta ads", "tiktok", "marketing", "reclame", "advertentie"],
  onderwijs: ["cursus", "training", "boek", "udemy", "coursera", "opleiding", "workshop"],
  telefoon: ["telefoon", "t-mobile", "kpn", "vodafone", "tele2", "simyo"],
  verzekeringen: ["verzekering", "aon", "interpolis", "achmea", "nationale nederlanden"],
  accountant: ["accountant", "boekhouder", "belasting", "moneybird", "exact online", "e-boekhouden"],
};

function categorizeTransaction(description: string): string {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }
  return "overig";
}

function parseDutchDate(dateStr: string): string {
  // Handle formats: DD-MM-YYYY, YYYYMMDD, DD/MM/YYYY, YYYY-MM-DD
  const trimmed = dateStr.trim().replace(/"/g, "");

  // YYYYMMDD
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  // Already ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

function parseDutchAmount(amountStr: string): number {
  // Dutch format: 1.234,56 or -1.234,56
  const cleaned = amountStr.trim().replace(/"/g, "");
  // If it uses comma as decimal separator
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(cleaned);
}

function detectAndParseCSV(csvText: string): { transactions: ParsedTransaction[]; bank: string } {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV bevat geen data.");
  }

  const headerLine = lines[0];

  // Detect ING format
  if (headerLine.includes("Naam / Omschrijving") || headerLine.includes("Af Bij")) {
    return { transactions: parseING(lines), bank: "ING" };
  }

  // Detect Rabobank format
  if (headerLine.includes("Naam tegenpartij") || (headerLine.includes("Rabo") && headerLine.includes("Af Bij"))) {
    return { transactions: parseRabobank(lines), bank: "Rabobank" };
  }

  // Detect ABN AMRO format (tab-separated, starts with account number)
  if (headerLine.includes("\t") || headerLine.includes("Muntsoort") || headerLine.includes("Beginsaldo")) {
    return { transactions: parseABN(lines), bank: "ABN AMRO" };
  }

  // Try generic CSV parsing
  return { transactions: parseGenericCSV(lines), bank: "Onbekend" };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseING(lines: string[]): ParsedTransaction[] {
  // "Datum","Naam / Omschrijving","Rekening","Tegenrekening","Code","Af Bij","Bedrag (EUR)","Mutatiesoort","Mededelingen"
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 7) continue;

    const datum = parseDutchDate(cols[0].replace(/"/g, ""));
    const naam = cols[1].replace(/"/g, "");
    const tegenrekening = cols[3].replace(/"/g, "");
    const afBij = cols[5].replace(/"/g, "").toLowerCase();
    const bedragRaw = parseDutchAmount(cols[6]);
    const mededelingen = cols[8]?.replace(/"/g, "") || "";
    const omschrijving = mededelingen ? `${naam} - ${mededelingen}` : naam;

    transactions.push({
      datum,
      omschrijving,
      bedrag: Math.abs(bedragRaw),
      type: afBij === "bij" ? "bij" : "af",
      categorie: categorizeTransaction(omschrijving),
      tegenrekening,
      bank: "ING",
    });
  }

  return transactions;
}

function parseRabobank(lines: string[]): ParsedTransaction[] {
  // "Datum","Naam tegenpartij","Rekening","Tegenrekening","Bedrag","Af Bij","Omschrijving"
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 6) continue;

    const datum = parseDutchDate(cols[0].replace(/"/g, ""));
    const naam = cols[1].replace(/"/g, "");
    const tegenrekening = cols[3].replace(/"/g, "");
    const bedragRaw = parseDutchAmount(cols[4]);
    const afBij = cols[5].replace(/"/g, "").toLowerCase();
    const omschrijvingRaw = cols[6]?.replace(/"/g, "") || "";
    const omschrijving = omschrijvingRaw ? `${naam} - ${omschrijvingRaw}` : naam;

    transactions.push({
      datum,
      omschrijving,
      bedrag: Math.abs(bedragRaw),
      type: afBij === "bij" ? "bij" : "af",
      categorie: categorizeTransaction(omschrijving),
      tegenrekening,
      bank: "Rabobank",
    });
  }

  return transactions;
}

function parseABN(lines: string[]): ParsedTransaction[] {
  // Tab-separated: Rekeningnummer, Muntsoort, Transactiedatum, Rentedatum, Beginsaldo, Eindsaldo, Bedrag, Omschrijving
  const transactions: ParsedTransaction[] = [];
  const hasHeader = lines[0].includes("Rekeningnummer") || lines[0].includes("Muntsoort");
  const startIdx = hasHeader ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 8) continue;

    const datum = parseDutchDate(cols[2]);
    const bedragRaw = parseDutchAmount(cols[6]);
    const omschrijving = cols[7].replace(/"/g, "").trim();

    transactions.push({
      datum,
      omschrijving,
      bedrag: Math.abs(bedragRaw),
      type: bedragRaw >= 0 ? "bij" : "af",
      categorie: categorizeTransaction(omschrijving),
      tegenrekening: "",
      bank: "ABN AMRO",
    });
  }

  return transactions;
}

function parseGenericCSV(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;

    const datum = parseDutchDate(cols[0].replace(/"/g, ""));
    const omschrijving = cols[1].replace(/"/g, "");
    const bedragRaw = parseDutchAmount(cols[2]);

    transactions.push({
      datum,
      omschrijving,
      bedrag: Math.abs(bedragRaw),
      type: bedragRaw >= 0 ? "bij" : "af",
      categorie: categorizeTransaction(omschrijving),
      tegenrekening: cols[3]?.replace(/"/g, "") || "",
      bank: "Onbekend",
    });
  }

  return transactions;
}

// POST /api/bank/import — Parse CSV upload
export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get("bestand");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ fout: "Geen bestand geupload." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".csv") && !file.name.toLowerCase().endsWith(".txt")) {
      return NextResponse.json({ fout: "Alleen CSV of TXT bestanden worden ondersteund." }, { status: 400 });
    }

    const csvText = await file.text();
    const { transactions, bank } = detectAndParseCSV(csvText);

    if (transactions.length === 0) {
      return NextResponse.json({ fout: "Geen transacties gevonden in het bestand." }, { status: 400 });
    }

    return NextResponse.json({
      transacties: transactions,
      bank,
      aantal: transactions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Kon bestand niet verwerken." },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
