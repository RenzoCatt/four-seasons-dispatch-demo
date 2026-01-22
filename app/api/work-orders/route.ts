import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(store.workOrders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = store.addWorkOrder({
    customerId: body.customerId,
    jobType: body.jobType,
    description: body.description ?? "",
    status: body.status ?? "New",
    assignedTechId: body.assignedTechId,
  });
  return NextResponse.json(created, { status: 201 });
}
