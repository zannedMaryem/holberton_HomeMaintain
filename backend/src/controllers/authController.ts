import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

/*Password requirments
(?=.*[a-z])        → at least one lowercase
(?=.*[A-Z])        → at least one uppercase
(?=.*\d)           → at least one number
(?=.*[^A-Za-z\d])  → at least one special character
.{8,}              → minimum 8 characters
*/

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let { firstName, lastName, email, password } = req.body;

    // Check required fields
    if (!firstName) {
      res.status(400).json({
        message: "First name is required",
      });
      return;
    }

    if (!lastName) {
      res.status(400).json({
        message: "Last name is required",
      });
      return;
    }

    if (!email) {
      res.status(400).json({
        message: "Email is required",
      });
      return;
    }

    if (!password) {
      res.status(400).json({
        message: "Password is required",
      });
      return;
    }

    // Remove unnecessary spaces
    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.trim().toLowerCase();

    // Validate first name length
    if (firstName.length < 2 || firstName.length > 50) {
      res.status(400).json({
        message: "First name must contain between 2 and 50 characters",
      });
      return;
    }

    // Validate last name length
    if (lastName.length < 2 || lastName.length > 50) {
      res.status(400).json({
        message: "Last name must contain between 2 and 50 characters",
      });
      return;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      res.status(400).json({
        message: "Please provide a valid email address",
      });
      return;
    }
    
    // Check whether email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({
        message: "A user with this email already exists",
      });
      return;
    }

    // Validate password complexity
    if (!passwordRegex.test(password)) {
      res.status(400).json({
        message:
          "Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character",
      });
      return;
    }
    if ( password.length > 72) {
      res.status(400).json({
        message:
          "Password too long, must be under 72 characters",
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "homeowner",
    });

    // Send response without password
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};
