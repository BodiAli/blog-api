require("dotenv").config();
const express = require("express");

require("./config/passportConfig");

const app = express();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App is running on port: ${port}!`);
});
