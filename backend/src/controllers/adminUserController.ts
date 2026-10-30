import { Request, Response } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
} from "../services/userService";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validRoles = ["homeowner", "technician", "equipment_owner", "admin"];

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();

    res.status(200).json({
      users,
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
      user,
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
      if (
        typeof email !== "string" ||
        !emailRegex.test(email.trim().toLowerCase())
      ) {
        res.status(400).json({
          message: "Please provide a valid email address",
        });
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
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({
        message: error.message,
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

    res.status(204).send();
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