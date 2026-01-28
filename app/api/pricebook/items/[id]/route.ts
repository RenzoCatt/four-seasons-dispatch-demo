import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // item update (optional)
  const itemUpdate: any = {};
  if (typeof body.name === "string") itemUpdate.name = body.name.trim();
  if (typeof body.code === "string") itemUpdate.code = body.code.trim() || null;
  if (typeof body.description === "string") itemUpdate.description = body.description || null;
  if (typeof body.unit === "string") itemUpdate.unit = body.unit || null;

  // rates upsert (optional)
  const rates = Array.isArray(body.rates) ? body.rates : null;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.pricebookItemNew.update({
      where: { id },
      data: itemUpdate,
    });

    if (rates) {
      for (const r of rates) {
        const tier = r.tier;
        const unitPrice = Number(r.unitPrice);

        if (!tier || Number.isNaN(unitPrice)) continue;

        await tx.pricebookRateNew.upsert({
          where: { itemId_tier: { itemId: id, tier } },
          update: {
            unitPrice,
            hours: r.hours != null ? Number(r.hours) : null,
            hourlyRate: r.hourlyRate != null ? Number(r.hourlyRate) : null,
            equipment: r.equipment != null ? Number(r.equipment) : null,
            materialMarkup: r.materialMarkup != null ? Number(r.materialMarkup) : null,
          },
          create: {
            itemId: id,
            tier,
            unitPrice,
            hours: r.hours != null ? Number(r.hours) : null,
            hourlyRate: r.hourlyRate != null ? Number(r.hourlyRate) : null,
            equipment: r.equipment != null ? Number(r.equipment) : null,
            materialMarkup: r.materialMarkup != null ? Number(r.materialMarkup) : null,
          },
        });
      }
    }

    return tx.pricebookItemNew.findUnique({
      where: { id },
      include: { rates: true },
    });
  });

  return NextResponse.json(updated);
}
