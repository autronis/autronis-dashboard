import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchAllDocuments, getPageContent, updatePageSummary } from "@/lib/notion";
import { generateSummary } from "@/lib/ai/documenten";

export async function POST() {
  try {
    const gebruiker = await requireAuth();
    if (gebruiker.rol !== "admin") {
      return NextResponse.json({ fout: "Alleen admins kunnen dit uitvoeren" }, { status: 403 });
    }

    const result = await fetchAllDocuments({ pageSize: 100 });
    const docsWithoutSummary = result.documenten.filter((d) => !d.samenvatting);

    let processed = 0;
    let failed = 0;

    for (const doc of docsWithoutSummary) {
      try {
        const content = await getPageContent(doc.notionId);
        if (!content) continue;

        const samenvatting = await generateSummary(content);
        if (samenvatting) {
          await updatePageSummary(doc.notionId, samenvatting);
          processed++;
        }

        // Respect Notion rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      succes: true,
      totaal: docsWithoutSummary.length,
      verwerkt: processed,
      mislukt: failed,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon bulk samenvatting niet uitvoeren" }, { status: 500 });
  }
}
