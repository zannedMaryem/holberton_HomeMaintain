import { createHash } from "node:crypto";

const normalize = (value: string): string =>
  value.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase();

// Keep the fingerprint deterministic so MongoDB can enforce one matching open
// job per homeowner even when two identical requests arrive concurrently.
export const createJobFingerprint = (
  reporterId: string,
  location: string,
  governorateId: string,
  categoryId: string,
  description: string,
): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        reporterId.toLowerCase(),
        normalize(location),
        governorateId.toLowerCase(),
        categoryId.toLowerCase(),
        normalize(description),
      ]),
    )
    .digest("hex");

export const jobCategorySlug = (categoryName: string): string => {
  const slug = categoryName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "other";
};
