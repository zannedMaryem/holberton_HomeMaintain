import { createHash } from "node:crypto";

const normalize = (value: string): string =>
  value.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase();

// Keep the fingerprint deterministic so MongoDB can enforce one matching open
// job per homeowner even when two identical requests arrive concurrently.
export const createJobFingerprint = (
  reporterId: string,
  location: string,
  serviceId: string,
  description: string,
): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        reporterId.toLowerCase(),
        normalize(location),
        serviceId.toLowerCase(),
        normalize(description),
      ]),
    )
    .digest("hex");
