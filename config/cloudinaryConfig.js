require("dotenv").config();

const { v2: cloudinary } = require("cloudinary");

cloudinary.config({});

module.exports = cloudinary;
