const { Router } = require("express");
const usersController = require("../controllers/usersController");

const usersRouter = Router();

usersRouter.get("/posts", usersController.getUserPosts);

module.exports = usersRouter;
