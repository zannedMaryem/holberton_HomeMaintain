import bcrypt from "bcryptjs";
import User, { type IUser } from "../models/User";

type AdminUserUpdates = Partial<
  Pick<IUser, "firstName" | "lastName" | "email" | "role">
>;

const getAllUsers = async () => {
  return User.find().sort({ createdAt: -1 });
};

const getUserById = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const updateUserByAdmin = async (userId: string, updates: AdminUserUpdates) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (updates.email !== undefined) {
    const normalizedEmail = updates.email.trim().toLowerCase();

    if (normalizedEmail === user.email.toLowerCase()) {
      throw new Error("Email is unchanged");
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: userId },
    });

    if (existingUser) {
      throw new Error("Email already used");
    }

    user.email = normalizedEmail;
  }

  if (updates.firstName !== undefined) {
    user.firstName = updates.firstName;
  }

  if (updates.lastName !== undefined) {
    user.lastName = updates.lastName;
  }

  if (updates.role !== undefined) {
    user.role = updates.role;
  }

  await user.save();

  return user;
};

const deleteUserByAdmin = async (userId: string) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new Error("User not found");
  }
};
export {
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
};
