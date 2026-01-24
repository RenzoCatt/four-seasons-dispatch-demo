import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // allow updating schedule fields when dragging
  const startAt = body.startAt ? new Date(body.startAt) : undefined;
  const endAt = body.endAt ? new Date(body.endAt) : undefined;
  const techId = body.techId ?? undefined;
  const status = body.status ?? undefined;

  try {
    const updated = await prisma.dispatchEvent.update({
      where: { id },
      data: {
        ...(startAt ? { startAt } : {}),
        ...(endAt ? { endAt } : {}),
        ...(techId ? { techId } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    // if id doesn't exist
    return NextResponse.json(
      { error: "Dispatch event not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.dispatchEvent.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Dispatch event not found" },
      { status: 404 }
    );
  }
}
