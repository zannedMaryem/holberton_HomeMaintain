import { Request, Response } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
} from "../services/adminService";

import { domainCanReceiveEmail } from "../services/emailValidation";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validRoles = ["homeowner", "technician", "equipment_owner", "admin"];

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();

    res.status(200).json({
      message: "List of all users: ",
      users: users.map((user) => ({
        id: user._id,
        fullname: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      })),
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getUser = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const user = await getUserById(req.params.id);

    res.status(200).json({
      user: {
        id: user._id,
        fullname: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error("Get user error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateUser = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { firstName, lastName, email, role } = req.body;

    // Check that at least one field was provided
    if (
      firstName === undefined &&
      lastName === undefined &&
      email === undefined &&
      role === undefined
    ) {
      res.status(400).json({
        message: "At least one field is required",
      });
      return;
    }

    // Validate first name
    if (firstName !== undefined) {
      if (typeof firstName !== "string") {
        res.status(400).json({
          message: "First name must be a string",
        });
        return;
      }

      const trimmedFirstName = firstName.trim();

      if (trimmedFirstName.length < 2 || trimmedFirstName.length > 50) {
        res.status(400).json({
          message: "First name must contain between 2 and 50 characters",
        });
        return;
      }
    }

    // Validate last name
    if (lastName !== undefined) {
      if (typeof lastName !== "string") {
        res.status(400).json({
          message: "Last name must be a string",
        });
        return;
      }

      const trimmedLastName = lastName.trim();

      if (trimmedLastName.length < 2 || trimmedLastName.length > 50) {
        res.status(400).json({
          message: "Last name must contain between 2 and 50 characters",
        });
        return;
      }
    }

    // Validate email
    if (email !== undefined) {
      if (typeof email !== "string") {
        res
          .status(400)
          .json({ message: "Please provide a valid email address" });
        return;
      }

      // Normalize before checking or saving so casing/extra spaces don't create duplicates.
      const trimmedEmail = email.trim().toLowerCase();

      if (!emailRegex.test(trimmedEmail)) {
        res
          .status(400)
          .json({ message: "Please provide a valid email address" });
        return;
      }

      if (!(await domainCanReceiveEmail(trimmedEmail))) {
        res.status(400).json({ message: "Email domain cannot receive email" });
        return;
      }
    }

    // Validate role
    if (role !== undefined) {
      if (typeof role !== "string" || !validRoles.includes(role)) {
        res.status(400).json({
          message: "Invalid user role",
        });
        return;
      }
    }

    /*
     * Build the object that will actually be sent
     * to the service.
     *
     * We normalize the values here:
     * - remove spaces around names
     * - convert email to lowercase
     */
    const updates = {
      firstName: firstName !== undefined ? firstName.trim() : undefined,

      lastName: lastName !== undefined ? lastName.trim() : undefined,

      email: email !== undefined ? email.trim().toLowerCase() : undefined,

      role,
    };

    // Send the validated/normalized data to the service
    const user = await updateUserByAdmin(req.params.id, updates);

    res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user._id,
        fullname: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    if (error instanceof Error && error.message === "Email is unchanged") {
      res.status(409).json({
        message: error.message,
      });
      return;
    }

    if (error instanceof Error && error.message === "Email already used") {
      res.status(409).json({
        message: "A user with this email already exists",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "Please provide a valid email address"
    ) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        message: "A user with this email already exists",
      });
      return;
    }

    console.error("Update user error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteUser = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    /*
     * Prevent an administrator from deleting
     * their own account through the admin route.
     */
    if (req.user?.id === req.params.id) {
      res.status(400).json({
        message: "You cannot delete your own admin account",
      });
      return;
    }

    await deleteUserByAdmin(req.params.id);

    res.status(204).json({ message: "User deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error("Delete user error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};
//TODO: Test admin routes
// ! No error message shown when passing regular token in admin access
// ! For security purposes should the error meaasge not be : A user with this email already exists
