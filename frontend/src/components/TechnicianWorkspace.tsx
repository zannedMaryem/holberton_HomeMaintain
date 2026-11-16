import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  MapPin,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  apiRequest,
  getStoredIds,
  storeIds,
  type Account,
  type ApiEnvelope,
  type Governorate,
  type Job,
  type ServiceItem,
  type TechnicianProfile,
} from "../api";
import JobActions from "./JobActions";

interface TechnicianWorkspaceProps {
  user: Account;
  token: string;
}

interface OpenJobListResponse {
  data: Array<Omit<Job, "status"> & { status?: "open" }>;
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface TrackedJob {
  job: Job;
  error?: string;
}

interface ProfileForm {
  displayName: string;
  description: string;
  active: boolean;
  offerings: Record<string, string[]>;
}

const storageKey = (userId: string) => `homemaintain-technician-jobs-${userId}`;

const emptyProfileForm = (user: Account): ProfileForm => ({
  displayName: user.fullName,
  description: "",
  active: true,
  offerings: {},
});

export default function TechnicianWorkspace({
  user,
  token,
}: TechnicianWorkspaceProps) {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(() =>
    emptyProfileForm(user),
  );
  const [profileExists, setProfileExists] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingTo, setApplyingTo] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    const [servicesResult, governoratesResult, profileResult, jobsResult] =
      await Promise.allSettled([
        apiRequest<ApiEnvelope<ServiceItem[]>>("/services", token),
        apiRequest<ApiEnvelope<Governorate[]>>("/governorates", token),
        apiRequest<ApiEnvelope<TechnicianProfile>>(
          "/technicians/me/profile",
          token,
        ),
        apiRequest<OpenJobListResponse>("/jobs?page=1&limit=50", token),
      ]);

    if (servicesResult.status === "fulfilled") {
      setServices(servicesResult.value.data);
    } else {
      setError((current) => current || errorMessage(servicesResult.reason));
    }

    if (governoratesResult.status === "fulfilled") {
      setGovernorates(governoratesResult.value.data);
    } else {
      setError((current) => current || errorMessage(governoratesResult.reason));
    }

    if (profileResult.status === "fulfilled") {
      const currentProfile = profileResult.value.data;
      setProfile(currentProfile);
      setProfileExists(true);
      setProfileForm({
        displayName: currentProfile.displayName,
        description: currentProfile.description,
        active: currentProfile.active,
        offerings: Object.fromEntries(
          currentProfile.offerings.map((offering) => [
            offering.service.id,
            offering.governorates,
          ]),
        ),
      });
    } else if (
      profileResult.reason instanceof Error &&
      profileResult.reason.message === "Technician profile not found"
    ) {
      setProfile(null);
      setProfileExists(false);
      setProfileForm(emptyProfileForm(user));
    } else {
      setError((current) => current || errorMessage(profileResult.reason));
    }

    if (jobsResult.status === "fulfilled") {
      setOpenJobs(
        jobsResult.value.data.map((job) => ({
          ...job,
          status: job.status ?? "open",
        })),
      );
    } else {
      setError((current) => current || errorMessage(jobsResult.reason));
    }

    const trackedIds = getStoredIds(storageKey(user.id));
    const savedJobs = await Promise.all(
      trackedIds.map(async (id): Promise<TrackedJob> => {
        try {
          const response = await apiRequest<ApiEnvelope<Job>>(
            `/jobs/${encodeURIComponent(id)}`,
            token,
          );
          return { job: response.data };
        } catch (requestError) {
          return {
            job: {
              id,
              title: "Saved job",
              location: "",
              service: { id: "", name: "Unknown service" },
              description: "",
              status: "closed",
              createdAt: "",
            },
            error: errorMessage(requestError),
          };
        }
      }),
    );
    setTrackedJobs(savedJobs);
    setLoading(false);
  }, [token, user]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace, refreshVersion]);

  const refresh = () => setRefreshVersion((version) => version + 1);
  const offerings = Object.entries(profileForm.offerings).filter(
    ([, areas]) => areas.length > 0,
  );
  const offeredOpenJobs = useMemo(() => {
    if (!profile || !profile.active) return [];
    return openJobs.filter((job) =>
      profile.offerings.some(
        (offering) =>
          offering.service.id === job.service.id &&
          offering.governorates.includes(job.location),
      ),
    );
  }, [openJobs, profile]);
  const appliedIds = getStoredIds(storageKey(user.id));
  const assignedOrCompletedJobs = trackedJobs.filter(
    ({ job, error: savedError }) =>
      !savedError && (job.status === "assigned" || job.status === "completed"),
  );

  const toggleOfferingArea = (service: ServiceItem, areaId: string) => {
    setProfileForm((current) => {
      const currentAreas = current.offerings[service.id] ?? [];
      const nextAreas = currentAreas.includes(areaId)
        ? currentAreas.filter((area) => area !== areaId)
        : [...currentAreas, areaId];
      return {
        ...current,
        offerings: { ...current.offerings, [service.id]: nextAreas },
      };
    });
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (offerings.length === 0) {
      setError("Choose at least one service and one governorate.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/technicians/me/profile", token, {
        method: "PUT",
        body: {
          displayName: profileForm.displayName,
          description: profileForm.description,
          active: true,
          offerings: offerings.map(([serviceId, areas]) => ({
            serviceId,
            governorates: areas,
          })),
        },
      });
      setNotice("Technician profile saved and active.");
      refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deactivateProfile = async () => {
    if (
      !window.confirm(
        "Deactivate your technician profile? Your history stays saved, but you will stop receiving new job applications.",
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await apiRequest("/technicians/me/profile", token, { method: "DELETE" });
      setNotice("Your technician profile is deactivated. Job history is retained.");
      refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const submitApplication = async (
    event: FormEvent<HTMLFormElement>,
    jobId: string,
  ) => {
    event.preventDefault();
    setApplyingTo(jobId);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/jobs/${encodeURIComponent(jobId)}/applications`, token, {
        method: "POST",
        body: { proposalMessage },
      });
      const ids = getStoredIds(storageKey(user.id));
      storeIds(storageKey(user.id), [jobId, ...ids.filter((id) => id !== jobId)]);
      setProposalMessage("");
      setExpandedJobId(null);
      setNotice("Your proposal was sent. The homeowner will review it.");
      refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setApplyingTo("");
    }
  };

  const governorateName = (id: string) =>
    governorates.find((governorate) => governorate.id === id)?.name ?? id;

  return (
    <div className="workspace-content">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">TECHNICIAN WORKSPACE</span>
          <h2>Good work starts with a clear plan.</h2>
          <p>Manage your profile, find relevant jobs, and keep up with visits.</p>
        </div>
        <button
          className="button button-outline button-small"
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      {notice && <p className="feedback feedback-success" role="status">{notice}</p>}
      {error && <p className="feedback feedback-error" role="alert">{error}</p>}

      <div className="technician-layout">
        <section className="profile-card">
          <div className="jobs-heading">
            <div>
              <span className="eyebrow">YOUR PROFILE</span>
              <h3>{profileExists ? "Service profile" : "Set up your profile"}</h3>
            </div>
            {profile?.active && <span className="profile-active-pill"><span /> Active</span>}
            {profile && !profile.active && <span className="profile-inactive-pill">Inactive</span>}
          </div>
          <p className="form-hint">
            Homeowners can see your name, service description, and service areas.
          </p>
          <form className="form-stack profile-form" onSubmit={saveProfile}>
            <label>
              Display name
              <input
                required
                minLength={2}
                maxLength={50}
                value={profileForm.displayName}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              About your work
              <textarea
                required
                minLength={2}
                maxLength={2000}
                rows={3}
                placeholder="Describe your experience and the work you do."
                value={profileForm.description}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <fieldset className="offering-fieldset">
              <legend>Services and areas</legend>
              {services.map((service) => (
                <div className="offering-row" key={service.id}>
                  <strong>{service.name}</strong>
                  <div className="area-checkboxes">
                    {governorates.map((governorate) => {
                      const checked = (
                        profileForm.offerings[service.id] ?? []
                      ).includes(governorate.id);
                      return (
                        <label className="area-checkbox" key={governorate.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOfferingArea(service, governorate.id)}
                          />
                          {governorate.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </fieldset>
            <button className="button button-primary button-wide" disabled={saving}>
              {saving ? "Saving…" : profile?.active ? "Save profile" : "Save and activate profile"}
              <ArrowRight size={17} />
            </button>
            {profile?.active && (
              <button
                className="button button-danger-quiet button-wide"
                type="button"
                onClick={deactivateProfile}
                disabled={saving}
              >
                Deactivate technician profile
              </button>
            )}
          </form>
        </section>

        <section className="technician-jobs-column">
          <div className="open-jobs-card">
            <div className="jobs-heading">
              <div>
                <span className="eyebrow">OPEN JOBS</span>
                <h3>Find a good match</h3>
              </div>
              <span className="jobs-count">{offeredOpenJobs.length} matches</span>
            </div>
            {!profile?.active ? (
              <div className="workspace-callout">
                <ShieldAlert size={19} />
                <span>Save and activate your profile to see jobs matching your services and areas.</span>
              </div>
            ) : offeredOpenJobs.length === 0 ? (
              <div className="empty-workspace">
                <span className="empty-icon"><BriefcaseBusiness size={22} /></span>
                <strong>No matching open jobs yet</strong>
                <span>Check again later or update your service areas.</span>
              </div>
            ) : (
              <div className="job-list">
                {offeredOpenJobs.map((job) => {
                  const alreadyApplied = appliedIds.includes(job.id);
                  const isExpanded = expandedJobId === job.id;
                  return (
                    <article className="job-card" key={job.id}>
                      <div className="job-card-top">
                        <div className="job-card-title">
                          <span className="status-pill status-open"><span /> Open for proposals</span>
                          <h4>{job.title}</h4>
                          <div className="job-meta">
                            <span><MapPin size={14} /> {governorateName(job.location)}</span>
                            <span>{job.service.name}</span>
                            {job.reporter && <span>By {job.reporter.fullName}</span>}
                          </div>
                        </div>
                      </div>
                      <p className="job-description">{job.description}</p>
                      {alreadyApplied ? (
                        <div className="application-sent-note">
                          <Check size={16} /> Proposal sent from this browser session.
                        </div>
                      ) : isExpanded ? (
                        <form
                          className="application-compose"
                          onSubmit={(event) => submitApplication(event, job.id)}
                        >
                          <label>
                            Your proposal
                            <textarea
                              required
                              minLength={2}
                              maxLength={2000}
                              rows={3}
                              placeholder="Introduce yourself and explain how you can help."
                              value={proposalMessage}
                              onChange={(event) => setProposalMessage(event.target.value)}
                            />
                          </label>
                          <div className="application-compose-actions">
                            <button
                              className="button button-outline button-small"
                              type="button"
                              onClick={() => setExpandedJobId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              className="button button-primary button-small"
                              disabled={applyingTo === job.id}
                            >
                              {applyingTo === job.id ? "Sending…" : "Send proposal"}
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="button button-primary button-small"
                          type="button"
                          onClick={() => {
                            setExpandedJobId(job.id);
                            setProposalMessage("");
                          }}
                        >
                          Apply for this job <ArrowRight size={15} />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="assigned-jobs-card">
            <div className="jobs-heading">
              <div>
                <span className="eyebrow">YOUR JOB ACTIVITY</span>
                <h3>Assigned work and ratings</h3>
              </div>
              <span className="jobs-count">{assignedOrCompletedJobs.length} jobs</span>
            </div>
            <p className="form-hint">
              Jobs you applied to in this browser are remembered here; accepted jobs include scheduling and completion actions.
            </p>
            {trackedJobs.length === 0 ? (
              <div className="empty-workspace">
                <span className="empty-icon"><UserRound size={22} /></span>
                <strong>No tracked job activity</strong>
                <span>After applying, the job will appear here for status updates.</span>
              </div>
            ) : (
              <div className="job-list">
                {trackedJobs.map(({ job, error: savedError }) => (
                  <article className="job-card tracked-job-card" key={job.id}>
                    {savedError ? (
                      <p className="feedback feedback-error">
                        Job {job.id} is no longer available to this profile: {savedError}
                      </p>
                    ) : (
                      <>
                        <div className="job-card-top">
                          <div className="job-card-title">
                            <span className={`status-pill status-${job.status}`}>
                              <span /> {job.status === "assigned"
                                ? "You’re assigned"
                                : job.status === "completed"
                                  ? "Completed"
                                  : "Proposal submitted"}
                            </span>
                            <h4>{job.title}</h4>
                            <div className="job-meta">
                              <span><MapPin size={14} /> {governorateName(job.location)}</span>
                              <span>{job.service.name}</span>
                            </div>
                          </div>
                        </div>
                        {job.status === "assigned" || job.status === "completed" ? (
                          <JobActions
                            job={job}
                            role="technician"
                            token={token}
                            onRefresh={refresh}
                          />
                        ) : (
                          <p className="application-sent-note">
                            Waiting for the homeowner to review the proposal.
                          </p>
                        )}
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <p className="workspace-note">
        For safety, use the job details and agreed schedule to coordinate work. HomeMaintain is not an emergency service.
      </p>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}
