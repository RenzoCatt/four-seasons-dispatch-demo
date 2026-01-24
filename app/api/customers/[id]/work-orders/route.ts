import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  const workOrders = await prisma.workOrder.findMany({
    where: { customerId },
  });
  return NextResponse.json(workOrders);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  const body = await req.json();

  if (!body?.locationId) {
    return new NextResponse("Missing locationId", { status: 400 });
  }

  // Verify location exists and belongs to customer
  const location = await prisma.location.findUnique({
    where: { id: body.locationId },
  });

  if (!location || location.customerId !== customerId) {
    return new NextResponse("Location not found", { status: 404 });
  }

  const wo = await prisma.workOrder.create({
    data: {
      customerId,
      locationId: body.locationId,
      description: body.description ?? "",
      status: body.status ?? "SCHEDULED",
    },
  });

  return NextResponse.json(wo, { status: 201 });
}
