import { resolveMx } from "node:dns/promises";

const reservedDomains = new Set([
  "example.com",
  "example.net",
  "example.org",
]);

function getDnsErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export async function domainCanReceiveEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain || reservedDomains.has(domain) || /\.(example|invalid|test|localhost)$/.test(domain)) {
    return false;
  }

  try {
    const records = await resolveMx(domain);
    // "." is a special DNS value meaning the domain does not accept email.
    return records.some(({ exchange }) => exchange !== "" && exchange !== ".");
  } catch (error) {
    const code = getDnsErrorCode(error);

    if (code === "ENOTFOUND" || code === "ENODATA") {
      return false;
    }

    // DNS timeouts or server failures are infrastructure errors, not proof
    // that the user's email address is invalid.
    throw error;
  }
}
