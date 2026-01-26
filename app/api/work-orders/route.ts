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

  if (!body?.customerId) {
    return new NextResponse("Missing customerId", { status: 400 });
  }

  if (!body?.serviceAddress && !body?.locationId) {
    return new NextResponse("Missing serviceAddress or locationId", { status: 400 });
  }

  // Prepare locationId - either from body, or create a placeholder location
  let locationId = body.locationId;

  if (!locationId) {
    // Create a placeholder location from the serviceAddress
    // This maintains the FK constraint while transitioning from Location table to CustomerAddress
    const location = await prisma.location.create({
      data: {
        customerId: body.customerId,
        name: "Service Location",
        address: body.serviceAddress || "Address not specified",
        notes: "Auto-created from customer address",
      },
    });
    locationId = location.id;
  } else {
    // If locationId provided, verify it matches customerId
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { customerId: true },
    });

    if (!location) {
      return new NextResponse("Location not found", { status: 404 });
    }

    if (location.customerId !== body.customerId) {
      return new NextResponse("Location does not belong to customer", { status: 400 });
    }
  }

  const created = await prisma.workOrder.create({
    data: {
      customerId: body.customerId,
      locationId: locationId,
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
