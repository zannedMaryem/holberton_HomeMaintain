import mongoose from "mongoose";
import JobCategory from "../models/JobCategory";
import Problem from "../models/Problem";
import { createJobFingerprint, jobCategorySlug } from "../utils/jobFingerprint";
import {
  isTunisiaGovernorateId,
  TUNISIA_GOVERNORATES,
} from "../constants/tunisiaGovernorates";

const initialCategories = [
  { name: "Appliance repair", slug: "appliance-repair" },
  { name: "Carpentry", slug: "carpentry" },
  { name: "Electrical", slug: "electrical" },
  { name: "Heating and cooling", slug: "heating-and-cooling" },
  { name: "Painting and drywall", slug: "painting-and-drywall" },
  { name: "Plumbing", slug: "plumbing" },
  { name: "Roofing", slug: "roofing" },
  { name: "Other", slug: "other" },
];

const normalizeExistingJobData = async (): Promise<void> => {
  for (const category of initialCategories) {
    await JobCategory.updateOne(
      { slug: category.slug },
      { $setOnInsert: { ...category, active: true } },
      { upsert: true },
    );
  }

  const migrationKey = "job-category-and-fingerprint-v1";
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB must be connected before running job data migrations");
  }
  const migrations = database.collection<{
    _id: string;
    completedAt?: Date;
  }>("app_migrations");
  if (!(await migrations.findOne({ _id: migrationKey }))) {
    // This one-time migration converts old text categories and prepares every
    // existing job for the required fingerprint and unique index.
    const jobsNeedingMigration = await Problem.collection
      .find({
        $or: [
          { category: { $type: "string" } },
          { categoryId: { $exists: false } },
          { duplicateFingerprint: { $exists: false } },
        ],
      })
      .toArray();

    for (const job of jobsNeedingMigration) {
      let categoryId = job.categoryId;

      if (typeof job.category === "string") {
        const legacySlug = jobCategorySlug(job.category);
        const matchingSeed = initialCategories.find(
          (category) => category.slug === legacySlug,
        );
        const slug = matchingSeed?.slug ?? "other";
        const categoryName = matchingSeed?.name ?? "Other";

        // Map known legacy labels to the seeded list; unknown labels become Other.
        const category = await JobCategory.findOneAndUpdate(
          { slug },
          {
            $setOnInsert: {
              slug,
              name: categoryName,
              active: true,
            },
          },
          { upsert: true, new: true },
        );

        categoryId = category._id;
      }

      const reporterId = String(job.reporterId ?? "");
      if (
        !mongoose.isObjectIdOrHexString(String(categoryId ?? "")) ||
        !mongoose.isObjectIdOrHexString(reporterId) ||
        typeof job.title !== "string" ||
        typeof job.location !== "string" ||
        typeof job.description !== "string"
      ) {
        throw new Error(
          `Cannot migrate job ${String(job._id)}: required fields are missing or invalid`,
        );
      }

      const fingerprint = createJobFingerprint(
        reporterId,
        job.location,
        String(categoryId),
        job.description,
      );

      await Problem.collection.updateOne(
        { _id: job._id },
        {
          $set: {
            reporterId: new mongoose.Types.ObjectId(reporterId),
            categoryId: new mongoose.Types.ObjectId(String(categoryId)),
            duplicateFingerprint: fingerprint,
          },
          $unset: { category: "" },
        },
      );
    }

    await migrations.updateOne(
      { _id: migrationKey },
      { $setOnInsert: { completedAt: new Date() } },
      { upsert: true },
    );
  }

  const locationMigrationKey = "job-location-governorate-v3";
  if (await migrations.findOne({ _id: locationMigrationKey })) return;

  // Promote an explicit governorate or exact legacy match into `location`.
  // Unknown old text is preserved rather than assigned to a guessed location.
  for await (const job of Problem.collection.find({})) {
    const reporterId = String(job.reporterId ?? "");
    const categoryId = String(job.categoryId ?? "");
    if (
      !mongoose.isObjectIdOrHexString(reporterId) ||
      !mongoose.isObjectIdOrHexString(categoryId) ||
      typeof job.location !== "string" ||
      typeof job.description !== "string"
    ) {
      throw new Error(
        `Cannot migrate job ${String(job._id)}: required fields are missing or invalid`,
      );
    }

    let location: string | undefined;
    if (isTunisiaGovernorateId(job.governorateId)) {
      location = job.governorateId;
    } else if (
      job.governorateId !== undefined &&
      job.governorateId !== null
    ) {
      throw new Error(
        `Cannot migrate job ${String(job._id)}: unsupported governorate ID`,
      );
    }

    if (location === undefined) {
      const legacyLocation = job.location.trim().toLowerCase();
      location = TUNISIA_GOVERNORATES.find(
        ({ id, name }) =>
          id === legacyLocation || name.toLowerCase() === legacyLocation,
      )?.id;
    }

    const storedLocation = location ?? job.location;
    const fingerprint = createJobFingerprint(
      reporterId,
      storedLocation,
      categoryId,
      job.description,
    );

    await Problem.collection.updateOne(
      { _id: job._id },
      {
        $set: {
          location: storedLocation,
          duplicateFingerprint: fingerprint,
        },
        $unset: { governorateId: "" },
      },
    );
  }

  // Fail with a useful message before MongoDB reports an opaque index-build error.
  const duplicates = await Problem.collection
    .aggregate([
      { $match: { status: "open" } },
      {
        $group: {
          _id: { reporterId: "$reporterId", fingerprint: "$duplicateFingerprint" },
          jobIds: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 },
    ])
    .toArray();

  if (duplicates.length > 0) {
    throw new Error(
      "Cannot enable unique open-job listings: duplicate existing jobs were found. Close or remove duplicate open jobs, then restart the API.",
    );
  }

  // The marker avoids rescanning the jobs collection at every server startup.
  await migrations.updateOne(
    { _id: locationMigrationKey },
    { $setOnInsert: { completedAt: new Date() } },
    { upsert: true },
  );
};

export default normalizeExistingJobData;
