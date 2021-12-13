const { LoginId } = require("@loginid/node-sdk");

const webId = process.env.WEB_CLIENT_ID;
const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const baseUrl = process.env.BASE_URL;

const loginId = new LoginId(webId, privateKey, baseUrl);

const validateSession = async (req, res, next) => {
  if (req.session.user) {
    return next();
  }

  const { jwt, user } = req.body;

  if (!jwt) {
    return res.redirect("/");
  }

  try {
    const username = user?.username;
    const isValid = await loginId.verifyToken(jwt, username);

    if (!isValid) {
      throw new Error("Authorization failed");
    }

    //during registration route you can create a user in a database
    //during an authentication route you can retrieve a user from a database
    //demo will use a simple session instead
    req.session.user = req.body.user;

    return next();
  } catch (e) {
    console.error(e);
    return res.status(401).render("error", { message: e.message });
  }
};

module.exports = { validateSession };
