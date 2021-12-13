const express = require("express");
const { validateSession } = require("../middleware/user");

const router = express.Router();

router.post("/register", validateSession, (_, res) => {
  return res.status(204).send("OK");
});

router.post("/login", validateSession, (_, res) => {
  return res.status(204).send("OK");
});

router.post("/logout", (req, res) => {
  req.session.destroy();
  return res.redirect("/");
});

module.exports = router;
