import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const wos = await prisma.workOrder.findMany({
    where: {
      status: "COMPLETED",
      invoice: null,
    },
    include: {
      customer: true,
      location: true,
      dispatchEvent: true,
    },
    orderBy: { completedAt: "desc" },
  });

  // group by customer
  const map = new Map<string, any>();

  for (const wo of wos) {
    const cid = wo.customerId;
    if (!map.has(cid)) {
      map.set(cid, {
        customerId: cid,
        customerName: wo.customer.name,
        jobs: [],
      });
    }

    map.get(cid).jobs.push({
      id: wo.id,
      jobNumber: wo.jobNumber,
      completedAt: wo.completedAt?.toISOString() ?? null,
      description: wo.description ?? "",
      location: wo.location.address,
      techId: wo.dispatchEvent?.techId ?? null,
    });
  }

  return NextResponse.json(Array.from(map.values()));
}
