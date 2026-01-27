import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importPricebook } from "@/lib/pricebook/importPricebook";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const totalResults = {
      itemsCreated: 0,
      itemsUpdated: 0,
      ratesCreated: 0,
      ratesUpdated: 0,
      errors: [] as string[],
      filesProcessed: 0,
    };

    // Process each file
    for (const file of files) {
      if (!file.name.endsWith(".csv")) {
        totalResults.errors.push(`${file.name}: Not a CSV file`);
        continue;
      }

      try {
        // Read file content
        const csvText = await file.text();
        const checksum = crypto.createHash("md5").update(csvText).digest("hex");

        // Check for duplicate upload by checksum
        const existingUpload = await prisma.priceBookUpload.findFirst({
          where: { checksum },
        });

        if (existingUpload) {
          totalResults.errors.push(
            `${file.name}: Duplicate upload detected (checksum match)`
          );
          continue;
        }

        // Create upload record
        const upload = await prisma.priceBookUpload.create({
          data: {
            filename: file.name,
            checksum,
            notes: null,
            isActive: false,
            effectiveDate: new Date(),
          },
        });

        // Import the CSV
        const importResult = await importPricebook({
          uploadId: upload.id,
          csvText,
        });

        totalResults.itemsCreated += importResult.itemsCreated;
        totalResults.itemsUpdated += importResult.itemsUpdated;
        totalResults.ratesCreated += importResult.ratesCreated;
        totalResults.ratesUpdated += importResult.ratesUpdated;
        totalResults.errors.push(...importResult.errors.map(err => `${file.name}: ${err}`));

        if (importResult.errors.length === 0) {
          totalResults.filesProcessed++;
        }

        // Mark this upload as active and deactivate others
        await prisma.priceBookUpload.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });

        await prisma.priceBookUpload.update({
          where: { id: upload.id },
          data: { isActive: true },
        });
      } catch (fileError) {
        totalResults.errors.push(
          `${file.name}: ${fileError instanceof Error ? fileError.message : String(fileError)}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...totalResults,
    });
  } catch (error) {
    console.error("Price book upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
