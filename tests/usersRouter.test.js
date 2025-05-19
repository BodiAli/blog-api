const express = require("express");
const request = require("supertest");
const userRouter = require("../routes/usersRouter");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");

require("../config/passportConfig");

const app = express();

app.use(express.json());
app.use("/users", userRouter);

describe("userRouter routes", () => {
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
  });

  afterAll(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  test("/users/posts route works to get user posts", async () => {
    const token = issueJwt(user);

    const response = await request(app)
      .get("/users/posts")
      .auth(token, { type: "bearer" })
      .expect("Content-Type", /json/);

    expect(response.body.posts).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "post title 2", content: "post content 2" })])
    );
    expect(response.body.posts.length).toBe(2);
  });

  test("page query sanitizer works", async () => {
    const token = issueJwt(user);
    const response = await request(app)
      .get("/users/posts")
      .query({ page: "0" })
      .auth(token, { type: "bearer" })
      .expect("Content-Type", /json/);

    expect(response.body.pages).toBe(1);
  });
});
