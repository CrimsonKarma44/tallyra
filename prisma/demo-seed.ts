import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeTotals } from "../lib/totals";

const prisma = new PrismaClient();

const PASSWORD = "Demo1234";
const NOW = new Date();
const DAY_MS = 86_400_000;

type SaleSample = {
  soldAt: Date;
  note: string;
  taxRateBps: number;
  receiverName?: string;
  lines: { name: string; quantity: number; unitPriceCents: number }[];
};
type ExpenseSample = { spentAt: Date; amountCents: number; note: string };

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const SALE_TEMPLATES: SaleSample[] = [
  {
    soldAt: new Date(),
    note: "Walk-in customer",
    taxRateBps: 0,
    lines: [
      { name: "Rice 5kg", quantity: 2, unitPriceCents: 28500 },
      { name: "Cooking oil 1L", quantity: 1, unitPriceCents: 9500 },
    ],
  },
  {
    soldAt: new Date(),
    note: "Monthly restock",
    taxRateBps: 750,
    lines: [
      { name: "Beans 2kg", quantity: 3, unitPriceCents: 12000 },
      { name: "Garri 1kg", quantity: 5, unitPriceCents: 8500 },
      { name: "Groundnut oil 750ml", quantity: 2, unitPriceCents: 11000 },
    ],
  },
  {
    soldAt: new Date(),
    note: "Bulk purchase",
    taxRateBps: 0,
    receiverName: "Mrs. Ade",
    lines: [
      { name: "Tomato paste tin", quantity: 12, unitPriceCents: 3200 },
      { name: "Onions 1kg", quantity: 5, unitPriceCents: 2500 },
      { name: "Pepper 500g", quantity: 4, unitPriceCents: 4000 },
    ],
  },
  {
    soldAt: new Date(),
    note: "",
    taxRateBps: 0,
    lines: [
      { name: "Bread loaf", quantity: 2, unitPriceCents: 6500 },
      { name: "Milo tin", quantity: 1, unitPriceCents: 14500 },
      { name: "Peak milk sachet", quantity: 10, unitPriceCents: 1200 },
    ],
  },
  {
    soldAt: new Date(),
    note: "Credit sale",
    taxRateBps: 500,
    lines: [
      { name: "Detergent 1kg", quantity: 3, unitPriceCents: 18000 },
      { name: "Soap bar", quantity: 10, unitPriceCents: 2200 },
      { name: "Sponge pack", quantity: 5, unitPriceCents: 3500 },
    ],
  },
];

const EXPENSE_TEMPLATES: ExpenseSample[] = [
  { spentAt: new Date(), amountCents: 150000, note: "Market restock — rice, oil, beans" },
  { spentAt: new Date(), amountCents: 45000, note: "Transport" },
  {
    spentAt: new Date(),
    amountCents: 120000,
    note: "Bought crates of soft drinks and water",
  },
];

function applyTimeOffset(samples: { soldAt?: Date; spentAt?: Date }[], daysOffset: number, baseHour = 9) {
  return samples.map((s, i) => {
    const hour = (baseHour + i * 2) % 24;
    if ("soldAt" in s && s.soldAt) {
      const d = new Date(NOW.getTime() - daysOffset * DAY_MS);
      d.setHours(hour, 15 + i * 10, 0, 0);
      return { ...s, soldAt: d };
    }
    if ("spentAt" in s && s.spentAt) {
      const d = new Date(NOW.getTime() - daysOffset * DAY_MS);
      d.setHours(hour, 45 + i * 10, 0, 0);
      return { ...s, spentAt: d };
    }
    return s;
  });
}

async function createSales(
  userId: string,
  orgId: string | null,
  templates: SaleSample[],
) {
  for (const t of templates) {
    const totals = computeTotals(t.lines, t.taxRateBps);
    await prisma.transaction.create({
      data: {
        soldAt: t.soldAt,
        note: t.note,
        taxRateBps: t.taxRateBps,
        receiverName: t.receiverName ?? null,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        createdById: userId,
        ledgerOrgId: orgId,
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

async function createExpenses(
  userId: string,
  orgId: string | null,
  templates: ExpenseSample[],
) {
  for (const t of templates) {
    await prisma.expense.create({
      data: {
        spentAt: t.spentAt,
        amountCents: t.amountCents,
        note: t.note,
        createdById: userId,
        ledgerOrgId: orgId,
      },
    });
  }
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ── Personal accounts ────────────────────────────────────────────────
  const alabi = await prisma.user.upsert({
    where: { username: "alabi" },
    update: {},
    create: {
      username: "alabi",
      passwordHash: hash,
      email: "alabi@example.com",
      emailVerifiedAt: new Date(),
    },
  });
  const bello = await prisma.user.upsert({
    where: { username: "bello" },
    update: {},
    create: {
      username: "bello",
      passwordHash: hash,
      email: "bello@example.com",
      emailVerifiedAt: new Date(),
    },
  });
  const chidi = await prisma.user.upsert({
    where: { username: "chidi" },
    update: {},
    create: {
      username: "chidi",
      passwordHash: hash,
      email: "chidi@example.com",
      emailVerifiedAt: new Date(),
    },
  });
  const dayo = await prisma.user.upsert({
    where: { username: "dayo" },
    update: {},
    create: {
      username: "dayo",
      passwordHash: hash,
      email: "dayo@example.com",
      emailVerifiedAt: new Date(),
    },
  });

  // ── Organizations ────────────────────────────────────────────────────
  const orgA = await prisma.organization.upsert({
    where: { name: "Alabi Enterprises" },
    update: {},
    create: {
      name: "Alabi Enterprises",
      email: "alabi@enterprises.com",
      emailVerifiedAt: new Date(),
      adminId: alabi.id,
    },
  });
  await prisma.user.update({
    where: { id: alabi.id },
    data: { organizationId: orgA.id },
  });
  const orgB = await prisma.organization.upsert({
    where: { name: "Bello & Sons" },
    update: {},
    create: {
      name: "Bello & Sons",
      email: "bello@sons.com",
      emailVerifiedAt: new Date(),
      adminId: bello.id,
    },
  });
  await prisma.user.update({
    where: { id: bello.id },
    data: { organizationId: orgB.id },
  });

  // ── Org members ──────────────────────────────────────────────────────
  const orgAMembers: { id: string; username: string }[] = [];
  const orgBMembers: { id: string; username: string }[] = [];

  for (let i = 1; i <= 4; i++) {
    const u = await prisma.user.upsert({
      where: { username: `orgA_${i}` },
      update: {},
      create: {
        username: `orgA_${i}`,
        displayName: `Agent A${i}`,
        passwordHash: hash,
        email: `orgA_${i}@alabi.com`,
        emailVerifiedAt: new Date(),
        organizationId: orgA.id,
      },
    });
    orgAMembers.push(u);
  }

  for (let i = 1; i <= 4; i++) {
    const u = await prisma.user.upsert({
      where: { username: `orgB_${i}` },
      update: {},
      create: {
        username: `orgB_${i}`,
        displayName: `Agent B${i}`,
        passwordHash: hash,
        email: `orgB_${i}@bello.com`,
        emailVerifiedAt: new Date(),
        organizationId: orgB.id,
      },
    });
    orgBMembers.push(u);
  }

  // ── Check if data already exists ─────────────────────────────────────
  const existingSales = await prisma.transaction.count();
  if (existingSales > 0) {
    // Only seed sales/expenses once; print credentials regardless
    console.log("\n── Demo accounts ──────────────────────────────");
    console.log("All accounts use password: Demo1234");
    console.log("");
    console.log("Personal: alabi, bello, chidi, dayo");
    console.log("Org A (Alabi Enterprises) members: orgA_1, orgA_2, orgA_3, orgA_4");
    console.log("Org B (Bello & Sons)   members: orgB_1, orgB_2, orgB_3, orgB_4");
    console.log("");
    console.log("Log in as alabi to manage Org A, or as bello to manage Org B.");
    console.log("────────────────────────────────────────────────\n");
    return;
  }

  // ── Sales & expenses for personal users ──────────────────────────────
  const personalUsers = [
    { user: alabi, daysOffset: [3, 8, 14] },
    { user: bello, daysOffset: [4, 9, 12] },
    { user: chidi, daysOffset: [5, 10, 18, 25] },
    { user: dayo, daysOffset: [6, 11, 20] },
  ];
  for (const { user, daysOffset } of personalUsers) {
    const saleTemplates = pickRandom(SALE_TEMPLATES, 3).map((t, i) =>
      applyTimeOffset([{ ...t }], daysOffset[i])[0],
    ) as SaleSample[];
    await createSales(user.id, null, saleTemplates);
    const expenseTemplates = pickRandom(EXPENSE_TEMPLATES, 2).map((t, i) =>
      applyTimeOffset([{ ...t }], daysOffset[i] - 1, 14)[0],
    ) as ExpenseSample[];
    await createExpenses(user.id, null, expenseTemplates);
  }

  // ── Sales & expenses for org members ─────────────────────────────────
  for (const user of orgAMembers) {
    const daysOffset = [2, 7, 15, 22, 28];
    const n = Math.floor(Math.random() * 3) + 3;
    const saleTemplates = pickRandom(SALE_TEMPLATES, n).map((t, i) =>
      applyTimeOffset([{ ...t }], daysOffset[i % daysOffset.length])[0],
    ) as SaleSample[];
    await createSales(user.id, orgA.id, saleTemplates);
    const expenseTemplates = pickRandom(EXPENSE_TEMPLATES, 2).map((t, i) =>
      applyTimeOffset([{ ...t }], daysOffset[i], 14)[0],
    ) as ExpenseSample[];
    await createExpenses(user.id, orgA.id, expenseTemplates);
  }

  for (const user of orgBMembers) {
    const daysOffset = [1, 6, 13, 19, 26];
    const n = Math.floor(Math.random() * 3) + 3;
    const saleTemplates = pickRandom(SALE_TEMPLATES, n).map((t, i) =>
      applyTimeOffset([{ ...t }], daysOffset[i % daysOffset.length])[0],
    ) as SaleSample[];
    await createSales(user.id, orgB.id, saleTemplates);
    const expenseTemplates = pickRandom(EXPENSE_TEMPLATES, 2).map((t, i) =>
      applyTimeOffset([{ ...t }], daysOffset[i], 14)[0],
    ) as ExpenseSample[];
    await createExpenses(user.id, orgB.id, expenseTemplates);
  }

  // ── Print credentials ────────────────────────────────────────────────
  console.log("\n── Demo accounts ──────────────────────────────");
  console.log("All accounts use password: Demo1234");
  console.log("");
  console.log("Personal:              alabi, bello, chidi, dayo");
  console.log("Org A members:         orgA_1, orgA_2, orgA_3, orgA_4");
  console.log("Org B members:         orgB_1, orgB_2, orgB_3, orgB_4");
  console.log("");
  console.log("Log in as alabi (admin) to manage Org A at /org.");
  console.log("Log in as bello (admin) to manage Org B at /org.");
  console.log("────────────────────────────────────────────────\n");
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