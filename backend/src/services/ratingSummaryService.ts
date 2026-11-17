import mongoose from "mongoose";
import Problem from "../models/Problem";

export interface RatingSummary {
  average: number | null;
  count: number;
}

const summarize = async (
  match: Record<string, unknown>,
  ratingPath: "homeownerRating.score" | "technicianRating.score",
): Promise<RatingSummary> => {
  const [result] = await Problem.aggregate<{
    average: number;
    count: number;
  }>([
    {
      $match: {
        status: "completed",
        ...match,
        [ratingPath]: { $type: "number" },
      },
    },
    { $group: { _id: null, average: { $avg: `$${ratingPath}` }, count: { $sum: 1 } } },
  ]);

  return result
    ? { average: Math.round(result.average * 10) / 10, count: result.count }
    : { average: null, count: 0 };
};

export const getTechnicianRatingSummary = (profileId: string) =>
  summarize(
    { assignedTechnicianProfileId: new mongoose.Types.ObjectId(profileId) },
    "homeownerRating.score",
  );

export const getHomeownerRatingSummary = (userId: string) =>
  summarize(
    { reporterId: new mongoose.Types.ObjectId(userId) },
    "technicianRating.score",
  );

export const getTechnicianRatingSummaries = async (profileIds: string[]) => {
  if (profileIds.length === 0) return new Map<string, RatingSummary>();
  const objectIds = profileIds.map((id) => new mongoose.Types.ObjectId(id));
  const results = await Problem.aggregate<{
    _id: mongoose.Types.ObjectId;
    average: number;
    count: number;
  }>([
    {
      $match: {
        status: "completed",
        assignedTechnicianProfileId: { $in: objectIds },
        "homeownerRating.score": { $type: "number" },
      },
    },
    {
      $group: {
        _id: "$assignedTechnicianProfileId",
        average: { $avg: "$homeownerRating.score" },
        count: { $sum: 1 },
      },
    },
  ]);
  const summaries = new Map<string, RatingSummary>();
  for (const result of results) {
    summaries.set(result._id.toString(), {
      average: Math.round(result.average * 10) / 10,
      count: result.count,
    });
  }
  for (const id of profileIds) {
    if (!summaries.has(id)) summaries.set(id, { average: null, count: 0 });
  }
  return summaries;
};
