import mongoose from "mongoose";  
import User from "../models/userModel.js";  
import bcrypt from "bcrypt";  
import { transporter } from "../config/nodemailerConfig.js";  
import dotenv from "dotenv";  
import fetch from "node-fetch";  

dotenv.config();  

export class UserGetController {
    getSignUpPage = (req, res) => {
        res.render("signup", { message: "", siteKey: process.env.RECAPTCHA_SITE_KEY });
    };

    getSignInPage = (req, res) => {
        res.render("signin", { message: "", siteKey: process.env.RECAPTCHA_SITE_KEY });
    };

    homePage = (req, res) => {
        const email = req.session.userEmail;
        if (!email) {
            return res.status(403).render("signin", { 
                message: "Please sign in to view the homepage", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }
        res.render("homepage", { email });
    };

    getForgotPassword = (req, res) => {
        res.render("forgot-password", { message: "", siteKey: process.env.RECAPTCHA_SITE_KEY });
    };

    getChangePassword = (req, res) => {
        const email = req.session.userEmail;
        if (!email) {
            return res.status(403).render("signin", { 
                message: "Please sign in to change the password", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }
        res.render("change-password", { message: "", siteKey: process.env.RECAPTCHA_SITE_KEY });
    };

    logoutUser = (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Error signing out:", err);
                return res.status(500).send("Error signing out");
            }
            res.redirect("/user/signin");
        });
    };
}

export class UserPostController {
    
    // Sign up
    createUser = async (req, res) => {
        const { username, email, password, cpassword } = req.body;

        if (password !== cpassword) {
            return res.status(400).render("signup", { 
                message: "Passwords don't match", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).render("signup", { 
                message: "User already exists", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ username, email, password: hashedPassword });
            await newUser.save();
            res.status(201).render("signin", { 
                message: "User created successfully", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        } catch (error) {
            console.error(error);
            res.status(500).render("signup", { 
                message: "Server error, please try again", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }
    };

    // Sign in
    signInUser = async (req, res) => {
        const { email, password } = req.body;
        const recaptcha = req.body["g-recaptcha-response"];

        if (!recaptcha) {
            return res.status(400).render("signin", { 
                message: "Please complete captcha", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }

        try {
            // ✅ Verify captcha with Google
            const secretKey = process.env.RECAPTCHA_SECRET_KEY;
            const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptcha}`;
            const googleResponse = await fetch(url, { method: "POST" });
            const recaptchaValidation = await googleResponse.json();

            if (!recaptchaValidation.success) {
                return res.status(400).render("signin", { 
                    message: "Captcha verification failed", 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            }

            const existingUser = await User.findOne({ email });
            if (!existingUser) {
                return res.status(404).render("signin", { 
                    message: "User doesn't exist", 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            }

            const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
            if (!isPasswordCorrect) {
                return res.status(400).render("signin", { 
                    message: "Invalid credentials || Incorrect Password", 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            }

            req.session.userEmail = email;
            res.redirect("/user/homepage");

        } catch (error) {
            console.error(error);
            res.status(500).render("signin", { 
                message: "Server error, please try again", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }
    };

    // Forgot password
    forgotPassword = async (req, res) => {
        const { email } = req.body;

        try {
            const existingUser = await User.findOne({ email });
            if (!existingUser) {
                return res.status(404).render("forgot-password", { 
                    message: "User doesn't exist", 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            }

            const newPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL,
                    to: email,
                    subject: "Password Reset",
                    text: `Your new password is: ${newPassword}`
                });
            } catch (error) {
                console.error(error);
                return res.status(500).render("forgot-password", { 
                    message: "Failed to send email: " + error, 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            }

            existingUser.password = hashedPassword;
            await existingUser.save();
            
            res.status(200).render("signin", { 
                message: "New Password sent to your email", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });

        } catch (error) {
            console.error(error);
            res.status(500).render("forgot-password", { 
                message: "Server error, please try again", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }
    };

    // Change password
    changePassword = async (req, res) => {
        const { oldPassword, newPassword } = req.body;

        try {
            const email = req.session.userEmail;
            const existingUser = await User.findOne({ email });
            if (!existingUser) {
                return res.status(404).render("change-password", { 
                    message: "User doesn't exist", 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            }

            const isPasswordCorrect = await bcrypt.compare(oldPassword, existingUser.password);
            if (!isPasswordCorrect) {
                return res.status(400).render("change-password", { 
                    message: "Old password is incorrect", 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            existingUser.password = hashedPassword;
            await existingUser.save();

            req.session.destroy(() => {
                res.status(200).render("signin", { 
                    message: "Password changed successfully, please login again", 
                    siteKey: process.env.RECAPTCHA_SITE_KEY 
                });
            });

        } catch (error) {
            console.error(error);
            res.status(500).render("change-password", { 
                message: "Server error, please try again", 
                siteKey: process.env.RECAPTCHA_SITE_KEY 
            });
        }
    };
}
