const passport = require("passport");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const prismaClient = require("../prisma/prismaClient");
const issueJwt = require("../lib/issueJWT");

exports.createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prismaClient.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
    },
  });

  const token = issueJwt(user);

  res.status(201).json({ token: `Bearer ${token}` });
});

exports.authenticateUser = [
  asyncHandler(async (req, res, next) => {
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
