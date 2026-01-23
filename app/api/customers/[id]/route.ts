import { NextResponse } from "next/server";
import { findCustomer, updateCustomer } from "../store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const customer = findCustomer(id);
  if (!customer) return new NextResponse("Customer not found", { status: 404 });

  return NextResponse.json(customer);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = updateCustomer(id, {
    name: body.name,
    phone: body.phone,
    address: body.address,
    notes: body.notes,
  });

  if (!updated) return new NextResponse("Customer not found", { status: 404 });

  return NextResponse.json(updated);
}
