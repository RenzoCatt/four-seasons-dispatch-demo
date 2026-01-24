import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_MAP: Record<string, "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"> = {
  new: "SCHEDULED",
  scheduled: "SCHEDULED",
  "in progress": "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  canceled: "CANCELED",
  cancelled: "CANCELED",
};

function normalizeStatus(input: unknown) {
  const key = String(input ?? "").trim().toLowerCase();
  return STATUS_MAP[key] ?? "SCHEDULED";
}

export async function GET() {
  const workOrders = await prisma.workOrder.findMany({
    include: {
      customer: true,
      location: true,
      invoice: true,
      dispatchEvent: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    workOrders.map((wo) => ({
      id: wo.id,
      jobNumber: wo.jobNumber,
      customerId: wo.customerId,
      locationId: wo.locationId,
      customerName: wo.customer.name,
      locationAddress: wo.location.address,
      description: wo.description ?? "",
      status: wo.status,
      completedAt: wo.completedAt?.toISOString() ?? null,
      // assignment info
      assignedTechId: wo.dispatchEvent?.techId ?? null,
      assignedStartAt: wo.dispatchEvent?.startAt?.toISOString?.() ?? null,
      assignedEndAt: wo.dispatchEvent?.endAt?.toISOString?.() ?? null,
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.customerId || !body?.locationId) {
    return new NextResponse("Missing customerId or locationId", { status: 400 });
  }

  const created = await prisma.workOrder.create({
    data: {
      customerId: body.customerId,
      locationId: body.locationId,
      description: body.description ?? "",
      status: normalizeStatus(body.status),
    },
    include: {
      customer: true,
      location: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
