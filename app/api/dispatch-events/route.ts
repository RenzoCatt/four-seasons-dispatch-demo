import { NextResponse } from "next/server";
import { store } from "@/lib/store";

function addMinutes(iso: string, minutes: number) {
  const t = new Date(iso).getTime();
  return new Date(t + minutes * 60_000).toISOString();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week") ?? "";

  try {
    const events = week ? store.listDispatchEventsForWeek(week) : store.dispatchEvents;
    return NextResponse.json(events);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const workOrderId = body.workOrderId as string;
    const techId = body.techId as string;
    const startAt = body.startAt as string;

    // allow either endAt OR durationMinutes
    let endAt = body.endAt as string | undefined;
    const durationMinutes = body.durationMinutes as number | undefined;

    if (!workOrderId || !techId || !startAt) {
      return NextResponse.json(
        { error: "workOrderId, techId, and startAt are required" },
        { status: 400 }
      );
    }

    if (!endAt) {
      const mins = typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : 120;
      endAt = addMinutes(startAt, mins);
    }

    const created = store.addDispatchEvent({
      workOrderId,
      techId,
      startAt,
      endAt,
      status: body.status ?? "Scheduled",
      notes: body.notes,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
