const prisma = require("../../prisma/prismaClient");

const { afterAll } = await import("vitest");

afterAll(async () => {
  await prisma.comment.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});
