import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const activeUpload = await prisma.priceBookUpload.findFirst({
      where: { isActive: true },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!activeUpload) {
      return NextResponse.json({
        success: false,
        message: "No active price book found",
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: activeUpload.id,
        filename: activeUpload.filename,
        checksum: activeUpload.checksum,
        notes: activeUpload.notes,
        effectiveDate: activeUpload.effectiveDate,
        createdAt: activeUpload.createdAt,
        itemCount: activeUpload._count.items,
      },
    });
  } catch (error) {
    console.error("Price book active upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch active upload" },
      { status: 500 }
    );
  }
}
