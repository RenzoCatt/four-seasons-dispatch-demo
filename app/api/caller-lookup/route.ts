import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(req: Request) {
  const { phone } = await req.json();
  const customer = store.findCustomerByPhone(String(phone ?? ""));
  return NextResponse.json({ found: Boolean(customer), customer });
}
