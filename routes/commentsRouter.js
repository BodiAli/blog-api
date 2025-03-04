const { Router } = require("express");
const commentsController = require("../controllers/commentsController");

const commentsRouter = Router({ mergeParams: true });

commentsRouter.get("/", commentsController.getComments);
commentsRouter.post("/", commentsController.createComment);

commentsRouter.route("/:commentId").put(commentsController.updateComment);

module.exports = commentsRouter;
