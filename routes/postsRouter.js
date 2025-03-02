const { Router } = require("express");
const postsController = require("../controllers/postsController");

const postsRouter = Router();

postsRouter.get("/", postsController.getPosts);
postsRouter.get("/:postId", postsController.getPost);

postsRouter.post("/", postsController.createPost);

module.exports = postsRouter;
