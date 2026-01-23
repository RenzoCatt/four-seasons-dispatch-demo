import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(store.workOrders);
}

export async function POST(req: Request) {
  const body = await req.json();

  const created = store.addWorkOrder({
    customerId: body.customerId,
    locationId: body.locationId || undefined,          // NEW
    jobType: body.jobType,
    description: body.description ?? "",
    status: body.status ?? "New",
    assignedTechId: body.assignedTechId,
    attachments: body.attachments ?? [],               // NEW
  });

  return NextResponse.json(created, { status: 201 });
}
