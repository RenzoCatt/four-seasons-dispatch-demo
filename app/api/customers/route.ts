import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

console.error("DB HOST CHECK (DATABASE_URL):", (process.env.DATABASE_URL || "").split("@")[1]?.split("/")[0]);
console.error("DB HOST CHECK (DIRECT_URL):", (process.env.DIRECT_URL || "").split("@")[1]?.split("/")[0]);

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      emails: true,
      phones: true,
      addresses: true,
      tags: true,
      locations: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  // Return both legacy and expanded fields for migration safety
  const shaped = customers.map((c: any) => {
    const loc = Array.isArray(c.locations) && c.locations.length > 0 ? c.locations[0] : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? loc?.notes ?? "",
      address: loc?.address ?? "",
      locationId: loc?.id ?? null,
      // Expanded fields
      firstName: c.firstName,
      lastName: c.lastName,
      displayName: c.displayName,
      company: c.company,
      role: c.role,
      customerType: c.customerType,
      emails: c.emails,
      phones: c.phones,
      addresses: c.addresses,
      tags: c.tags,
    };
  });

  return NextResponse.json(shaped);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Accept both legacy and expanded payloads
    const name = body.name || body.displayName || "";
    const address = body.address || (body.addresses && body.addresses[0] && body.addresses[0].street) || "";
    if (!name || !address) {
      return new NextResponse("Missing required fields: name and address", { status: 400 });
    }

    // Expanded fields
    const {
      firstName,
      lastName,
      displayName,
      company,
      role,
      customerType,
      emails = [],
      phones = [],
      addresses = [],
      tags = [],
      notes,
      phone,
      email,
      locationName,
      createWorkOrderNow,
      workOrderDescription,
    } = body;

    // Step 1: Create customer
    // Step 1: Create customer (legacy fields only)
    const created = await prisma.customer.create({
    data: {
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      locations: {
        create: [
          {
            name: locationName || "Home",
            address,
            notes: notes || null,
          },
        ],
      },
    },
    include: {
      locations: true,
    },
  });

  // Step 2: Create related records for new fields
  const customerId = created.id;
  if (firstName || lastName || displayName || company || role || customerType) {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName: firstName || null,
        lastName: lastName || null,
        displayName: displayName || null,
        company: company || null,
        role: role || null,
        customerType: customerType || undefined,
      },
    });
  }
  if (emails.length) {
    await prisma.customerEmail.createMany({
      data: emails.map((e: any) => ({ customerId, value: typeof e === "string" ? e : e.value })),
      skipDuplicates: true,
    });
  }
  if (phones.length) {
    await prisma.customerPhone.createMany({
      data: phones.map((p: any) => ({
        customerId,
        type: p.type ? p.type.toUpperCase() : "MOBILE",
        value: p.value,
        note: p.note || null,
      })),
      skipDuplicates: true,
    });
  }
  if (addresses.length) {
    await prisma.customerAddress.createMany({
      data: addresses.map((a: any) => ({
        customerId,
        street: a.street,
        unit: a.unit || null,
        municipality: a.municipality,
        province: a.province,
        postalCode: a.postalCode,
        addressNotes: a.addressNotes || null,
        isBilling: a.isBilling ?? false,
        isService: a.isService ?? true,
      })),
      skipDuplicates: true,
    });
  }
  if (tags.length) {
    await prisma.customerTag.createMany({
      data: tags.map((t: any) => ({ customerId, value: typeof t === "string" ? t : t.value })),
      skipDuplicates: true,
    });
  }

  // Step 3: Refetch with all relations
  const full = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      emails: true,
      phones: true,
      addresses: true,
      tags: true,
      locations: true,
      workOrders: true,
      invoices: true,
    },
  });

  // Step 2: Create work order if requested
  if (createWorkOrderNow) {
    await prisma.workOrder.create({
      data: {
        customerId: created.id,
        locationId: created.locations[0].id,
        status: "SCHEDULED",
        description: workOrderDescription || "",
      },
    });
  }

  return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Failed to create customer:", err);
    return new NextResponse(`Failed to create customer: ${err?.message || err}`, { status: 500 });
  }
}
