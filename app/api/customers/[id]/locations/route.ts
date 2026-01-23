import { NextResponse } from "next/server";
import { createLocation, getLocationsByCustomer } from "@/app/api/locations/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  return NextResponse.json(getLocationsByCustomer(customerId));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  const body = await req.json();

  if (!body?.name || !body?.address) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const loc = createLocation({
    customerId,
    name: body.name,
    address: body.address,
    notes: body.notes ?? "",
  });

  return NextResponse.json(loc, { status: 201 });
}
