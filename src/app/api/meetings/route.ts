import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings, klanten, projecten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const klantId = searchParams.get("klantId");
    const projectId = searchParams.get("projectId");

    let query = db
      .select({
        id: meetings.id,
        titel: meetings.titel,
        datum: meetings.datum,
        status: meetings.status,
        klantId: meetings.klantId,
        projectId: meetings.projectId,
        klantNaam: klanten.bedrijfsnaam,
        projectNaam: projecten.naam,
        samenvatting: meetings.samenvatting,
        aangemaaktOp: meetings.aangemaaktOp,
      })
      .from(meetings)
      .leftJoin(klanten, eq(meetings.klantId, klanten.id))
      .leftJoin(projecten, eq(meetings.projectId, projecten.id))
      .orderBy(desc(meetings.datum))
      .$dynamic();

    if (klantId) {
      query = query.where(eq(meetings.klantId, Number(klantId)));
    } else if (projectId) {
      query = query.where(eq(meetings.projectId, Number(projectId)));
    }

    const result = query.all();

    return NextResponse.json({ meetings: result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    if (message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: message }, { status: 401 });
    }
    return NextResponse.json({ fout: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();

    const formData = await req.formData();
    const titel = formData.get("titel") as string | null;
    const datum = formData.get("datum") as string | null;
    const klantId = formData.get("klantId") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const audio = formData.get("audio") as File | null;

    if (!titel || !datum) {
      return NextResponse.json(
        { fout: "Titel en datum zijn verplicht" },
        { status: 400 }
      );
    }

    let audioPad: string | null = null;

    if (audio) {
      const uploadsDir = path.join(
        process.cwd(),
        "data",
        "uploads",
        "meetings"
      );
      await mkdir(uploadsDir, { recursive: true });

      const ext = audio.name.split(".").pop() || "webm";
      const timestamp = Date.now();
      const fileName = `meeting_${timestamp}.${ext}`;
      audioPad = path.join(uploadsDir, fileName);

      const buffer = Buffer.from(await audio.arrayBuffer());
      await writeFile(audioPad, buffer);
    }

    const result = db
      .insert(meetings)
      .values({
        titel,
        datum,
        klantId: klantId ? Number(klantId) : null,
        projectId: projectId ? Number(projectId) : null,
        audioPad,
        status: "verwerken",
        aangemaaktDoor: gebruiker.id,
      })
      .run();

    const meeting = db
      .select()
      .from(meetings)
      .where(eq(meetings.id, Number(result.lastInsertRowid)))
      .get();

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    if (message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: message }, { status: 401 });
    }
    return NextResponse.json({ fout: message }, { status: 500 });
  }
}
