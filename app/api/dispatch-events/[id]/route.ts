import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
const { id } = await ctx.params;
const eventId = id.startsWith("ev|") ? id.slice(3) : id; // ✅ safety
    const body = await req.json();

const updated = store.updateDispatchEvent(eventId, {
  techId: body.techId,
  startAt: body.startAt,
  endAt: body.endAt,
  status: body.status,
  notes: body.notes,
});

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Bad request" },
      { status: 400 }
    );
  }
}
