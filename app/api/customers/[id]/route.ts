import { NextResponse } from "next/server";
import { findCustomer } from "../store";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const customer = findCustomer(params.id);
  if (!customer) return new NextResponse("Customer not found", { status: 404 });
  return NextResponse.json(customer);
}
