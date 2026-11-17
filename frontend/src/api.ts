const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type AccountRole = "homeowner" | "technician" | "admin";

export interface Account {
  id: string;
  fullName: string;
  email: string;
  role: AccountRole;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  slug: string;
}

export interface Governorate {
  id: string;
  name: string;
}

export interface RentalEquipment {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  category: string;
  description: string;
  dailyPriceTnd: number;
  location: string;
  active: boolean;
  unavailableDates: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RentalBooking {
  id: string;
  equipment: {
    id: string;
    name: string;
    location: string;
    active: boolean;
  };
  dates: string[];
  dailyPriceTnd: number;
  totalPriceTnd: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
  cancelledAt?: string;
}

export interface MyRentals {
  equipment: RentalEquipment[];
  bookings: RentalBooking[];
}

export type JobStatus = "open" | "assigned" | "completed" | "closed";
export type JobSlot = "morning" | "afternoon";

export interface Job {
  id: string;
  reporter?: {
    id: string;
    fullName: string;
  };
  title: string;
  location: string;
  service: { id: string; name: string };
  description: string;
  status: JobStatus;
  assignedTechnicianProfileId?: string;
  assignedTechnician?: {
    id: string;
    displayName: string;
    photoDataUrl?: string;
  };
  scheduledDate?: string;
  scheduledSlot?: JobSlot;
  ratings?: {
    homeowner?: number;
    technician?: number;
  };
  applicationStatus?: JobApplication["status"];
  applicationRequestType?: JobApplication["requestType"];
  applicationId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JobApplication {
  id: string;
  technician: {
    id: string;
    displayName: string;
    description: string;
  };
  proposalMessage: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  requestType: "technician_proposal" | "homeowner_request";
  createdAt: string;
}

export interface TechnicianMatch {
  id: string;
  displayName: string;
  description: string;
  ratings: RatingSummary;
}

export interface TechnicianListing {
  id: string;
  displayName: string;
  description: string;
  photoDataUrl?: string;
  service: { id: string; name: string };
  governorates: string[];
  ratings: RatingSummary;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface AvailableSlot {
  id: JobSlot;
  label: string;
}

export interface TechnicianProfile {
  id: string;
  displayName: string;
  description: string;
  photoDataUrl?: string;
  active: boolean;
  ratings: RatingSummary;
  offerings: Array<{
    service: { id: string; name: string; active: boolean };
    governorates: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ApiErrorBody {
  message?: unknown;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  token?: string | null,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const responseText = await response.text();
  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const body = payload as ApiErrorBody | undefined;
    const message =
      typeof body?.message === "string"
        ? body.message
        : `The request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export const getStoredIds = (storageKey: string): string[] => {
  const stored = sessionStorage.getItem(storageKey);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
};

export const storeIds = (storageKey: string, ids: string[]): void => {
  sessionStorage.setItem(storageKey, JSON.stringify(ids));
};

export const getTunisiaToday = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .filter((part) => part.type !== "literal");
  const dateParts: Record<string, string> = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};
