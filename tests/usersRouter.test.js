const express = require("express");
const request = require("supertest");
const usersRouter = require("../routes/usersRouter");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");

require("../config/passportConfig");

const app = express();

app.use(express.json());

app.use("/users", usersRouter);

describe("usersRouter routes", () => {
  let user;
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: "bodi@gmail",
        firstName: "bodi",
        lastName: "ali",
        password: "12345",
        Posts: {
          createMany: {
            data: [
              {
                content: "post content 1",
                title: "post title 1",
              },
              {
                content: "post content 2",
                title: "post title 2",
              },
            ],
          },
        },
        Profile: {
          create: {},
        },
      },
    });

    console.log(await prisma.user.findMany());
  });

  describe("get user's posts", () => {
    describe("given logged in user", () => {
      it("should return 200 and user's posts", async () => {
        const token = issueJwt(user);

        const response = await request(app).get("/users/posts").auth(token, { type: "bearer" });

        expect(response.body.posts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ title: "post title 2", content: "post content 2" }),
          ])
        );
        expect(response.body.posts.length).toBe(2);
      });
    });

    describe("given invalid page query", () => {
      it("should sanitize page query", async () => {
        const token = issueJwt(user);
        const response = await request(app)
          .get("/users/posts")
          .auth(token, { type: "bearer" })
          .query({ page: "0" });

        expect(response.statusCode).toBe(200);
        expect(response.body.pages).toBe(1);
      });
    });
  });
});
