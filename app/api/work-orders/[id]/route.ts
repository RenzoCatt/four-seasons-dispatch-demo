import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function PATCH(_: Request, ctx: { params: { id: string } }) {
  const body = await _.json();
  const updated = store.updateWorkOrder(ctx.params.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
