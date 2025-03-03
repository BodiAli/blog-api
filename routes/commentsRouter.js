const { Router } = require("express");
const commentsController = require("../controllers/commentsController");

const commentsRouter = Router({ mergeParams: true });

commentsRouter.get("/", commentsController.getComments);

module.exports = commentsRouter;
