const { Router } = require("express");
const authController = require("../controllers/authController");

const authRouter = Router();

authRouter.post("/sign-up", authController.createUser);
authRouter.post("/log-in", authController.authenticateUser);

authRouter.get("/validate", authController.validateToken);

module.exports = authRouter;
