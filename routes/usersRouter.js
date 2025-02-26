const { Router } = require("express");
const usersController = require("../controllers/usersController");

const usersRouter = Router();

usersRouter.post("/sign-up", usersController.createUser);
usersRouter.post("/log-in", usersController.authenticateUser);

module.exports = usersRouter;
