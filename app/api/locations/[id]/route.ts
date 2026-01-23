import { NextResponse } from "next/server";
import { findLocation, updateLocation } from "../store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loc = findLocation(id);
  if (!loc) return new NextResponse("Location not found", { status: 404 });
  return NextResponse.json(loc);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = updateLocation(id, {
    name: body.name,
    address: body.address,
    notes: body.notes,
  });

  if (!updated) return new NextResponse("Location not found", { status: 404 });
  return NextResponse.json(updated);
}
