import { Request, Response } from "express";
import {
  listActiveJobCategories,
  deleteJobCategory,
  postJobCategory,
  changeJobCategoryStatus,
} from "../services/jobCategoryService";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

export const postCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Unauthorized action" });
    return;
  }

  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).some((field) => field !== "name")
  ) {
    res.status(400).json({ message: "A JSON object with only a name is required" });
    return;
  }

  const { name } = req.body;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    res.status(400).json({
      message: "Category name must contain between 2 and 100 characters",
    });
    return;
  }

  try {
    const category = await postJobCategory(name.trim());
    res.status(201).json({
      message: "Job category created successfully",
      data: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        active: category.active,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "A category with this name already exists"
    ) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message === "Category name must contain letters or numbers"
    ) {
      res.status(400).json({ message: error.message });
      return;
    }

    console.error("Create job category error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const changeCategoryStatus = async (
  req: Request<{ categoryId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Unauthorized action" });
    return;
  }

  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).length !== 1 ||
    typeof req.body.active !== "boolean"
  ) {
    res.status(400).json({ message: "Request body must contain an active boolean" });
    return;
  }

  try {
    const category = await changeJobCategoryStatus(
      req.params.categoryId,
      req.body.active,
    );
    res.status(200).json({
      message: "Job category status updated successfully",
      data: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        active: category.active,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Job category not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    console.error("Update job category status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCategory = async (
  req: Request<{ categoryId: string }>,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Unauthorized action" });
      return;
    }

    await deleteJobCategory(req.params.categoryId);
  } catch (error) {
    if (error instanceof Error && error.message === "Job category not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error("List job categories error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
