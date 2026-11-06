import { Request, Response } from "express";
import { listActiveJobCategories } from "../services/jobCategoryService";

export const getJobCategories = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const categories = await listActiveJobCategories();

    res.status(200).json({
      data: categories.map((category) => ({
        id: category._id,
        name: category.name,
        slug: category.slug,
      })),
    });
  } catch (error) {
    console.error("List job categories error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
