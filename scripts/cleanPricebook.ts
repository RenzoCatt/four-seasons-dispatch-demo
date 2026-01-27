import { prisma } from "../lib/prisma.js";

async function clean() {
  try {
    console.log("Cleaning Price Book tables...");
    
    const ratesDeleted = await prisma.priceBookRate.deleteMany({});
    console.log(`Deleted ${ratesDeleted.count} rates`);
    
    const itemsDeleted = await prisma.priceBookItem.deleteMany({});
    console.log(`Deleted ${itemsDeleted.count} items`);
    
    const uploadsDeleted = await prisma.priceBookUpload.deleteMany({});
    console.log(`Deleted ${uploadsDeleted.count} uploads`);
    
    console.log("✓ Price Book tables cleaned!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clean();
