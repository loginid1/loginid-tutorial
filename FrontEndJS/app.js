require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const indexRouter = require("./routes/");
const userRouter = require("./routes/user");
const apiRouter = require("./routes/api");

const app = express();

app.set("port", process.env.PORT || 3000);
app.set("env", process.env.NODE_ENV || "development");
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.locals.env = process.env;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser("secret"));
app.use(express.static(path.join(__dirname, "assets")));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: app.get("env") === "production", // If true will enforce HTTPS protocol.
      sameSite: true,
    },
  })
);

app.use("/", indexRouter);
app.use("/", userRouter);
app.use("/api", apiRouter);

app.listen(app.get("port"), () => {
  console.log(`Listening at ${app.get("port")}`);
});
