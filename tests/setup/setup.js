const { resetTables } = require("@prisma/client/sql");
const prisma = require("../../prisma/prismaClient");

const { afterAll } = await import("vitest");

afterAll(async () => {
  await prisma.$executeRaw(resetTables());
});
