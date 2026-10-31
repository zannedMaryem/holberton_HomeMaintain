import bcrypt from "bcryptjs";
import User from "../models/User";


const updateUserProfile = async (
  userId: string,
  firstName?: string,
  lastName?: string,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (firstName !== undefined) {
    user.firstName = firstName;
  }

  if (lastName !== undefined) {
    user.lastName = lastName;
  }

  await user.save();

  return user;
};

const updateUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Keep password verification and hashing in the service, away from HTTP handling.
  const currentPasswordMatch = await user.comparePassword(currentPassword);

  if (!currentPasswordMatch) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  await user.save();

  return user;
};

const updateUserEmail = async (userId: string, newEmail: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.email === newEmail) {
    // Let the controller return a conflict response for an unchanged address.
    throw new Error("Email is unchanged");
  }

  const existingUserEmail = await User.findOne({ email: newEmail });

  if (existingUserEmail) {
    // A unique email belongs to another account, so the update cannot proceed.
    throw new Error("Email already used");
  }

  user.email = newEmail;

  await user.save();

  return user;
};

const deleteUserAccount = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  await User.findByIdAndDelete(userId);
};

export {

  updateUserProfile,
  updateUserPassword,
  updateUserEmail,
  deleteUserAccount,
};
