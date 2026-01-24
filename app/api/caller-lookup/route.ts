import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { phone } = await req.json();
  
  if (!phone) {
    return NextResponse.json({ found: false, customer: null });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      phone: {
        contains: phone.replace(/\D/g, ""),
      },
    },
  });

  return NextResponse.json({ found: Boolean(customer), customer });
}
