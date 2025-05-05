require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/authRouter");
const usersRouter = require("./routes/usersRouter");
const postsRouter = require("./routes/postsRouter");
const commentsRouter = require("./routes/commentsRouter");

require("./config/passportConfig");

const app = express();

app.use(
  cors({
    origin: [process.env.CLIENT_PUBLIC_URL, process.env.CLIENT_CMS_URL]
  })
);
app.use(express.json());

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/posts", postsRouter);
app.use("/posts/:postId/comments", commentsRouter);

app.use((req, res) => {
  res.status(400).json({ error: "Resource not found" });
});

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message ? error.message : error });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App is running on port: ${port}!`);
});
