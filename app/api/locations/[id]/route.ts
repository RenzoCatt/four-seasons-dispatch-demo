import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loc = await prisma.location.findUnique({
    where: { id },
  });
  if (!loc) return new NextResponse("Location not found", { status: 404 });
  return NextResponse.json(loc);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.location.update({
    where: { id },
    data: {
      name: body.name,
      address: body.address,
      notes: body.notes,
    },
  }).catch(() => null);

  if (!updated) return new NextResponse("Location not found", { status: 404 });
  return NextResponse.json(updated);
}
