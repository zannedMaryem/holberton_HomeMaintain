import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

const registerUser = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<IUser> => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: "homeowner",
  });

  return user;
};

const loginUser = async (
  email: string,
  password: string
): Promise<{ user: IUser; token: string }> => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await user.comparePassword(password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    jwtSecret,
    {
      expiresIn: "1d",
    }
  );

  return {
    user,
    token,
  };
};

export { registerUser, loginUser };
