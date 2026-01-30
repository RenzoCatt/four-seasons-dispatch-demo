import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  const body = await req.json();

  if (!body?.street || !body?.municipality || !body?.province || !body?.postalCode) {
    return new NextResponse("Missing required fields: street, municipality, province, postalCode", { status: 400 });
  }

  const address = await prisma.customerAddress.create({
    data: {
      customerId,
      street: body.street,
      unit: body.unit ?? null,
      municipality: body.municipality,
      province: body.province,
      postalCode: body.postalCode,
      addressNotes: body.addressNotes ?? null,
      isBilling: body.isBilling ?? false,
      isService: body.isService ?? true,
    },
  });

  return NextResponse.json(address, { status: 201 });
}
