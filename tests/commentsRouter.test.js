const express = require("express");
const request = require("supertest");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");
const commentsRouter = require("../routes/commentsRouter");

require("../config/passportConfig");

const app = express();

app.use(express.json());

app.use("/posts/:postId/comments", commentsRouter);

describe("commentsRouter routes", () => {
  let user;
  let post;
  let comment;

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
        User: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    comment = await prisma.comment.create({
      data: {
        content: "comment content",
        postId: post.id,
        userId: user.id,
        likes: 1,
      },
    });

    await prisma.likeComments.create({
      data: {
        commentId: comment.id,
        userId: user.id,
      },
    });
  });

  describe("create comment", () => {
    describe("given unauthenticated user", () => {
      it("should return 401 unauthorized", async () => {
        await request(app).post(`/posts/${post.id}/comments`).expect(401);
      });
    });

    describe("given invalid post id", () => {
      it("should return 404 with error message", async () => {
        const token = issueJwt(user);
        await request(app)
          .post("/posts/123/comments")
          .auth(token, { type: "bearer" })
          .expect("content-type", /json/)
          .expect({
            error: "Post not found! it may have been moved, deleted or it might have never existed.",
          })
          .expect(404);
      });
    });

    describe("given invalid comment inputs", () => {
      it("should return 400 bad request with errors", async () => {
        const token = issueJwt(user);

        await request(app)
          .post(`/posts/${post.id}/comments`)
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .expect({
            errors: [
              {
                location: "body",
                msg: "Comment can not be empty.",
                path: "content",
                type: "field",
                value: "",
              },
            ],
          })
          .expect(400);
      });
    });

    describe("given valid comment inputs", () => {
      it("should return 201 created and create new comment", async () => {
        const token = issueJwt(user);

        const response = await request(app)
          .post(`/posts/${post.id}/comments`)
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .send({ content: "Created comment" })
          .expect(201);

        expect(response.body.msg).toBe("Comment created successfully!");
        expect(response.body.comment).toEqual(expect.objectContaining({ content: "Created comment" }));

        await prisma.comment.deleteMany({
          where: {
            content: "Created comment",
          },
        });
      });
    });
  });

  describe("update comment", () => {
    describe("given unauthenticated user", () => {
      it("should return 401 unauthorized", async () => {
        await request(app).put(`/posts/${post.id}/comments/${comment.id}`).expect(401);
      });
    });

    describe("given invalid post or comment id", () => {
      it("should return 404 not found", async () => {
        const token = issueJwt(user);

        await request(app).put("/posts/123/comments/123").auth(token, { type: "bearer" }).expect(404);
      });
    });

    describe("given invalid comment input", () => {
      it("should return 400 bad request with errors", async () => {
        const token = issueJwt(user);

        await request(app)
          .put(`/posts/${post.id}/comments/${comment.id}`)
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .expect({
            errors: [
              {
                location: "body",
                msg: "Comment can not be empty.",
                path: "content",
                type: "field",
                value: "",
              },
            ],
          })
          .expect(400);
      });
    });

    describe("given valid comment input", () => {
      it("should update comment", async () => {
        const token = issueJwt(user);

        await request(app)
          .put(`/posts/${post.id}/comments/${comment.id}`)
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .send({ content: "Updated comment" })
          .expect({
            msg: "Comment updated successfully!",
          })
          .expect(200);

        const updatedComment = await prisma.comment.findUnique({
          where: {
            id: comment.id,
          },
        });

        expect(updatedComment.content).toBe("Updated comment");
      });
    });
  });

  describe("update comment likes", () => {
    describe("given unauthenticated user", () => {
      it("it should return 401 unauthorized", async () => {
        await request(app).patch(`/posts/${post.id}/comments/${comment.id}/like`).expect(401);
      });
    });

    describe("given not found post or comment", () => {
      it("should return 404 not found", async () => {
        const token = issueJwt(user);

        await request(app)
          .patch("/posts/123/comments/123/like")
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .expect(404);
      });
    });

    describe("given already liked comment", () => {
      it("should unlike comment", async () => {
        const token = issueJwt(user);

        await request(app)
          .patch(`/posts/${post.id}/comments/${comment.id}/like`)
          .auth(token, { type: "bearer" })
          .expect(204);

        const existingLike = await prisma.likeComments.findUnique({
          where: {
            userId_commentId: {
              commentId: comment.id,
              userId: user.id,
            },
          },
        });

        const updatedComment = await prisma.comment.findUnique({
          where: {
            id: comment.id,
          },
        });

        expect(updatedComment.likes).toBe(0);
        expect(existingLike).toBeNull();
      });
    });

    describe("given not liked comment", () => {
      it("should unlike comment", async () => {
        const token = issueJwt(user);

        await request(app)
          .patch(`/posts/${post.id}/comments/${comment.id}/like`)
          .auth(token, { type: "bearer" })
          .expect(204);

        const existingLike = await prisma.likeComments.findUnique({
          where: {
            userId_commentId: {
              commentId: comment.id,
              userId: user.id,
            },
          },
        });

        const updatedComment = await prisma.comment.findUnique({
          where: {
            id: comment.id,
          },
        });

        expect(updatedComment.likes).toBe(1);
        expect(existingLike).toEqual(expect.objectContaining({ commentId: comment.id, userId: user.id }));
      });
    });
  });

  describe("delete comment", () => {
    describe("given unauthenticated user", () => {
      it("should return 401 unauthorized", async () => {
        await request(app).delete(`/posts/${post.id}/comments/${comment.id}`).expect(401);
      });
    });

    describe("given invalid post or comment ids", () => {
      it("should return 404 not found", async () => {
        const token = issueJwt(user);

        await request(app).delete("/posts/123/comments/123").auth(token, { type: "bearer" }).expect(404);
      });
    });

    describe("given not author of post or comment", () => {
      it("should return 403 forbidden and error message", async () => {
        const createdUser = await prisma.user.create({
          data: {
            firstName: "first name",
            lastName: "last name",
            email: "email@email",
            password: "12345",
            Profile: {
              create: {},
            },
          },
        });

        const token = issueJwt(createdUser);

        await request(app)
          .delete(`/posts/${post.id}/comments/${comment.id}`)
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /json/)
          .expect({ error: "You are not allowed to delete this comment" })
          .expect(403);

        await prisma.user.deleteMany({
          where: {
            email: "email@email",
          },
        });
      });
    });

    describe("given author of post", () => {
      it("should delete comment", async () => {
        const createdUser = await prisma.user.create({
          data: {
            firstName: "first name",
            lastName: "last name",
            email: "email@email",
            password: "12345",
            Profile: {
              create: {},
            },
          },
        });

        const createdPost = await prisma.post.create({
          data: {
            content: "created post",
            title: "created title",
            userId: createdUser.id,
          },
        });

        const createdComment = await prisma.comment.create({
          data: {
            content: "Created comment",
            userId: user.id,
            postId: createdPost.id,
          },
        });

        const token = issueJwt(createdUser);

        await request(app)
          .delete(`/posts/${createdPost.id}/comments/${createdComment.id}`)
          .auth(token, { type: "bearer" })
          .expect(204);

        expect(await prisma.comment.findUnique({ where: { id: createdComment.id } })).toBeNull();

        await prisma.post.delete({
          where: {
            id: createdPost.id,
          },
        });

        await prisma.user.delete({
          where: {
            id: createdUser.id,
          },
        });
      });
    });

    describe("given author of comment", () => {
      it("should delete comment", async () => {
        const token = issueJwt(user);

        await request(app)
          .delete(`/posts/${post.id}/comments/${comment.id}`)
          .auth(token, { type: "bearer" })
          .expect(204);

        expect(await prisma.comment.findUnique({ where: { id: comment.id } })).toBeNull();
      });
    });
  });
});
