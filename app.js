require("dotenv").config();
const express = require("express");
const cors = require("cors");
const postsRouter = require("./routes/postsRouter");
const usersRouter = require("./routes/usersRouter");
const commentsRouter = require("./routes/commentsRouter");

require("./config/passportConfig");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", usersRouter);
app.use("/posts", postsRouter);
app.use("/posts/:postId/comments", commentsRouter);

app.use((req, res) => {
  res.status(400).json({ error: "Resource not found" });
});

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).json({ error });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App is running on port: ${port}!`);
});
