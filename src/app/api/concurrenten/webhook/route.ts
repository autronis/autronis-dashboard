import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { concurrenten, concurrentScans } from "@/lib/db/schema";
import { requireApiKey } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { scanConcurrent, analyseMetAI } from "@/lib/scan-concurrent";

async function runScanForConcurrent(concurrentId: number) {
  const [scanRecord] = await db.insert(concurrentScans).values({
    concurrentId,
    status: "bezig",
    scanDatum: new Date().toISOString(),
  }).returning();

  try {
    const result = await scanConcurrent(concurrentId);
    await db.update(concurrentScans).set({
      status: "voltooid",
      websiteChanges: result.websiteChanges ? JSON.stringify(result.websiteChanges) : null,
      vacatures: result.vacatures ? JSON.stringify(result.vacatures) : null,
      socialActivity: result.socialActivity ? JSON.stringify(result.socialActivity) : null,
      aiSamenvatting: result.aiSamenvatting,
      aiHighlights: result.aiHighlights ? JSON.stringify(result.aiHighlights) : null,
      trendIndicator: result.trendIndicator,
      kansen: result.kansen ? JSON.stringify(result.kansen) : null,
    }).where(eq(concurrentScans.id, scanRecord.id)).run();
    return { ...scanRecord, ...result, status: "voltooid" };
  } catch (error) {
    await db.update(concurrentScans).set({ status: "mislukt" })
      .where(eq(concurrentScans.id, scanRecord.id)).run();
    return { ...scanRecord, status: "mislukt", fout: error instanceof Error ? error.message : "Onbekende fout" };
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireApiKey(req);
    const body = await req.json();

    if (!body.action) {
      return NextResponse.json({ fout: "action is verplicht (scan of data)" }, { status: 400 });
    }

    if (body.action === "scan") {
      if (body.concurrentId) {
        const scan = await runScanForConcurrent(body.concurrentId);
        return NextResponse.json({ scan });
      }

      const actieve = await db.select().from(concurrenten).where(eq(concurrenten.isActief, 1)).all();
      const results = [];
      for (const c of actieve) {
        const scan = await runScanForConcurrent(c.id);
        results.push(scan);
      }
      return NextResponse.json({ scans: results });
    }

    if (body.action === "data") {
      if (!body.concurrentId) {
        return NextResponse.json({ fout: "concurrentId is verplicht" }, { status: 400 });
      }

      const concurrent = await db.select().from(concurrenten)
        .where(eq(concurrenten.id, body.concurrentId)).get();
      if (!concurrent) {
        return NextResponse.json({ fout: "Concurrent niet gevonden" }, { status: 404 });
      }

      let aiResult = {
        aiSamenvatting: null as string | null,
        aiHighlights: null as string[] | null,
        trendIndicator: "stabiel" as "groeiend" | "stabiel" | "krimpend",
        kansen: null as string[] | null,
      };
      try {
        aiResult = await analyseMetAI(
          concurrent,
          body.websiteChanges || null,
          body.vacatures || null,
          body.socialActivity || null,
          null
        );
      } catch {
        // AI mislukt — ga door zonder
      }

      const [scan] = await db.insert(concurrentScans).values({
        concurrentId: body.concurrentId,
        status: "voltooid",
        scanDatum: new Date().toISOString(),
        websiteChanges: body.websiteChanges ? JSON.stringify(body.websiteChanges) : null,
        vacatures: body.vacatures ? JSON.stringify(body.vacatures) : null,
        socialActivity: body.socialActivity ? JSON.stringify(body.socialActivity) : null,
        aiSamenvatting: aiResult.aiSamenvatting,
        aiHighlights: aiResult.aiHighlights ? JSON.stringify(aiResult.aiHighlights) : null,
        trendIndicator: aiResult.trendIndicator,
        kansen: aiResult.kansen ? JSON.stringify(aiResult.kansen) : null,
      }).returning();

      return NextResponse.json({ scan });
    }

    return NextResponse.json({ fout: "Ongeldige action — gebruik 'scan' of 'data'" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "API key vereist" ? 401 : 500 }
    );
  }
}
