const bcrypt = require("bcrypt");
const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const prismaClient = require("../prisma/prismaClient");

passport.use(
  new LocalStrategy({ usernameField: "email", session: false }, async (email, password, done) => {
    try {
      const user = await prismaClient.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        done(null, false, { message: "Incorrect email or password" });
        return;
      }

      const matchPassword = await bcrypt.compare(password, user.password);

      if (!matchPassword) {
        done(null, false, { message: "Incorrect email or password" });
        return;
      }

      done(null, user);
    } catch (error) {
      done(error);
    }
  })
);

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SECRET_KEY,
    },
    async (payload, done) => {
      try {
        const user = await prismaClient.user.findUnique({
          where: {
            id: payload.sub,
          },
        });

        if (!user) {
          done(null, false);
          return;
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);
