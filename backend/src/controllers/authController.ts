import { Request, Response } from "express";
import User from "../models/User";
import { registerUser, loginUser } from "../services/authService";
import { domainCanReceiveEmail } from "../services/emailValidation";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

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

    // Required fields
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

    // Normalize input
    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.trim().toLowerCase();

    // First name validation
    if (typeof firstName !== "string" ||
        firstName.length < 2 ||
        firstName.length > 50) {
      res.status(400).json({
        message: "First name must contain between 2 and 50 characters",
      });
      return;
    }

    // Last name validation
    if (typeof lastName !== "string" ||
        lastName.length < 2 ||
        lastName.length > 50) {
      res.status(400).json({
        message: "Last name must contain between 2 and 50 characters",
      });
      return;
    }

    // Email validation
    if (typeof email !== "string" || !emailRegex.test(email)) {
      res.status(400).json({
        message: "Please provide a valid email address",
      });
      return;
    }
    if (!(await domainCanReceiveEmail(email))) {
      res.status(400).json({ message: "Email domain cannot receive email" });
      return;
    }

    // Password validation
    if (
      typeof password !== "string" ||
      !passwordRegex.test(password)
    ) {
      res.status(400).json({
        message:
          "Password must contain 8-72 characters, including one uppercase letter, one lowercase letter, one number, and one special character",
      });
      return;
    }

    const user = await registerUser(
      firstName,
      lastName,
      email,
      password
    );
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

    if (
      error instanceof Error &&
      error.message === "A user with this email already exists"
    ) {
      res.status(409).json({
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Login
export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let { email, password } = req.body;

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

    email = email.trim().toLowerCase();

    const { user, token } = await loginUser(email, password);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      res.status(401).json({
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      message: "Server error",
    });
  }
};


export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const user = await User.findById(req.user.id).select(
      "-password"
    );

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      user: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};
