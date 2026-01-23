import { NextResponse } from "next/server";
import { findLocation } from "@/app/api/locations/store";
import { createWorkOrder, getWorkOrdersByLocation } from "@/app/api/work-orders/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await params;
  return NextResponse.json(getWorkOrdersByLocation(locationId));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await params;
  const location = findLocation(locationId);
  if (!location) return new NextResponse("Location not found", { status: 404 });

  const body = await req.json();
  if (!body?.title) return new NextResponse("Missing title", { status: 400 });

  const wo = createWorkOrder({
    customerId: location.customerId,
    locationId,
    title: body.title,
    status: body.status ?? "draft",
    scheduledAt: body.scheduledAt,
    notes: body.notes ?? "",
  });

  return NextResponse.json(wo, { status: 201 });
}
