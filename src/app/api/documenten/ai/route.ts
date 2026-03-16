import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateDraft, improveDocument, type ImproveMode } from "@/lib/ai/documenten";
import { AiDraftRequest } from "@/types/documenten";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    // Improve mode
    if (body.mode && body.content) {
      const result = await improveDocument(body.content, body.mode as ImproveMode);
      return NextResponse.json({ result });
    }

    // Draft generation mode
    const draftRequest = body as AiDraftRequest;
    if (!draftRequest.type || !draftRequest.titel) {
      return NextResponse.json({ fout: "Type en titel zijn verplicht" }, { status: 400 });
    }

    const draft = await generateDraft(draftRequest);
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon AI verzoek niet verwerken" }, { status: 500 });
  }
}
