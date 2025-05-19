const express = require("express");
const request = require("supertest");
const postsRouter = require("../routes/postsRouter");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");

require("../config/passportConfig");

const app = express();

app.use(express.json());

app.use("/posts", postsRouter);

describe("postsRouter routes", () => {
  let user;
  let post;

  describe("get all posts", () => {
    beforeAll(async () => {
      user = await prisma.user.create({
        data: {
          email: "bodi@gmail",
          firstName: "bodi",
          lastName: "ali",
          password: "12345",
          Profile: {
            create: {},
          },
        },
      });

      post = await prisma.post.create({
        data: {
          content: "post content",
          title: "post title",
          User: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      await prisma.likePosts.create({
        data: {
          postId: post.id,
          userId: user.id,
        },
      });
    });

    describe("given logged in user", () => {
      it("should return posts and if user has liked the post or not", async () => {
        const token = issueJwt(user);

        const response = await request(app).get("/posts").auth(token, { type: "bearer" }).expect(200);

        expect(response.body.posts).toEqual([
          expect.objectContaining({ title: "post title", userId: 1, liked: true }),
        ]);
      });
    });

    describe("given unauthenticated user", () => {
      it("should return posts with liked false property", async () => {
        const response = await request(app).get("/posts").expect(200);

        expect(response.body.posts).toEqual([
          expect.objectContaining({ title: "post title", userId: 1, liked: false }),
        ]);
      });
    });
  });
});
