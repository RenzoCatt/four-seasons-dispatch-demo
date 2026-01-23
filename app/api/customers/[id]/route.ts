import { NextResponse } from "next/server";
import { findCustomer } from "../store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const customer = findCustomer(id);
  if (!customer) return new NextResponse("Customer not found", { status: 404 });

  return NextResponse.json(customer);
}
