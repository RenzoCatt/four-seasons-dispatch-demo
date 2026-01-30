import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function host(u?: string) {
  return (u || "").split("@")[1]?.split("/")[0] || "(missing)";
}

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

export async function GET(req: Request) {
  console.error("DATABASE_URL host:", host(process.env.DATABASE_URL));
  console.error("DIRECT_URL host:", host(process.env.DIRECT_URL));

  // Support optional customerId query param for filtering
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const where = customerId ? { customerId } : undefined;

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      customer: true,
      location: true,
      invoice: true,
      dispatchEvent: true,
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    workOrders.map((wo) => {
      // Calculate job amount from line items
      const jobAmount = wo.lineItems.reduce((sum: number, item: any) => sum + (item.qty ?? 0) * (item.unitPrice ?? 0), 0);
      const dueAmount = jobAmount; // For now, due = total (until payments are set up)

      return {
        id: wo.id,
        jobNumber: wo.jobNumber,
        customerId: wo.customerId,
        locationId: wo.locationId,
        customerName: wo.customer.name,
        locationAddress: wo.location.address,
        description: wo.description ?? "",
        status: wo.status,
        createdAt: wo.createdAt.toISOString(),
        completedAt: wo.completedAt?.toISOString() ?? null,
        // assignment info
        assignedTechId: wo.dispatchEvent?.techId ?? null,
        assignedStartAt: wo.dispatchEvent?.startAt?.toISOString?.() ?? null,
        assignedEndAt: wo.dispatchEvent?.endAt?.toISOString?.() ?? null,
        // amounts
        jobAmount,
        dueAmount,
        // line items for dispatch
        lineItems: wo.lineItems.map((item) => ({
          id: item.id,
          type: item.type,
          description: item.description,
          details: item.details ?? "",
          qty: item.qty,
        })),
      };
    })
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

  // Save line items if provided
  if (body.lineItems && Array.isArray(body.lineItems) && body.lineItems.length > 0) {
    await prisma.workOrderLineItem.createMany({
      data: body.lineItems.map((item: any) => ({
        workOrderId: created.id,
        type: item.kind || item.type || "SERVICE",
        description: item.description || "",
        details: item.details || null,
        qty: item.qty || 1,
        unitPrice: item.unitPrice || 0,
        taxable: item.taxable !== false,
      })),
    });
  }

  return NextResponse.json(created, { status: 201 });
}
