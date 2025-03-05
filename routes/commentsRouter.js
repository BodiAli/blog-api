const { Router } = require("express");
const commentsController = require("../controllers/commentsController");

const commentsRouter = Router({ mergeParams: true });

commentsRouter.get("/", commentsController.getPostComments);
commentsRouter.post("/", commentsController.createComment);

commentsRouter.patch("/:commentId/like", commentsController.updateCommentLikes);

commentsRouter
  .route("/:commentId")
  .put(commentsController.updateComment)
  .delete(commentsController.deleteComment);

module.exports = commentsRouter;
