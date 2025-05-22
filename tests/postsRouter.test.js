const express = require("express");
const request = require("supertest");
const cloudinary = require("cloudinary");
const postsRouter = require("../routes/postsRouter");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");

const { vi } = await import("vitest");

require("../config/passportConfig");

const app = express();

app.use(express.json());

app.use("/posts", postsRouter);

vi.spyOn(cloudinary.v2.uploader, "upload").mockResolvedValue({
  secure_url: "postImgUrl",
  public_id: "postImgId",
});

vi.spyOn(cloudinary.v2.uploader, "destroy").mockResolvedValue({
  result: "ok",
});

describe("postsRouter routes", () => {
  let user;
  let post;

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
        imgUrl: "imgUrl",
        cloudId: "imgId",
        likes: 1,
        Topics: {
          create: [
            {
              name: "topic 1",
            },
            {
              name: "topic 2",
            },
          ],
        },

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

  describe("get all posts", () => {
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

    describe("given authenticated/unauthenticated user", () => {
      it("should return how many pages to view posts", async () => {
        const response = await request(app).get("/posts").expect(200).expect("Content-Type", /json/);

        expect(response.body.pages).toBe(1);
      });
    });
  });

  describe("get single post", () => {
    describe("given post is not found", () => {
      it("should send a 404 status and an error", async () => {
        await request(app).get(`/posts/1234`).expect(404);
      });
    });

    describe("given authenticated user", () => {
      it("should return single post and if post is liked or not", async () => {
        const token = issueJwt(user);

        const response = await request(app)
          .get(`/posts/${post.id}`)
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .expect(200);

        expect(response.body).toEqual(expect.objectContaining({ postLiked: true, id: post.id }));
      });
    });

    describe("given unauthenticated user", () => {
      it("should return post with postLiked false", async () => {
        const response = await request(app)
          .get(`/posts/${post.id}`)
          .expect("Content-Type", /json/)
          .expect(200);

        expect(response.body).toEqual(expect.objectContaining({ postLiked: false, id: post.id }));
      });
    });
  });

  describe("create post", () => {
    describe("given unauthenticated user", () => {
      it("should return 401 status", async () => {
        await request(app).post("/posts").expect(401);
      });
    });

    describe("given invalid post fields", () => {
      it("should return 400 status with errors", async () => {
        const token = issueJwt(user);

        const buffer = Buffer.alloc(10);

        await request(app)
          .post("/posts")
          .auth(token, { type: "bearer" })
          .attach("postImage", buffer, { filename: "post-cover.jpg" })
          .field("content", "post content")
          .expect("Content-Type", /json/)
          .expect({
            errors: [
              {
                type: "field",
                value: "",
                msg: "Title can not be empty.",
                path: "title",
                location: "body",
              },
            ],
          })
          .expect(400);
      });
    });

    describe("given valid post fields", () => {
      it("should create a new post", async () => {
        const buffer = Buffer.alloc(10);

        const token = issueJwt(user);

        await request(app)
          .post("/posts")
          .auth(token, { type: "bearer" })
          .attach("postImage", buffer, { filename: "post-cover.jpg" })
          .field("content", "post content 2")
          .field("title", "post title 2")
          .field("topics", ["topic 1", "topic 2"])
          .field("published", true)
          .expect(201)
          .expect({ msg: "Post created successfully!" });

        const createdPost = await prisma.post.findFirst({
          where: {
            title: "post title 2",
          },
          include: {
            Topics: true,
          },
        });

        expect(createdPost.imgUrl).toBe("postImgUrl");

        expect(createdPost.Topics).toEqual([
          expect.objectContaining({ name: "topic 1" }),
          expect.objectContaining({ name: "topic 2" }),
        ]);

        expect(createdPost.published).toBeTruthy();

        await prisma.post.deleteMany({
          where: {
            title: "post title 2",
          },
        });
      });
    });
  });

  describe("update post", () => {
    describe("given unauthenticated user", () => {
      it("should return unauthorized 401", async () => {
        await request(app).put(`/posts/${post.id}`).expect(401);
      });
    });

    describe("given invalid post inputs", () => {
      it("should return bad request 400 with errors", async () => {
        const buffer = Buffer.alloc(10);

        const token = issueJwt(user);
        await request(app)
          .put(`/posts/${post.id}`)
          .auth(token, { type: "bearer" })
          .attach("postImage", buffer, { filename: "post-cover.jpg" })
          .field("content", "content updated")
          .expect("Content-Type", /json/)
          .expect({
            errors: [
              {
                location: "body",
                msg: "Title can not be empty.",
                path: "title",
                type: "field",
                value: "",
              },
            ],
          })
          .expect(400);
      });
    });

    describe("given not found post", () => {
      it("should return not found 404 with error message", async () => {
        const buffer = Buffer.alloc(10);

        const token = issueJwt(user);
        await request(app)
          .put("/posts/1234")
          .auth(token, { type: "bearer" })
          .attach("postImage", buffer, { filename: "post-cover.jpg" })
          .field("content", "updated content")
          .field("title", "updated title")
          .expect("Content-Type", /json/)
          .expect(404)
          .expect({
            error: "Post not found! it may have been moved, deleted or it might have never existed.",
          });
      });
    });

    describe("given valid post inputs", () => {
      it("should update post", async () => {
        const buffer = Buffer.alloc(10);

        const topics = await prisma.topic.findMany();

        expect(topics.length).toBe(2);

        const token = issueJwt(user);
        await request(app)
          .put(`/posts/${post.id}`)
          .auth(token, { type: "bearer" })
          .attach("postImage", buffer, { filename: "post-cover.jpg" })
          .field("content", "updated content")
          .field("title", "updated title")
          .expect("Content-Type", /json/)
          .expect({
            msg: "Post updated successfully!",
          })
          .expect(200);

        const updatedPost = await prisma.post.findUnique({
          where: {
            id: post.id,
          },
        });

        const updatedTopics = await prisma.topic.findMany();
        expect(updatedTopics.length).toBe(0);

        expect(updatedPost.cloudId).toBe("postImgId");
        expect(updatedPost.imgUrl).toBe("postImgUrl");
        expect(updatedPost.title).toBe("updated title");
      });
    });
  });

  describe("update post publish", () => {
    describe("given unauthenticated user", () => {
      it("should return 401 unauthorized", async () => {
        await request(app).patch(`/posts/${post.id}/publish`).expect(401);
      });
    });

    describe("given post not found", () => {
      it("should return 404 and an error message", async () => {
        const token = issueJwt(user);

        await request(app)
          .patch("/posts/123/publish")
          .auth(token, { type: "bearer" })
          .send({ published: true })
          .expect("Content-Type", /json/)
          .expect(404)
          .expect({
            error: "Post not found! it may have been moved, deleted or it might have never existed.",
          });
      });
    });

    describe("given valid post publish", () => {
      it("should return ok 200, success message, and post", async () => {
        const token = issueJwt(user);

        const response = await request(app)
          .patch(`/posts/${post.id}/publish`)
          .auth(token, { type: "bearer" })
          .send({ published: false })
          .expect("Content-Type", /json/)
          .expect(200);

        expect(response.body.msg).toBe("Post updated successfully!");
        expect(response.body.post).toEqual(expect.objectContaining({ id: post.id, published: false }));

        const updatedPost = await prisma.post.findUnique({
          where: {
            id: post.id,
          },
        });

        expect(updatedPost.published).toBeFalsy();
      });
    });
  });

  describe("update post likes", () => {
    describe("given unauthenticated user", () => {
      it("it should return 401 unauthorized", async () => {
        await request(app).patch(`/posts/${post.id}/like`).expect(401);
      });
    });

    describe("given not found post", () => {
      it("should return 404 not found with message", async () => {
        const token = issueJwt(user);

        await request(app)
          .patch("/posts/123/like")
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .expect({
            error: "Post not found! it may have been moved, deleted or it might have never existed.",
          })
          .expect(404);
      });
    });

    describe("given already liked post", () => {
      it("should unlike post", async () => {
        const token = issueJwt(user);

        await request(app).patch(`/posts/${post.id}/like`).auth(token, { type: "bearer" }).expect(204);

        const existingLike = await prisma.likePosts.findUnique({
          where: {
            userId_postId: {
              postId: post.id,
              userId: user.id,
            },
          },
        });

        const updatedPost = await prisma.post.findUnique({
          where: {
            id: post.id,
          },
        });

        expect(updatedPost.likes).toBe(0);
        expect(existingLike).toBeNull();
      });
    });

    describe("given not liked post", () => {
      it("should unlike post", async () => {
        const token = issueJwt(user);

        await request(app).patch(`/posts/${post.id}/like`).auth(token, { type: "bearer" }).expect(204);

        const existingLike = await prisma.likePosts.findUnique({
          where: {
            userId_postId: {
              postId: post.id,
              userId: user.id,
            },
          },
        });

        const updatedPost = await prisma.post.findUnique({
          where: {
            id: post.id,
          },
        });

        expect(updatedPost.likes).toBe(1);
        expect(existingLike).toEqual(expect.objectContaining({ postId: post.id, userId: user.id }));
      });
    });
  });

  describe("delete post", () => {
    describe("given unauthenticated user", () => {
      it("should return 401 unauthorized", async () => {
        await request(app).delete(`/posts/${post.id}`).expect(401);
      });
    });

    describe("given not found post", () => {
      it("should return 404 and an error message", async () => {
        const token = issueJwt(user);

        await request(app)
          .delete("/posts/123")
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .expect({
            error: "Post not found! it may have been moved, deleted or it might have never existed.",
          })
          .expect(404);
      });
    });

    describe("given post found", () => {
      it("should delete post", async () => {
        const token = issueJwt(user);

        await request(app).delete(`/posts/${post.id}`).auth(token, { type: "bearer" }).expect(204);

        const deletedPost = await prisma.post.findUnique({
          where: {
            id: post.id,
          },
        });

        expect(deletedPost).toBeNull();
      });
    });
  });
});
