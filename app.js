import express from "express";
import bodyParser from "body-parser";
import ejsLayouts from "express-ejs-layouts";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";

import { connectUsingMongoose } from "./config/mongodb.js";
import router from "./routes/routes.js";
import authrouter from "./routes/authRoutes.js";
import passport from "./config/passport.js"; // 👈 import passport từ config

dotenv.config();
const app = express();

// SESSION
app.use(
  session({
    secret: "SecretKey",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // đổi thành true khi chạy HTTPS
  })
);

// MIDDLEWARE
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Set Templates
app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));
app.use(ejsLayouts);
app.set("layout", "layout");

// DB Connection
connectUsingMongoose();

// ROUTES
app.get("/", (req, res) => {
  res.send("Hey Ninja ! Go to /user/signin for the login page.");
});
app.use("/user", router);
app.use("/auth", authrouter);
app.use(express.static("public"));

// LISTEN
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT}`);
});
