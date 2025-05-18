const express = require("express");
const request = require("supertest");
const authRouter = require("../routes/authRouter");
const prisma = require("../prisma/prismaClient");

const app = express();

app.use(express.json());

app.use("/auth", authRouter);

jest.mock("jsonwebtoken", () => ({
  sign: () => "token",
}));

beforeEach(async () => {
  await prisma.user.deleteMany();
});

describe("authRouter Routes", () => {
  test("signup auth route works", (done) => {
    const buffer = Buffer.alloc(10);

    request(app)
      .post("/auth/sign-up")
      .attach("userImage", buffer, {})
      .field("firstName", "bodi")
      .field("lastName", "ali")
      .field("email", "bodi@gmail.com")
      .field("password", "12345")
      .field("confirmPassword", "12345")
      .expect({ token: "Bearer token" })
      .expect(201, done);
  });
});
