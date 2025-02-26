const asyncHandler = require("express-async-handler");
const prismaClient = require("../prisma/prismaClient");

exports.getPosts = asyncHandler(async (req, res) => {
  const posts = await prismaClient.post.findMany({
    include: {
      User: true,
    },
  });

  res.status(200).json(posts);
});
