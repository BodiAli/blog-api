const passport = require("passport");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const fs = require("node:fs/promises");
const prisma = require("../prisma/prismaClient");
const cloudinary = require("../config/cloudinaryConfig");

async function test() {
  // const posts = await prisma.post.findMany();
  // console.log(posts);
}

test();

const upload = multer({ dest: "uploads/" });

exports.getPosts = asyncHandler(async (req, res) => {
  const posts = await prisma.post.findMany({
    include: {
      User: true,
    },
  });

  res.status(200).json(posts);
});

exports.getPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await prisma.post.findUnique({
    where: {
      id,
    },
  });

  if (!post) {
    res
      .status(404)
      .json({ msg: "Post not found! it may have been moved, deleted or it might have never existed." });
  }

  res.status(200).json(post);
});

const emptyErr = "can not be empty.";
const maxLengthErr = "can not exceed 255 characters.";
const minLengthErr = "must be at least 5 characters.";

const validatePostCreation = [
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
  body("postImage")
    .optional({ values: "falsy" })
    .custom(async (value, { req }) => {
      if (req.file.size > 3145728) {
        await fs.rm(req.file.path);
        throw new Error("File cannot be larger than 3MB.");
      } else if (!req.file.mimeType.startsWith("image/")) {
        await fs.rm(req.file.path);
        throw new Error("File uploaded is not of type image.");
      }

      return true;
    }),
  body("published").optional({ values: "falsy" }),
];

exports.createPost = [
  passport.authenticate("jwt", { session: false }),
  upload.single("postImage"),
  validatePostCreation,
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

    const { title, content, published } = req.body;
    await prisma.post.create({
      data: {
        title,
        content,
        published,
        cloudId,
        imgUrl,
        userId: req.user.id,
      },
    });

    res.status(201).json({ msg: "Post created successfully!" });
  }),
];
