import { NextResponse } from "next/server";
import { customers, createCustomer } from "./store";

export async function GET() {
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.name || !body?.phone || !body?.address) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const created = createCustomer({
    name: body.name,
    phone: body.phone,
    address: body.address,
    notes: body.notes ?? "",
  });

  return NextResponse.json(created, { status: 201 });
}
