const passport = require("passport");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");

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
];

exports.createUser = [
  validateSignUp,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { firstName, lastName, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
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
          msg: options.message,
        });
        return;
      }
      const token = issueJwt(user);
      res.status(200).json({ token: `Bearer ${token}` });
    })(req, res);
  }),
];
