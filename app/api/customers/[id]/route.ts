import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
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
  if (!customer) return new NextResponse("Customer not found", { status: 404 });

  // Flatten response to match UI expectations, include expanded fields
  const shaped = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    notes: customer.notes ?? customer.locations[0]?.notes ?? "",
    address: customer.locations[0]?.address ?? "",
    locationId: customer.locations[0]?.id ?? null,
    // Expanded fields
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName: customer.displayName,
    company: customer.company,
    role: customer.role,
    customerType: customer.customerType,
    emails: customer.emails,
    phones: customer.phones,
    addresses: customer.addresses,
    tags: customer.tags,
  };

  return NextResponse.json(shaped);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Accept both legacy and expanded payloads
  const {
    name,
    phone,
    email,
    notes,
    firstName,
    lastName,
    displayName,
    company,
    role,
    customerType,
    emails: newEmails,
    phones: newPhones,
    addresses: newAddresses,
    tags: newTags,
  } = body;

  // Update main customer fields
  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name,
      phone,
      email,
      notes,
      firstName,
      lastName,
      displayName,
      company,
      role,
      customerType,
    },
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
  }).catch(() => null);

  if (!updated) return new NextResponse("Customer not found", { status: 404 });

  // If notes were provided, update the primary location
  if (notes !== undefined && updated.locations[0]) {
    await prisma.location.update({
      where: { id: updated.locations[0].id },
      data: { notes },
    }).catch(() => null);
  }

  // Update related tables (emails, phones, addresses, tags) if provided
  // For simplicity, replace all if new arrays are provided
  if (Array.isArray(newEmails)) {
    await prisma.customerEmail.deleteMany({ where: { customerId: id } });
    await prisma.customerEmail.createMany({
      data: newEmails.map((e: any) => ({ customerId: id, value: typeof e === "string" ? e : e.value })),
      skipDuplicates: true,
    });
  }
  if (Array.isArray(newPhones)) {
    await prisma.customerPhone.deleteMany({ where: { customerId: id } });
    await prisma.customerPhone.createMany({
      data: newPhones.map((p: any) => ({
        customerId: id,
        type: p.type || "MOBILE",
        value: p.value,
        note: p.note || null,
      })),
      skipDuplicates: true,
    });
  }
  if (Array.isArray(newAddresses)) {
    await prisma.customerAddress.deleteMany({ where: { customerId: id } });
    await prisma.customerAddress.createMany({
      data: newAddresses.map((a: any) => ({
        customerId: id,
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
  if (Array.isArray(newTags)) {
    await prisma.customerTag.deleteMany({ where: { customerId: id } });
    await prisma.customerTag.createMany({
      data: newTags.map((t: any) => ({ customerId: id, value: typeof t === "string" ? t : t.value })),
      skipDuplicates: true,
    });
  }

  // Refetch with all relations
  const refetched = await prisma.customer.findUnique({
    where: { id },
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

  // Flatten response
  const shaped = {
    id: refetched.id,
    name: refetched.name,
    phone: refetched.phone ?? "",
    email: refetched.email ?? "",
    notes: refetched.notes ?? refetched.locations[0]?.notes ?? "",
    address: refetched.locations[0]?.address ?? "",
    locationId: refetched.locations[0]?.id ?? null,
    // Expanded fields
    firstName: refetched.firstName,
    lastName: refetched.lastName,
    displayName: refetched.displayName,
    company: refetched.company,
    role: refetched.role,
    customerType: refetched.customerType,
    emails: refetched.emails,
    phones: refetched.phones,
    addresses: refetched.addresses,
    tags: refetched.tags,
  };

  return NextResponse.json(shaped);
}
