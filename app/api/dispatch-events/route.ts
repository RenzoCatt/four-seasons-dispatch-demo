import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    events.map((e) => ({
      id: e.id,
      workOrderId: e.workOrderId,
      techId: e.techId,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      status: e.status, // return enum
      notes: e.notes ?? "",
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.workOrderId || !body?.techId || !body?.startAt || !body?.endAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // ✅ THIS is the fix: verify against DB, not store
  const wo = await prisma.workOrder.findUnique({
    where: { id: body.workOrderId },
  });

  if (!wo) {
    return NextResponse.json({ error: "Work order not found" }, { status: 400 });
  }

  const created = await prisma.dispatchEvent.create({
    data: {
      workOrderId: wo.id,
      techId: body.techId,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      status: normalizeDispatchStatus(body.status),
      notes: body.notes || null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
