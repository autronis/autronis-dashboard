import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateDraft } from "@/lib/ai/documenten";
import { AiDraftRequest } from "@/types/documenten";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = (await request.json()) as AiDraftRequest;

    if (!body.type || !body.titel) {
      return NextResponse.json({ fout: "Type en titel zijn verplicht" }, { status: 400 });
    }

    const draft = await generateDraft(body);
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon AI draft niet genereren" }, { status: 500 });
  }
}
