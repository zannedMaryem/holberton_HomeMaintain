import { Request, Response, NextFunction } from "express";
import { IUser } from "../models/User";

export const authorize = (...allowedRoles: IUser["role"][]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: "Access denied",
      });
      return;
    }

    next();
  };
};
