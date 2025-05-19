const { resetTables } = require("@prisma/client/sql");
const prisma = require("../../prisma/prismaClient");

const { beforeAll, afterAll } = await import("vitest");

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$queryRawTyped(resetTables());
  await prisma.$disconnect();
});
