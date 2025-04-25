const { Router } = require("express");
const postsController = require("../controllers/postsController");

const postsRouter = Router();

postsRouter.get("/", postsController.getPosts);
postsRouter.post("/", postsController.createPost);

postsRouter.patch("/:postId/like", postsController.updatePostLikes);
postsRouter.patch("/:postId/publish", postsController.updatePostPublish);

postsRouter
  .route("/:postId")
  .get(postsController.getPost)
  .put(postsController.updatePost)
  .delete(postsController.deletePost);

module.exports = postsRouter;
