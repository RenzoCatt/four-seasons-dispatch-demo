import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const jobs = await prisma.workOrder.findMany({
    where: {
      status: "COMPLETED",
      invoice: null, // KEY: uninvoiced only
    },
    include: {
      customer: true,
      location: true,
    },
    orderBy: { completedAt: "desc" },
  });

  // group by customer
  const grouped = Object.values(
    jobs.reduce((acc: any, wo) => {
      const cid = wo.customerId;
      if (!acc[cid]) {
        acc[cid] = { customer: wo.customer, jobs: [] };
      }
      acc[cid].jobs.push({
        id: wo.id,
        jobNumber: wo.jobNumber,
        completedAt: wo.completedAt,
        description: wo.description,
        location: wo.location,
      });
      return acc;
    }, {})
  );

  return NextResponse.json(grouped);
}
