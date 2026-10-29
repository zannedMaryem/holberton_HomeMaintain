import { Request, Response } from "express";
import { 
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    deleteUserAccount } from "../services/userService";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

export const updateProfile = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {

        if (!req.user){
            res.status(401).json({message: "Authentication required",});
            return;
        }

        let {firstName, lastName}= req.body;

        if (firstName === undefined && lastName === undefined) {
            res.status(400).json({message: "At least one field is required",});
            return;
        }
        

        if (firstName !== undefined){
            if (typeof firstName !== "string") {
                res.status(400).json({message: "First name must be a string",});
                return;
            }

            firstName = firstName.trim();

            if (firstName.length < 2 || firstName.length > 50) {
                res.status(400).json({message: "First name must be between 2 and 50 characters",});
                return;
            }
        }


        if (lastName !== undefined){
            if (typeof lastName !== "string") {
                res.status(400).json({message: "Last name must be a string",});
                return;
            }

            lastName = lastName.trim();

            if (lastName.length < 2 || lastName.length > 50) {
                res.status(400).json({message: "Last name must be between 2 and 50 characters",});
                return;
            }
        }

        const user = await updateUserProfile(req.user.id, firstName, lastName);

        res.status(200).json({
            message: "User profile updated successfully",
            user: {
                id: user._id,
                fullName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                role: user.role,
            },
        });
    }catch(error) {
        console.error("Update profile error:", error);

        if (error instanceof Error && error.message === "User not found") {
            res.status(404).json({message: error.message,});
            return;
        }

        res.status(500).json({message: "Server error",});
        return;
    }
}

export const updateEmail = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user){
            res.status(401).json({message: "Authentication required",});
            return;
        }

        let {email} = req.body ?? {};

        if (email === undefined){
            res.status(400).json({message: "New email adress is required"});
            return;
        }

        if (typeof email !== "string") {
            res.status(400).json({message: "Please provide a valid email address",});
            return;
        }

        // Normalize before checking or saving so casing/extra spaces don't create duplicates.
        email = email.trim().toLowerCase();

        if (!emailRegex.test(email)) {
            res.status(400).json({message: "Please provide a valid email address",});
            return;
        }

        const user = await updateUserEmail(req.user.id, email);

        res.status(200).json({
            message: "Email updated successfully",
            user: {
                id: user._id,
                fullname: `${user.firstName} ${user.lastName}`,
                email: user.email,
                role: user.role,
            },
        });

    } catch(error) {
        console.error("Update email error:", error);

        if (error instanceof Error && error.message === "User not found") {
            res.status(404).json({message: error.message,});
            return;
        }

        // These are expected user-input conflicts, not unexpected server failures.
        if (
            error instanceof Error &&
            (error.message === "Email is unchanged" ||
                error.message === "Email already used")
        ) {
            res.status(409).json({message: error.message,});
            return;
        }

        res.status(500).json({message: "Server error",});
        return;
    }
}

export const updatePassword = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user){
            res.status(401).json({message: "Authentication required",});
            return;
        }

        const {currentPassword, newPassword} = req.body ?? {};

        // Check the current password before calling bcrypt; missing input isn't a mismatch.
        if (typeof currentPassword !== "string" || currentPassword.length === 0) {
            res.status(400).json({message: "Current password is required",});
            return;
        }

        if (newPassword === undefined) {
            res.status(400).json({message: "New password is required",});
            return;
        }

        // `typeof value !== "string"` is the type check; comparing it to "string" checks its value.
        // The regex also enforces length (8-72) and the required character groups.
        if (typeof newPassword !== "string" || !passwordRegex.test(newPassword)){
            res.status(400).json({message: "Your password must contain 8-72 characters and include one uppercase letter, one lowercase letter, one number, and one special character",});
            return;
        }

        const user = await updateUserPassword(req.user.id, currentPassword, newPassword);
        res.status(200).json({
            message: "Password updated successfully",
            user: {
                id: user._id,
                fullname: `${user.firstName} ${user.lastName}`,
                email: user.email,
                role: user.role,
            },
        });

    }catch(error) {
        console.error("Update password error:", error);

        if (error instanceof Error && error.message === "User not found") {
            res.status(404).json({message: error.message,});
            return;
        }

        // A bad current password is an authentication failure; don't report it as a 500.
        if (error instanceof Error && error.message === "Current password is incorrect") {
            res.status(401).json({message: error.message,});
            return;
        }

        res.status(500).json({message: "Server error",});
        return;
    }
}

export const deleteAccount = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user){
            res.status(401).json({message: "Authentication required",});
            return;
        }
        deleteUserAccount(req.user.id);
        res.status(200).json({message: "Account deleted successfully",});
    }catch(error) {
        console.error("Delete account error:", error);

        if (error instanceof Error && error.message === "User not found") {
            res.status(404).json({message: error.message,});
            return;
        }

        res.status(500).json({message: "Server error",});
        return;
    }
}
