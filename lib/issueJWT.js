const jwt = require("jsonwebtoken");

function issueJwt(user) {
  const { id } = user;
  const expiresIn = "2w";

  const payload = {
    sub: id,
  };

  const signedToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn });
  return signedToken;
}

module.exports = issueJwt;
