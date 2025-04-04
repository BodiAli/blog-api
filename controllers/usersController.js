const passport = require("passport");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const { body, query, validationResult } = require("express-validator");
const multer = require("multer");
const fs = require("node:fs/promises");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");
const cloudinary = require("../config/cloudinaryConfig");

const upload = multer({ dest: "uploads/" });

const emptyErr = "can not be empty.";
const maxLengthErr = "can not exceed 255 characters.";
const minLengthErr = "must be at least 5 characters.";

const validateSignUp = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage(`First Name ${emptyErr}`)
    .isLength({ max: 255 })
    .withMessage(`First Name ${maxLengthErr}`),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage(`Last Name ${emptyErr}`)
    .isLength({ max: 255 })
    .withMessage(`Last Name ${maxLengthErr}`),
  body("email")
    .trim()
    .notEmpty()
    .withMessage(`Email ${emptyErr}`)
    .isLength({ max: 255 })
    .withMessage(`Email ${maxLengthErr}`)
    .isEmail()
    .withMessage("Email must be a valid email.")
    .custom(async (email) => {
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (user) {
        throw new Error("A user with this email already exists.");
      }
      return true;
    }),
  body("password")
    .trim()
    .notEmpty()
    .withMessage(`Password ${emptyErr}`)
    .isLength({ min: 5 })
    .withMessage(`Password ${minLengthErr}`),
  body("confirmPassword")
    .optional({ values: "falsy" })
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password and password confirmation do not match.");
      }
      return true;
    }),
  body("userImage")
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
];

exports.createUser = [
  upload.single("userImage"),
  validateSignUp,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    let cloudId = null;
    let profileImgUrl = null;

    if (req.file) {
      const { secure_url: url, public_id: id } = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        format: "png",
      });

      cloudId = id;
      profileImgUrl = url;
      await fs.rm(req.file.path);
    }

    const { firstName, lastName, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        Profile: {
          create: {
            cloudId,
            profileImgUrl,
          },
        },
      },
    });

    const token = issueJwt(user);

    res.status(201).json({ token: `Bearer ${token}` });
  }),
];

const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage(`Email ${emptyErr}`)
    .isLength({ max: 255 })
    .withMessage(`Email ${maxLengthErr}`)
    .isEmail()
    .withMessage("Email must be a valid email."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage(`Password ${emptyErr}`)
    .isLength({ min: 5 })
    .withMessage(`Password ${minLengthErr}`),
];

exports.authenticateUser = [
  validateLogin,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    passport.authenticate("local", { session: false }, (err, user, options) => {
      if (err) {
        next(err);
        return;
      }

      if (!user) {
        res.status(401).json({
          error: options.message,
        });
        return;
      }
      const token = issueJwt(user);
      res.status(200).json({ token: `Bearer ${token}` });
    })(req, res);
  }),
];

const validatePageQuery = [
  query("page").customSanitizer(async (value, { req }) => {
    const userId = req.user.id;

    if (value <= 0 || Number.isNaN(Number.parseInt(value, 10))) {
      return 1;
    }

    const totalPosts = await prisma.post.count({
      where: {
        userId,
      },
    });

    const limit = 7;

    const totalPages = Math.ceil(totalPosts / limit);

    if (value > totalPages) {
      return totalPages;
    }

    return value;
  }),
];

exports.getUser = [
  passport.authenticate("jwt", { session: false }),
  validatePageQuery,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const page = Number.parseInt(req.query.page, 10) || 1;

    const limit = 7;

    const offset = (page - 1) * limit;

    const postsCount = await prisma.post.count();

    const pages = Math.ceil(postsCount / limit);

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      include: {
        Posts: {
          take: limit,
          skip: offset,
          orderBy: {
            createdAt: "asc",
          },
        },
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

    res.status(200).json({ user, pages });
  }),
];
