import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DispatchEvent } from "@prisma/client";

export const runtime = "nodejs";

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diffToMonday = (day + 6) % 7;
  x.setDate(x.getDate() - diffToMonday);
  return x;
}

const STATUS_MAP: Record<string, "SCHEDULED" | "IN_PROGRESS" | "COMPLETE" | "CANCELED"> = {
  scheduled: "SCHEDULED",
  "in progress": "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  complete: "COMPLETE",
  completed: "COMPLETE",
  canceled: "CANCELED",
  cancelled: "CANCELED",
};

function normalizeDispatchStatus(input: unknown) {
  const key = String(input ?? "").trim().toLowerCase();
  return STATUS_MAP[key] ?? "SCHEDULED";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const week = url.searchParams.get("week"); // "YYYY-MM-DD"
  const base = week ? new Date(week + "T00:00:00") : new Date();
  const monday = startOfWeekMonday(base);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const events = await prisma.dispatchEvent.findMany({
    where: {
      startAt: { gte: monday, lt: nextMonday },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(
    events.map((e: DispatchEvent) => ({
      id: e.id,
      workOrderId: e.workOrderId,
      techId: e.techId,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      status: e.status,
      type: e.type,
      notes: e.notes ?? "",
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.techId || !body?.startAt || !body?.endAt) {
    return NextResponse.json({ error: "Missing fields: techId, startAt, endAt required" }, { status: 400 });
  }

  // workOrderId is optional - allows pure tasks/meetings
  if (body?.workOrderId) {
    const wo = await prisma.workOrder.findUnique({
      where: { id: body.workOrderId },
    });

    if (!wo) {
      return NextResponse.json({ error: "Work order not found" }, { status: 400 });
    }
  }

  const created = await prisma.dispatchEvent.create({
    data: {
      workOrderId: body.workOrderId || null,
      techId: body.techId,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      type: body.type || "JOB",
      status: normalizeDispatchStatus(body.status),
      notes: body.notes || null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
