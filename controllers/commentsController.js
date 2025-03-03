const asyncHandler = require("express-async-handler");

exports.getComments = asyncHandler(async (req, res) => {
  console.log(req.params);
  res.json("hii");
});
