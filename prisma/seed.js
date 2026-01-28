import { prisma } from "../lib/prisma.ts";

async function main() {
  // wipe (dev only)
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.location.deleteMany();
  await prisma.customer.deleteMany();

  // Customer 1
  const c1 = await prisma.customer.create({
    data: {
      name: "Brown, Kathryn",
      phone: "403-555-0101",
      locations: {
        create: [
          {
            name: "Home",
            address: "990 Scenic Dr S, Unit #8, Lethbridge",
          },
        ],
      },
    },
    include: { locations: true },
  });

  // Completed + uninvoiced (should appear on reporting list)
  await prisma.workOrder.create({
    data: {
      customerId: c1.id,
      locationId: c1.locations[0].id,
      status: "COMPLETED",
      completedAt: new Date(),
      description:
        "Installed humidifier Nov 5; customer says it is not working.",
    },
  });

  // Customer 2
  const c2 = await prisma.customer.create({
    data: {
      name: "A-1 Truck Wash",
      locations: {
        create: [
          {
            name: "Shop",
            address: "123 Industrial Rd, Lethbridge",
          },
        ],
      },
    },
    include: { locations: true },
  });

  // Completed + invoiced (should NOT appear on reporting list)
  const wo2 = await prisma.workOrder.create({
    data: {
      customerId: c2.id,
      locationId: c2.locations[0].id,
      status: "COMPLETED",
      completedAt: new Date(),
      description: "Service call - furnace check.",
    },
  });

await prisma.invoice.create({
  data: {
    customerId: c2.id,
    locationId: c2.locations[0].id,
    workOrderId: wo2.id,
    status: "SENT",
    subtotal: 15000,
    tax: 750,
    total: 15750,
    lineItems: {
      create: [
        {
          type: "LABOR",
          description: "Service call labor",
          quantity: 1,
          unitPrice: 15000,
          total: 15000,
        },
      ],
    },
  },
});

console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });