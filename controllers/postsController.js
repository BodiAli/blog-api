const passport = require("passport");
const asyncHandler = require("express-async-handler");
const prisma = require("../prisma/prismaClient");

exports.getPosts = asyncHandler(async (req, res) => {
  const posts = await prisma.post.findMany({
    include: {
      User: true,
    },
  });

  res.status(200).json(posts);
});
