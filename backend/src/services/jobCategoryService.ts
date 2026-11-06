import JobCategory from "../models/JobCategory";

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
