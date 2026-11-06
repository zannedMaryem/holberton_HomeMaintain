import { Request, Response } from "express";
import { TUNISIA_GOVERNORATES } from "../constants/tunisiaGovernorates";

export const listGovernorates = (_req: Request, res: Response): void => {
  res.status(200).json({ data: TUNISIA_GOVERNORATES });
};
