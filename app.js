require("dotenv").config();
const express = require("express");
const postsRouter = require("./routes/postsRouter");
const usersRouter = require("./routes/usersRouter");

require("./config/passportConfig");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/users", usersRouter);
app.use("/posts", postsRouter);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ err });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App is running on port: ${port}!`);
});
