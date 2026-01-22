import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(store.customers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = store.addCustomer({
    name: body.name ?? "",
    phone: body.phone ?? "",
    address: body.address ?? "",
    notes: body.notes ?? "",
  });
  return NextResponse.json(created, { status: 201 });
}
