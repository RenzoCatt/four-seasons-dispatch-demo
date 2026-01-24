import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  const locations = await prisma.location.findMany({
    where: { customerId },
  });
  return NextResponse.json(locations);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  const body = await req.json();

  if (!body?.name || !body?.address) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const loc = await prisma.location.create({
    data: {
      customerId,
      name: body.name,
      address: body.address,
      notes: body.notes ?? "",
    },
  });

  return NextResponse.json(loc, { status: 201 });
}
