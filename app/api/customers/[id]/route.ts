import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      locations: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
  if (!customer) return new NextResponse("Customer not found", { status: 404 });

  // Flatten response to match UI expectations
  const shaped = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? "",
    notes: customer.locations[0]?.notes ?? "",
    address: customer.locations[0]?.address ?? "",
    locationId: customer.locations[0]?.id ?? null,
  };

  return NextResponse.json(shaped);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email,
    },
    include: {
      locations: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  }).catch(() => null);

  if (!updated) return new NextResponse("Customer not found", { status: 404 });

  // If notes were provided, update the primary location
  if (body.notes !== undefined) {
    await prisma.location.update({
      where: { id: updated.locations[0]?.id ?? "" },
      data: { notes: body.notes },
    }).catch(() => null);
  }

  // Flatten response
  const shaped = {
    id: updated.id,
    name: updated.name,
    phone: updated.phone ?? "",
    notes: updated.locations[0]?.notes ?? "",
    address: updated.locations[0]?.address ?? "",
    locationId: updated.locations[0]?.id ?? null,
  };

  return NextResponse.json(shaped);
}
