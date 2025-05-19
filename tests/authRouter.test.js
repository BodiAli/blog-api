const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinaryConfig");
const authRouter = require("../routes/authRouter");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");

const { vi } = await import("vitest");

require("../config/passportConfig");

const app = express();

app.use(express.json());

app.use("/auth", authRouter);

vi.spyOn(jwt, "sign");

vi.spyOn(cloudinary.uploader, "upload").mockImplementation(() =>
  Promise.resolve({ secure_url: "url", public_id: "id" })
);

describe("authRouter", () => {
  beforeEach(() => {
    jwt.sign.mockImplementation(() => "token");
  });
  const buffer = Buffer.alloc(10);

  describe("post sign-up", () => {
    describe("given valid user inputs", () => {
      it("should create user and return token", async () => {
        await request(app)
          .post("/auth/sign-up")
          .attach("userImage", buffer, { filename: "profilePicture.jpg" })
          .field("firstName", "bodi")
          .field("lastName", "ali")
          .field("email", "bodi@gmail.com")
          .field("password", "12345")
          .field("confirmPassword", "12345")
          .expect("Content-Type", /json/)
          .expect({ token: "Bearer token" })
          .expect(201);

        expect(await prisma.user.count()).toEqual(1);
      });
    });

    describe("given invalid user inputs", () => {
      it("should return a 400 bad requests with errors", async () => {
        await request(app)
          .post("/auth/sign-up")
          .attach("userImage", buffer, { filename: "invalidType.jpg", contentType: "video/mp4" })
          .field("firstName", "bodi")
          .field("password", "123")
          .expect({
            errors: [
              {
                type: "field",
                value: "",
                msg: "Last Name can not be empty.",
                path: "lastName",
                location: "body",
              },
              {
                type: "field",
                value: "",
                msg: "Email can not be empty.",
                path: "email",
                location: "body",
              },
              {
                type: "field",
                value: "",
                msg: "Email must be a valid email.",
                path: "email",
                location: "body",
              },
              {
                type: "field",
                value: "123",
                msg: "Password must be at least 5 characters.",
                path: "password",
                location: "body",
              },
              {
                type: "field",
                msg: "Password and password confirmation do not match.",
                path: "confirmPassword",
                location: "body",
              },
              {
                type: "field",
                msg: "File uploaded is not of type image.",
                path: "userImage",
                location: "body",
              },
            ],
          })
          .expect("Content-Type", /json/)
          .expect(400);
      });
    });
  });

  describe("post log-in", () => {
    describe("given valid login credentials", () => {
      it("should log in user and return token", async () => {
        await request(app)
          .post("/auth/log-in")
          .type("json")
          .send({ email: "bodi@gmail.com", password: "12345" })
          .expect("Content-Type", /json/)
          .expect({ token: "Bearer token" })
          .expect(200);
      });
    });

    describe("given invalid login credentials", () => {
      it("should return a 400 status code and an error message", async () => {
        await request(app)
          .post("/auth/log-in")
          .type("json")
          .send({ email: "bodi@gmail.com", password: "invalid password" })
          .expect("Content-Type", /json/)
          .expect({ error: "Incorrect email or password" })
          .expect(401);
      });
    });
  });

  describe("validate token", () => {
    describe("given valid token", () => {
      it("should return logged in user", async () => {
        jwt.sign.mockReset();

        const user = await prisma.user.findUnique({
          where: {
            email: "bodi@gmail.com",
          },
          include: {
            Profile: {
              select: {
                profileImgUrl: true,
              },
            },
          },
          omit: {
            email: true,
            password: true,
            profileId: true,
          },
        });

        const token = issueJwt(user);

        await request(app).get("/auth/validate").auth(token, { type: "bearer" }).expect(user).expect(200);
      });
    });

    describe("given invalid token", () => {
      it("should return 401 unauthorized", async () => {
        await request(app).get("/auth/validate").auth("invalid token").expect(401);
      });
    });
  });
});
