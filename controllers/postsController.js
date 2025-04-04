const passport = require("passport");
const asyncHandler = require("express-async-handler");
const { body, validationResult, query } = require("express-validator");
const multer = require("multer");
const fs = require("node:fs/promises");
const prisma = require("../prisma/prismaClient");
const cloudinary = require("../config/cloudinaryConfig");

const upload = multer({ dest: "uploads/" });

const validatePageQuery = [
  query("page").customSanitizer(async (value) => {
    if (value <= 0 || Number.isNaN(Number.parseInt(value, 10))) {
      return 1;
    }

    const totalPosts = await prisma.post.count();

    const limit = 7;

    const totalPages = Math.ceil(totalPosts / limit);

    if (value > totalPages) {
      return totalPages;
    }

    return value;
  }),
];

exports.getPosts = [
  validatePageQuery,
  asyncHandler(async (req, res) => {
    const page = Number.parseInt(req.query.page, 10) || 1;

    const limit = 7;

    const offset = (page - 1) * limit;

    const postsCount = await prisma.post.count();

    const pages = Math.ceil(postsCount / limit);

    const posts = await prisma.post.findMany({
      include: {
        User: {
          omit: {
            email: true,
            password: true,
          },
          include: {
            Profile: {
              select: {
                profileImgUrl: true,
              },
            },
          },
        },
        TopicPosts: {
          select: {
            Topic: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        likes: "desc",
      },
      take: limit,
      skip: offset,
    });

    res.status(200).json({ posts, pages });
  }),
];

exports.getPost = asyncHandler(async (req, res) => {
  const { postId: id } = req.params;
  const post = await prisma.post.findUnique({
    where: {
      id,
    },
    include: {
      User: {
        omit: {
          email: true,
          password: true,
        },
        include: {
          Profile: {
            select: {
              profileImgUrl: true,
            },
          },
        },
      },
      Comments: {
        take: 10,
        orderBy: {
          likes: "desc",
        },
      },
      TopicPosts: {
        select: {
          Topic: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!post) {
    res
      .status(404)
      .json({ error: "Post not found! it may have been moved, deleted or it might have never existed." });
    return;
  }

  res.status(200).json(post);
});

const emptyErr = "can not be empty.";
const maxLengthErr = "can not exceed 255 characters.";
const minLengthErr = "must be at least 5 characters.";

const validatePost = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage(`Title ${emptyErr}`)
    .isLength({ max: 255 })
    .withMessage(`Title ${maxLengthErr}`),
  body("content")
    .trim()
    .notEmpty()
    .withMessage(`Content ${emptyErr}`)
    .isLength({ min: 5 })
    .withMessage(`Content ${minLengthErr}`),
  body("topics")
    .optional({ values: "falsy" })
    .custom((topics) => {
      if (!Array.isArray(topics)) {
        throw new Error("Topics must be an array.");
      }
      if (topics.every((topic) => typeof topic !== "string")) {
        throw new Error("Topics must be of type string.");
      }
      if (topics.some((topic) => topic.trim().length === 0)) {
        throw new Error("Topics cannot contain empty values.");
      }
      if (topics.some((topic) => topic.trim().length > 100)) {
        throw new Error("Topics cannot exceed 100 characters.");
      }

      return true;
    }),
  body("postImage")
    .optional({ values: "falsy" })
    .custom(async (value, { req }) => {
      if (req.file.size > 3145728) {
        await fs.rm(req.file.path);
        throw new Error("File cannot be larger than 3MB.");
      } else if (!req.file.mimeType.startsWith("image/")) {
        await fs.rm(req.file.path);
        throw new Error("File uploaded is not of type image.");
      } else if (req.file.size === 0) {
        await fs.rm(req.file.path);
        throw new Error("File cannot be empty.");
      }

      return true;
    }),
  body("published").optional({ values: "falsy" }),
];

exports.createPost = [
  passport.authenticate("jwt", { session: false }),
  upload.single("postImage"),
  validatePost,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    let cloudId = null;
    let imgUrl = null;

    if (req.file) {
      const { secure_url: url, public_id: id } = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        format: "jpg",
      });

      cloudId = id;
      imgUrl = url;
      await fs.rm(req.file.path);
    }

    const { title, content, published, topics } = req.body;

    let foundOrCreatedTopics = [];

    if (topics) {
      // topic.map(async) returns an array of promises which Promise.all awaits on then returns an array of the values
      // from the upsert method which is an object containing the created or found topics.
      foundOrCreatedTopics = await Promise.all(
        topics.map(async (topicName) =>
          prisma.topic.upsert({
            where: { name: topicName },
            update: {},
            create: { name: topicName },
          })
        )
      );
    }

    await prisma.post.create({
      data: {
        title,
        content,
        published,
        cloudId,
        imgUrl,
        userId: req.user.id,
        TopicPosts: {
          createMany: {
            data: foundOrCreatedTopics.map((topic) => ({ topicName: topic.name })),
          },
        },
      },
    });

    res.status(201).json({ msg: "Post created successfully!" });
  }),
];

exports.updatePost = [
  passport.authenticate("jwt", { session: false }),
  upload.single("postImage"),
  validatePost,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { postId: id } = req.params;

    const post = await prisma.post.findUnique({
      where: {
        id,
      },
    });

    if (!post) {
      res
        .status(404)
        .json({ error: "Post not found! it may have been moved, deleted or it might have never existed." });
      return;
    }

    let cloudId = null;
    let imgUrl = null;

    if (req.file) {
      if (post.imgUrl) {
        const { result } = await cloudinary.uploader.destroy(post.cloudId, { resource_type: "image" });

        if (result !== "ok") {
          throw new Error("Error updating post, please try again later.");
        }
      }

      const { secure_url: url, public_id: publicId } = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        format: "jpg",
      });

      cloudId = publicId;
      imgUrl = url;

      await fs.rm(req.file.path);
    }

    const { title, content, published, topics } = req.body;

    let foundOrCreatedTopics = [];
    if (topics) {
      foundOrCreatedTopics = await Promise.all(
        topics.map(async (topicName) =>
          prisma.topic.upsert({
            where: { name: topicName },
            update: {},
            create: { name: topicName },
          })
        )
      );
    }

    await prisma.$transaction([
      prisma.topicPosts.deleteMany({
        where: {
          postId: id,
        },
      }),

      prisma.post.update({
        where: {
          id,
        },
        data: {
          title,
          content,
          published,
          cloudId,
          imgUrl,
          TopicPosts: {
            createMany: {
              data: foundOrCreatedTopics.map((topic) => ({
                topicName: topic.name,
              })),
            },
          },
        },
      }),

      prisma.topic.deleteMany({
        where: {
          TopicPosts: {
            none: {},
          },
        },
      }),
    ]);

    res.status(200).json({ msg: "Post updated successfully!" });
  }),
];

exports.updatePostLikes = [
  passport.authenticate("jwt", { session: false }),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { id: userId } = req.user;

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

    const existingLike = await prisma.likePosts.findUnique({
      where: {
        userId_postId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.likePosts.delete({
          where: {
            userId_postId: {
              postId,
              userId,
            },
          },
        }),

        prisma.post.update({
          where: {
            id: postId,
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
      prisma.likePosts.create({
        data: {
          postId,
          userId,
        },
      }),

      prisma.post.update({
        where: {
          id: postId,
        },
        data: {
          likes: {
            increment: 1,
          },
        },
      }),
    ]);

    res.sendStatus(204);
  }),
];

exports.deletePost = [
  passport.authenticate("jwt", { session: false }),
  asyncHandler(async (req, res) => {
    const { postId: id } = req.params;

    const post = await prisma.post.findUnique({
      where: {
        id,
      },
    });

    if (!post) {
      res
        .status(404)
        .json({ error: "Post not found! it may have been moved, deleted or it might have never existed." });
      return;
    }

    if (post.imgUrl) {
      const koko = await cloudinary.uploader.destroy(post.cloudId, { resource_type: "image" });
      console.log(koko);

      const { result } = koko;

      if (result !== "ok") {
        throw new Error("Error deleting post, please try again later.");
      }
    }

    await prisma.post.delete({
      where: {
        id,
      },
    });

    res.sendStatus(204);
  }),
];
