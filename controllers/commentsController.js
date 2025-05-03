const passport = require("passport");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma/prismaClient");

const emptyErr = "can not be empty.";

const validateComment = [body("content").trim().notEmpty().withMessage(`Comment ${emptyErr}`)];

exports.createComment = [
  passport.authenticate("jwt", { session: false }),
  validateComment,
  async (req, res) => {
    const { postId } = req.params;
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

    if (!post) {
      res
        .status(404)
        .json({ error: "Post not found! it may have been moved, deleted or it might have never existed." });
      return;
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId: req.user.id,
      },
      include: {
        User: {
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
        },
      },
    });

    const formattedComment = { ...comment, commentLiked: false };

    res.status(201).json({ msg: "Comment created successfully!", comment: formattedComment });
  },
];

exports.updateComment = [
  passport.authenticate("jwt", { session: false }),
  validateComment,
  async (req, res) => {
    const { postId, commentId } = req.params;

    const [post, comment] = await Promise.all([
      prisma.post.findUnique({
        where: {
          id: postId,
        },
      }),

      prisma.comment.findUnique({
        where: {
          id: commentId,
        },
      }),
    ]);

    if (!post) {
      res
        .status(404)
        .json({ error: "Post not found! it may have been moved, deleted or it might have never existed." });
      return;
    }

    if (!comment) {
      res.status(404).json({
        error: "Comment not found! it may have been moved, deleted or it might have never existed.",
      });
      return;
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { content } = req.body;

    await prisma.comment.update({
      where: {
        id: commentId,
      },

      data: {
        content,
      },
    });

    res.status(200).json({ msg: "Comment updated successfully!" });
  },
];

exports.updateCommentLikes = [
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { postId, commentId } = req.params;
    const { id: userId } = req.user;

    const [post, comment] = await Promise.all([
      prisma.post.findUnique({
        where: {
          id: postId,
        },
      }),

      prisma.comment.findUnique({
        where: {
          id: commentId,
        },
      }),
    ]);

    if (!post) {
      res
        .status(404)
        .json({ error: "Post not found! it may have been moved, deleted or it might have never existed." });
      return;
    }

    if (!comment) {
      res.status(404).json({
        error: "Comment not found! it may have been moved, deleted or it might have never existed.",
      });
      return;
    }

    const existingLike = await prisma.likeComments.findUnique({
      where: {
        userId_commentId: {
          commentId,
          userId,
        },
      },
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.likeComments.delete({
          where: {
            userId_commentId: {
              commentId,
              userId,
            },
          },
        }),
        prisma.comment.update({
          where: {
            id: commentId,
          },
          data: {
            likes: {
              decrement: 1,
            },
          },
        }),
      ]);

      res.sendStatus(204);

      return;
    }

    await prisma.$transaction([
      prisma.likeComments.create({
        data: {
          commentId,
          userId,
        },
      }),
      prisma.comment.update({
        where: {
          id: commentId,
        },
        data: {
          likes: {
            increment: 1,
          },
        },
      }),
    ]);

    res.sendStatus(204);
  },
];

exports.deleteComment = [
  passport.authenticate("jwt", { session: false }),

  async (req, res) => {
    const { postId, commentId } = req.params;

    const [post, comment] = await Promise.all([
      prisma.post.findUnique({
        where: {
          id: postId,
        },
      }),

      prisma.comment.findUnique({
        where: {
          id: commentId,
        },
      }),
    ]);

    if (!post) {
      res
        .status(404)
        .json({ error: "Post not found! it may have been moved, deleted or it might have never existed." });
      return;
    }

    if (!comment) {
      res.status(404).json({
        error: "Comment not found! it may have been moved, deleted or it might have never existed.",
      });
      return;
    }

    await prisma.comment.delete({
      where: {
        id: commentId,
      },
    });

    res.sendStatus(204);
  },
];
