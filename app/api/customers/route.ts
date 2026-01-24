import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      locations: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const shaped = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    notes: c.locations[0]?.notes ?? "",
    address: c.locations[0]?.address ?? "",
    locationId: c.locations[0]?.id ?? null,
  }));

  return NextResponse.json(shaped);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.name || !body?.address) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const createWO = Boolean(body?.createWorkOrderNow);

  // Step 1: Create customer + location
  const created = await prisma.customer.create({
    data: {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      locations: {
        create: [
          {
            name: body.locationName || "Home",
            address: body.address,
            notes: body.notes || null,
          },
        ],
      },
    },
    include: { locations: true },
  });

  // Step 2: Create work order if checkbox was checked
  if (createWO) {
    await prisma.workOrder.create({
      data: {
        customerId: created.id,
        locationId: created.locations[0].id,
        status: "SCHEDULED",
        description: body.workOrderDescription || "",
      },
    });
  }

  return NextResponse.json(created, { status: 201 });
}
