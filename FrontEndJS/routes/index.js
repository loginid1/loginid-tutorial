const express = require("express");
const { validateSession } = require("../middleware/user");

const router = express.Router();

router.get("/", (_, res) => {
  return res.render("auth");
});

router.get("/codes", (_, res) => {
  return res.render("codes");
});

router.get("/dashboard", validateSession, (req, res) => {
  return res.render("dashboard", { user: req.session.user });
});

module.exports = router;
