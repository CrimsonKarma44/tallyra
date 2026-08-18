import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeTotals } from "../lib/totals";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.AUTH_USERNAME?.trim() || "agent";
  const password = process.env.AUTH_PASSWORD || "changeme";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  const existingSales = await prisma.transaction.count();
  if (existingSales > 0) {
    return;
  }

  const samples = [
    {
      soldAt: new Date("2026-08-16T09:15:00"),
      note: "Morning walk-in",
      taxRateBps: 0,
      receiverName: "Mang Tonyo",
      receiverAccount: "ACC-1042",
      receiverContact: "0917 555 0101",
      receiverAddress: "Brgy. San Isidro",
      lines: [
        { name: "Rice 5kg", quantity: 2, unitPriceCents: 28500 },
        { name: "Cooking oil 1L", quantity: 1, unitPriceCents: 9500 },
      ],
    },
    {
      soldAt: new Date("2026-08-17T14:40:00"),
      note: "Sari-sari restock",
      taxRateBps: 1200,
      lines: [
        { name: "Instant noodles", quantity: 12, unitPriceCents: 1500 },
        { name: "Sardines", quantity: 6, unitPriceCents: 2800 },
        { name: "Soap bar", quantity: 4, unitPriceCents: 2200 },
      ],
    },
    {
      soldAt: new Date("2026-08-18T11:05:00"),
      note: "",
      taxRateBps: 0,
      lines: [
        { name: "Bottled water", quantity: 3, unitPriceCents: 2000 },
        { name: "Bread loaf", quantity: 1, unitPriceCents: 6500 },
      ],
    },
  ];

  for (const sample of samples) {
    const totals = computeTotals(sample.lines, sample.taxRateBps);
    await prisma.transaction.create({
      data: {
        soldAt: sample.soldAt,
        note: sample.note,
        taxRateBps: sample.taxRateBps,
        receiverName: "receiverName" in sample ? sample.receiverName : null,
        receiverAccount: "receiverAccount" in sample ? sample.receiverAccount : null,
        receiverContact: "receiverContact" in sample ? sample.receiverContact : null,
        receiverAddress: "receiverAddress" in sample ? sample.receiverAddress : null,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        createdById: user.id,
        lines: {
          create: totals.lines.map((line, index) => ({
            name: line.name,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            lineTotalCents: line.lineTotalCents,
            sortOrder: index,
          })),
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
