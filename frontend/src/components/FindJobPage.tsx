import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import {
  apiRequest,
  type ApiEnvelope,
  type Job,
  type TechnicianProfile,
} from "../api";

interface FindJobPageProps {
  token: string;
  userId: string;
  onManageProfile: () => void;
}

interface OpenJobsPage {
  data: Omit<Job, "status">[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export default function FindJobPage({
  token,
  userId,
  onManageProfile,
}: FindJobPageProps) {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicationStatuses, setApplicationStatuses] = useState<
    Map<string, Job["applicationStatus"]>
  >(new Map());
  const [serviceFilter, setServiceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [applyingTo, setApplyingTo] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadPage = useCallback(async (pageNumber: number, append = false) => {
    setLoading(true);
    setError("");
    try {
      const [profileResult, jobsResult, myJobsResult] = await Promise.allSettled([
        apiRequest<ApiEnvelope<TechnicianProfile>>(
          "/technicians/me/profile",
          token,
        ),
        apiRequest<OpenJobsPage>(`/jobs?page=${pageNumber}&limit=50`, token),
        apiRequest<ApiEnvelope<Job[]>>("/jobs/technician/mine", token),
      ]);

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value.data);
      } else if (
        profileResult.reason instanceof Error &&
        profileResult.reason.message === "Technician profile not found"
      ) {
        setProfile(null);
      } else {
        throw profileResult.reason;
      }

      if (jobsResult.status === "rejected") throw jobsResult.reason;
      const loadedJobs = jobsResult.value.data.map((job) => ({
        ...job,
        status: "open" as const,
      }));
      setJobs((current) =>
        append
          ? [...current, ...loadedJobs.filter((job) => !current.some((item) => item.id === job.id))]
          : loadedJobs,
      );
      setHasMore(jobsResult.value.pagination.hasMore);
      setPage(pageNumber);

      if (myJobsResult.status === "fulfilled") {
        setApplicationStatuses(
          new Map(
            myJobsResult.value.data
              .filter((job) => job.applicationStatus)
              .map((job) => [job.id, job.applicationStatus]),
          ),
        );
      } else {
        throw myJobsResult.reason;
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load open jobs.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPage(1);
  }, [loadPage, refreshVersion]);

  const offeredServices = useMemo(() => profile?.offerings ?? [], [profile]);
  const availableGovernorates = useMemo(
    () => [...new Set(offeredServices.flatMap((offering) => offering.governorates))],
    [offeredServices],
  );
  const matchingJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (job.reporter?.id === userId) return false;
      const matchingOffering = profile?.offerings.some(
        (offering) =>
          offering.service.id === job.service.id &&
          offering.governorates.includes(job.location),
      );
      if (!matchingOffering) return false;
      if (serviceFilter !== "all" && job.service.id !== serviceFilter) return false;
      if (locationFilter !== "all" && job.location !== locationFilter) return false;
      if (
        normalizedSearch &&
        !`${job.title} ${job.description} ${job.service.name} ${job.location}`
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [jobs, locationFilter, profile, search, serviceFilter, userId]);

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
      setApplicationStatuses((current) => new Map(current).set(jobId, "pending"));
      setProposalMessage("");
      setExpandedJobId(null);
      setNotice("Proposal sent. You can follow it on your My repairs page.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send your proposal.",
      );
    } finally {
      setApplyingTo("");
    }
  };

  const services = [
    ...new Map(
      offeredServices.map((offering) => [
        offering.service.id,
        offering.service,
      ]),
    ).values(),
  ];

  return (
    <div className="workspace-content technician-find-jobs-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">PROFESSIONAL ACCOUNT</span>
          <h2>Find a job</h2>
          <p>Browse repair requests that match your services and work areas.</p>
        </div>
        <div className="workspace-heading-actions">
          <button
            className="button button-outline button-small"
            type="button"
            onClick={onManageProfile}
          >
            Manage profile
          </button>
          <button
            className="button button-outline button-small"
            type="button"
            onClick={() => setRefreshVersion((version) => version + 1)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
        </div>
      </div>

      {notice && <p className="feedback feedback-success" role="status">{notice}</p>}
      {error && <p className="feedback feedback-error" role="alert">{error}</p>}

      {!profile?.active ? (
        <section className="workspace-callout profile-needed technician-profile-needed">
          <UserRound size={20} />
          <div>
            <strong>{profile ? "Your profile is inactive" : "Set up your technician profile"}</strong>
            <p>
              Add your services and governorates to see matching job requests and apply.
            </p>
            <button className="button button-primary button-small" onClick={onManageProfile}>
              Manage profile <ArrowRight size={15} />
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="technician-find-summary">
            <div>
              <span className="summary-icon"><BriefcaseBusiness size={19} /></span>
              <span><strong>{services.length}</strong><small>Services offered</small></span>
            </div>
            <div>
              <span className="summary-icon summary-icon-open"><MapPin size={18} /></span>
              <span><strong>{availableGovernorates.length}</strong><small>Service areas</small></span>
            </div>
            <div>
              <span className="summary-icon summary-icon-complete"><BriefcaseBusiness size={19} /></span>
              <span><strong>{matchingJobs.length}</strong><small>Matching jobs</small></span>
            </div>
          </div>

          <section className="technician-find-filter-panel">
            <div className="technician-find-filter-heading">
              <div>
                <span className="eyebrow">JOB SEARCH</span>
                <h3>Find the right opportunity</h3>
              </div>
              <span>Only open jobs in your active service areas are shown.</span>
            </div>
            <div className="find-job-filters">
            <label className="search-field">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search repair jobs"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              <span>Service</span>
              <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                <option value="all">All my services</option>
                {services.map((service) => (
                  <option value={service.id} key={service.id}>{service.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Governorate</span>
              <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                <option value="all">All my areas</option>
                {availableGovernorates.map((location) => (
                  <option value={location} key={location}>{formatGovernorate(location)}</option>
                ))}
              </select>
            </label>
            </div>
          </section>

          <section className="technician-find-results">
            <div className="technician-repair-list-heading">
            <div>
              <span className="eyebrow">OPEN OPPORTUNITIES</span>
              <h3>Available jobs</h3>
            </div>
            <span className="jobs-count">{matchingJobs.length} matches</span>
            </div>

          {loading && jobs.length === 0 ? (
            <div className="empty-workspace">Finding open jobs…</div>
          ) : matchingJobs.length === 0 ? (
            <div className="empty-workspace">
              <span className="empty-icon"><BriefcaseBusiness size={22} /></span>
              <strong>No jobs match your service areas</strong>
              <span>Try another search or update your service areas.</span>
            </div>
          ) : (
            <div className="technician-open-job-grid">
              {matchingJobs.map((job) => {
                const applicationStatus = applicationStatuses.get(job.id);
                const isExpanded = expandedJobId === job.id;
                return (
                  <article className="job-card technician-open-job-card" key={job.id}>
                    <div className="job-card-top">
                      <div className="job-card-title">
                        <span className="status-pill status-open"><span /> Open for proposals</span>
                        <h4>{job.title}</h4>
                        <div className="job-meta">
                          <span><MapPin size={14} /> {formatGovernorate(job.location)}</span>
                          <span>{job.service.name}</span>
                          {job.reporter && <span>Homeowner: {job.reporter.fullName}</span>}
                          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <p className="job-description">{job.description}</p>
                    {applicationStatus ? (
                      <div className="application-sent-note">
                        You already applied — status: {applicationStatus}.
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
                        Send a proposal <ArrowRight size={15} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {hasMore && (
            <div className="load-more-row">
              <button
                className="button button-outline"
                type="button"
                disabled={loading}
                onClick={() => void loadPage(page + 1, true)}
              >
                {loading ? "Loading…" : "Load more open jobs"}
              </button>
            </div>
          )}
          </section>
        </>
      )}
    </div>
  );
}

function formatGovernorate(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
