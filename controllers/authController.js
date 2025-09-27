import User from "../models/userModel.js"; // Importing the User model
import bcrypt from "bcrypt";               // For hashing Google sub

// Controller class for handling Google Sign In
export class googleSignInController {
 
    // Method to handle successful Google sign-in
    signInSuccess = async (req, res) => {
        try {
            // Extracting user data from the request object
            const userData = req.user._json;
            const { email, name, sub } = userData;

            if (email) {
                // Attempting to find existing user in the database
                let user = await User.findOne({ email: email });
                
                if (!user) {
                    // If user does not exist, create a new user in the database
                    const hashedPassword = await bcrypt.hash(sub, 10); // hash Google sub
                    user = new User({ username: name, email: email, password: hashedPassword });
                    await user.save(); // Save the new user
                }

                // Set user's email in session and render homepage
                req.session.userEmail = email;
                return res.status(200).render("homepage", { email });
            } else {
                // If email is not present in user data, return Not Authorized error
                return res.status(403).json({ error: true, message: "Not Authorized" });
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            res.status(500).json({ error: true, message: "Internal Server Error" });
        }
    }

    // Method to handle failed Google sign-in attempts
    signInFailed = (req, res) => {
        res.status(401).json({
            error: true,
            message: "Log in failure",
        });
    }
}
