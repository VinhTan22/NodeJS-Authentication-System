import passport from "passport";
import express from "express";
import { googleSignInController } from "../controllers/authController.js";
import dotenv from "dotenv";

dotenv.config();

const authRouter = express.Router();
const googleSignIn = new googleSignInController();

// Login Google
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

// Callback từ Google
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/auth/login/success", 
    failureRedirect: "/auth/login/failed",  
  })
);

// Login thành công
authRouter.get("/login/success", googleSignIn.signInSuccess);

// Login thất bại
authRouter.get("/login/failed", googleSignIn.signInFailed);

export default authRouter;
