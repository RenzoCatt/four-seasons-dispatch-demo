import "dotenv/config";
import { prisma } from "@/lib/prisma";

function extractProfile(notes: string) {
  const marker = "CustomerProfileJSON:";
  const idx = notes.indexOf(marker);
  if (idx === -1) return null;
  const json = notes.slice(idx + marker.length).trim();
  try { return JSON.parse(json); } catch { return null; }
}

async function main() {
  const customers = await prisma.customer.findMany({
    where: { notes: { contains: "CustomerProfileJSON:" } },
  });

  for (const c of customers) {
    const profile = c.notes ? extractProfile(c.notes) : null;
    if (!profile) continue;

    await prisma.customer.update({
      where: { id: c.id },
      data: {
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        displayName: profile.displayName ?? null,
        company: profile.company ?? null,
        role: profile.role ?? null,
        customerType: profile.customerType ?? undefined,
      },
    });

    if (Array.isArray(profile.emails) && profile.emails.length) {
      await prisma.customerEmail.createMany({
        data: profile.emails.map((v: string) => ({ customerId: c.id, value: v })),
        skipDuplicates: true,
      });
    }

    if (Array.isArray(profile.phones) && profile.phones.length) {
      await prisma.customerPhone.createMany({
        data: profile.phones.map((p: any) => ({
          customerId: c.id,
          type: (p.type ?? "MOBILE").toUpperCase(),
          value: p.value,
          note: p.note ?? null,
        })),
        skipDuplicates: true,
      });
    }

    if (Array.isArray(profile.addresses) && profile.addresses.length) {
      await prisma.customerAddress.createMany({
        data: profile.addresses.map((a: any) => ({
          customerId: c.id,
          street: a.street,
          unit: a.unit ?? null,
          municipality: a.municipality,
          province: a.province,
          postalCode: a.postalCode,
          addressNotes: a.addressNotes ?? null,
          isBilling: a.isBilling ?? false,
          isService: a.isService ?? true,
        })),
        skipDuplicates: true,
      });
    }

    if (Array.isArray(profile.tags) && profile.tags.length) {
      await prisma.customerTag.createMany({
        data: profile.tags.map((v: string) => ({ customerId: c.id, value: v })),
        skipDuplicates: true,
      });
    }

    // optional: clean notes by removing the JSON blob, keep the human text above it
    const cleaned = c.notes.split("\n---\n")[0]?.trim() || null;
    await prisma.customer.update({ where: { id: c.id }, data: { notes: cleaned } });
  }
}

main().finally(() => prisma.$disconnect());
