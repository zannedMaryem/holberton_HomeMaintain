import JobCategory from "../models/JobCategory";

const createCategorySlug = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const postJobCategory = async (name: string) => {
  const slug = createCategorySlug(name);
  if (!slug) {
    throw new Error("Category name must contain letters or numbers");
  }

  try {
    return await JobCategory.create({ name, slug, active: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("A category with this name already exists");
    }

    throw error;
  }
};

export const listActiveJobCategories = async () =>
  JobCategory.find({ active: true }).sort({ name: 1 });

export const getActiveJobCategory = async (categoryId: string) => {
  const category = await JobCategory.findOne({
    _id: categoryId,
    active: true,
  });

  if (!category) {
    throw new Error("Job category not found");
  }

  return category;
};


export const changeJobCategoryStatus = async (
  categoryId: string,
  active: boolean,
) => {
  const category = await JobCategory.findByIdAndUpdate(
    categoryId,
    { $set: { active } },
    { new: true, runValidators: true },
  );

  if (category === null) {
    throw new Error("Job category not found");
  }

  return category;
};

export const deleteJobCategory = async (categoryId: string) => {
  const category = await JobCategory.findOne({ categoryId });
  if (!category) {
    throw new Error("Job category not found");
  }
  await JobCategory.findByIdAndDelete(categoryId);
};
