import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings, klanten, projecten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { unlink } from "fs/promises";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    const meeting = db
      .select({
        id: meetings.id,
        titel: meetings.titel,
        datum: meetings.datum,
        status: meetings.status,
        klantId: meetings.klantId,
        projectId: meetings.projectId,
        klantNaam: klanten.bedrijfsnaam,
        projectNaam: projecten.naam,
        audioPad: meetings.audioPad,
        transcript: meetings.transcript,
        samenvatting: meetings.samenvatting,
        actiepunten: meetings.actiepunten,
        besluiten: meetings.besluiten,
        openVragen: meetings.openVragen,
        aangemaaktDoor: meetings.aangemaaktDoor,
        aangemaaktOp: meetings.aangemaaktOp,
      })
      .from(meetings)
      .leftJoin(klanten, eq(meetings.klantId, klanten.id))
      .leftJoin(projecten, eq(meetings.projectId, projecten.id))
      .where(eq(meetings.id, Number(id)))
      .get();

    if (!meeting) {
      return NextResponse.json(
        { fout: "Meeting niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ meeting });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    if (message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: message }, { status: 401 });
    }
    return NextResponse.json({ fout: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    const meeting = db
      .select({ id: meetings.id, audioPad: meetings.audioPad })
      .from(meetings)
      .where(eq(meetings.id, Number(id)))
      .get();

    if (!meeting) {
      return NextResponse.json(
        { fout: "Meeting niet gevonden" },
        { status: 404 }
      );
    }

    if (meeting.audioPad) {
      try {
        await unlink(meeting.audioPad);
      } catch {
        // Audio file may already be deleted
      }
    }

    db.delete(meetings).where(eq(meetings.id, Number(id))).run();

    return NextResponse.json({ succes: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    if (message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: message }, { status: 401 });
    }
    return NextResponse.json({ fout: message }, { status: 500 });
  }
}
