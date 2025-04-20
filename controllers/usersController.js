const passport = require("passport");
const { query, matchedData } = require("express-validator");
const prisma = require("../prisma/prismaClient");

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

exports.getUserPosts = [
  passport.authenticate("jwt", { session: false }),
  validatePageQuery,
  async (req, res) => {
    const userId = req.user.id;

    const { page: sanitizedPage } = matchedData(req, { locations: ["query"] });

    const page = Number.parseInt(sanitizedPage, 10);

    const limit = 7;

    const offset = (page - 1) * limit;

    const postsCount = await prisma.post.count({
      where: {
        userId,
      },
    });

    const pages = Math.ceil(postsCount / limit) || 1;

    const posts = await prisma.post.findMany({
      where: {
        userId,
      },
      include: {
        Topics: true,
      },
      omit: {
        cloudId: true,
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "asc",
      },
    });
    res.status(200).json({ posts, pages });
  },
];
