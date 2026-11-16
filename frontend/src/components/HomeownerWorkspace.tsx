import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  MapPin,
  RefreshCw,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  apiRequest,
  type ApiEnvelope,
  type Governorate,
  type Job,
  type JobApplication,
  type ServiceItem,
} from "../api";
import JobActions from "./JobActions";

interface HomeownerWorkspaceProps {
  token: string;
}

interface TrackedJob {
  job: Job;
  applications: JobApplication[];
  loadError?: string;
}

interface JobCreateResponse extends ApiEnvelope<Job> {
  message: string;
}

const statusLabel: Record<Job["status"], string> = {
  open: "Looking for a technician",
  assigned: "Technician assigned",
  completed: "Completed",
  closed: "Closed",
};

export default function HomeownerWorkspace({
  token,
}: HomeownerWorkspaceProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "completed" | "closed"
  >("all");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<ApiEnvelope<ServiceItem[]>>("/services", token),
      apiRequest<ApiEnvelope<Governorate[]>>("/governorates", token),
    ])
      .then(([serviceResponse, governorateResponse]) => {
        if (!active) return;
        setCatalogError("");
        setServices(serviceResponse.data);
        setGovernorates(governorateResponse.data);
        setServiceId((current) => current || serviceResponse.data[0]?.id || "");
        setLocation((current) => current || governorateResponse.data[0]?.id || "");
      })
      .catch((requestError: unknown) => {
        if (active) {
          setCatalogError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load repair options.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  const refreshJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: jobList } = await apiRequest<ApiEnvelope<Job[]>>(
        "/jobs/mine",
        token,
      );
      const result = await Promise.all(
        jobList.map(async (job): Promise<TrackedJob> => {
          if (job.status !== "open" && job.status !== "assigned") {
            return { job, applications: [] };
          }
          try {
            const applicationResponse = await apiRequest<
              ApiEnvelope<JobApplication[]>
            >(`/jobs/${encodeURIComponent(job.id)}/applications`, token);
            return {
              job,
              applications: applicationResponse.data,
            };
          } catch (requestError) {
            return {
              job,
              applications: [],
              loadError:
                requestError instanceof Error
                  ? requestError.message
                  : "Could not load this saved job.",
            };
          }
        }),
      );
      setJobs(result);
    } catch (requestError) {
      setJobs([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load your repair history.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs, refreshVersion]);

  const refresh = () => setRefreshVersion((version) => version + 1);

  const createJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<JobCreateResponse>("/jobs", token, {
        method: "POST",
        body: { title, description, serviceId, location },
      });
      setTitle("");
      setDescription("");
      setNotice("Your repair job is published. You can review applications here.");
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not publish the repair job.",
      );
    } finally {
      setSaving(false);
    }
  };

  const decideApplication = async (
    jobId: string,
    applicationId: string,
    decision: "accept" | "decline",
  ) => {
    setError("");
    setNotice("");
    try {
      await apiRequest(
        `/jobs/${encodeURIComponent(jobId)}/applications/${encodeURIComponent(applicationId)}`,
        token,
        { method: "PATCH", body: { decision } },
      );
      setNotice(
        decision === "accept"
          ? "Technician assigned. Choose an intervention date in the job card."
          : "Application declined.",
      );
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the application.",
      );
    }
  };

  const cancelAssignment = async (jobId: string) => {
    if (
      !window.confirm(
        "Cancel this assignment and reopen the job so other technicians can apply?",
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await apiRequest(`/jobs/${encodeURIComponent(jobId)}/cancel`, token, {
        method: "PATCH",
      });
      setNotice("Assignment cancelled. The job is open for new applications.");
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not cancel this assignment.",
      );
    }
  };

  const deleteOpenJob = async (jobId: string) => {
    if (!window.confirm("Delete this open repair job? This cannot be undone.")) {
      return;
    }
    setError("");
    try {
      await apiRequest(`/jobs/${encodeURIComponent(jobId)}`, token, {
        method: "DELETE",
      });
      setNotice("Open job deleted.");
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the job.",
      );
    }
  };

  const governorateName = (id: string) =>
    governorates.find((governorate) => governorate.id === id)?.name ?? id;
  const activeJobCount = jobs.filter(
    ({ job }) => job.status === "open" || job.status === "assigned",
  ).length;
  const currentJobs = jobs.filter(
    ({ job }) => job.status === "open" || job.status === "assigned",
  );
  const repairHistory = jobs.filter(
    ({ job }) => job.status === "completed" || job.status === "closed",
  );
  const visibleHistory = repairHistory.filter(
    ({ job }) => historyFilter === "all" || job.status === historyFilter,
  );

  return (
    <div className="workspace-content homeowner-repairs-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">YOUR HOME, TAKEN CARE OF</span>
          <h2>My repairs</h2>
          <p>Post a new job, keep track of your next visit, and look back at what’s fixed.</p>
        </div>
        <div className="workspace-heading-actions">
          <button
            className="button button-outline button-small"
            type="button"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <span className="jobs-count">{activeJobCount} current {activeJobCount === 1 ? "repair" : "repairs"}</span>
        </div>
      </div>

      {notice && <p className="feedback feedback-success" role="status">{notice}</p>}
      {error && <p className="feedback feedback-error" role="alert">{error}</p>}

      <div className="homeowner-repairs-top-grid">
        <section className="homeowner-repair-panel homeowner-create-job-card">
          <div className="repairs-panel-heading">
            <div>
              <h3>Post a new repair job</h3>
              <p>Tell us what needs attention. We’ll help with the next step.</p>
            </div>
          </div>
          {catalogError && (
            <p className="feedback feedback-error" role="alert">{catalogError}</p>
          )}
          <form className="form-stack homeowner-repair-form" onSubmit={createJob}>
            <label>
              Job title
              <input
                required
                minLength={8}
                maxLength={72}
                placeholder="e.g. Kitchen sink is leaking"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                Type of repair
                <select
                  required
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                >
                  <option value="" disabled>Select a category</option>
                  {services.map((service) => (
                    <option value={service.id} key={service.id}>{service.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Where is the problem?
                <select
                  required
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="" disabled>Select a governorate</option>
                  {governorates.map((governorate) => (
                    <option value={governorate.id} key={governorate.id}>
                      {governorate.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Describe the problem
              <textarea
                required
                minLength={2}
                maxLength={2000}
                rows={3}
                placeholder="What’s happening? Add details that could help a professional understand the repair."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <p className="repair-timing-note">
              After a technician accepts, choose an available intervention date and time.
            </p>
            <button
              className="button button-primary button-wide"
              disabled={saving || !services.length || !governorates.length}
            >
              {saving ? "Publishing…" : "Publish repair job"} <ArrowRight size={17} />
            </button>
            <span className="repair-form-footnote">
              Posting is free. Review technician proposals before confirming a visit.
            </span>
          </form>
        </section>

        <section className="homeowner-repair-panel homeowner-current-repair">
          <div className="repairs-panel-heading">
            <div>
              <h3>Current repair</h3>
            </div>
            <span className="status-pill status-assigned">
              <span /> {activeJobCount} active
            </span>
          </div>
          {loading ? (
            <div className="empty-workspace repairs-panel-empty">Loading your current repair…</div>
          ) : currentJobs.length === 0 ? (
            <div className="empty-workspace repairs-panel-empty">
              <span className="empty-icon"><BriefcaseBusiness size={22} /></span>
              <strong>No current repair</strong>
              <span>When a job is posted or a technician is assigned, its progress will appear here.</span>
            </div>
          ) : (
            <div className="homeowner-current-list">
              {currentJobs.map(({ job, applications, loadError }) => {
                if (loadError) {
                  return (
                    <article className="homeowner-current-job" key={job.id}>
                      <p className="feedback feedback-error" role="alert">
                        Could not load saved job {job.id}: {loadError}
                      </p>
                    </article>
                  );
                }
                const pending = applications.filter((app) => app.status === "pending");
                const isExpanded = expandedJobId === job.id;
                return (
                  <article className="homeowner-current-job" key={job.id}>
                    <div className="current-job-heading">
                      <div>
                        <span className={`status-pill status-${job.status}`}>
                          <span /> {statusLabel[job.status]}
                        </span>
                        <span className="current-job-category">
                          REPAIR · {job.service.name.toUpperCase()}
                        </span>
                      </div>
                      {job.status === "open" && (
                        <button
                          className="icon-button danger-icon"
                          type="button"
                          aria-label="Delete open job"
                          title="Delete open job"
                          onClick={() => deleteOpenJob(job.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                    <h4>{job.title}</h4>
                    <div className="job-meta current-job-meta">
                      <span><MapPin size={14} /> {governorateName(job.location)}</span>
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>

                    {job.status === "open" && (
                      <div className="applications-block">
                        <div className="applications-heading">
                          <strong>Technician applications</strong>
                          <span>{applications.length} received</span>
                        </div>
                        {applications.length === 0 ? (
                          <p className="empty-applications">
                            No applications yet. We’ll show them here when a technician responds.
                          </p>
                        ) : (
                          applications.map((application) => (
                            <div className="application-card" key={application.id}>
                              <span className="application-avatar"><UserRound size={18} /></span>
                              <div className="application-copy">
                                <strong>{application.technician.displayName}</strong>
                                <span>{application.technician.description}</span>
                                <p>{application.proposalMessage}</p>
                              </div>
                              {application.status === "pending" ? (
                                <div className="application-actions">
                                  <button
                                    className="button button-primary button-small"
                                    type="button"
                                    onClick={() => decideApplication(job.id, application.id, "accept")}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    className="button button-outline button-small"
                                    type="button"
                                    onClick={() => decideApplication(job.id, application.id, "decline")}
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <span className={`application-status application-${application.status}`}>
                                  {application.status === "accepted" ? "Accepted" : application.status}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                        {pending.length > 0 && (
                          <p className="application-tip">
                            Accepting one proposal assigns that technician and closes the other pending proposals.
                          </p>
                        )}
                      </div>
                    )}

                    {job.status === "assigned" && (
                      <JobActions
                        job={job}
                        role="homeowner"
                        token={token}
                        onRefresh={refresh}
                        onCancel={() => void cancelAssignment(job.id)}
                      />
                    )}
                    {job.status === "completed" && (
                      <JobActions
                        job={job}
                        role="homeowner"
                        token={token}
                        onRefresh={refresh}
                      />
                    )}
                    <div className="job-card-bottom">
                      <span>
                        <Check size={14} /> Job details saved
                      </span>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Hide details" : "View repair details"}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="job-extra-details">
                        <p className="job-description">{job.description}</p>
                        <span>Job ID: {job.id}</span>
                        <span>Created {new Date(job.createdAt).toLocaleString()}</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="homeowner-history-section">
        <div className="homeowner-history-heading">
          <div>
            <h3>Repair history</h3>
            <span>{repairHistory.length} completed or closed repairs</span>
          </div>
          <label className="history-filter">
            <span className="sr-only">Filter repair history</span>
            <select
              value={historyFilter}
              onChange={(event) =>
                setHistoryFilter(event.target.value as typeof historyFilter)
              }
            >
              <option value="all">All repairs</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        {loading ? (
          <div className="empty-workspace">Loading your repair history…</div>
        ) : visibleHistory.length === 0 ? (
          <div className="empty-workspace history-empty">
            <strong>
              {repairHistory.length === 0
                ? "No completed repairs yet"
                : `No ${historyFilter} repairs`}
            </strong>
            <span>Completed and closed jobs will be kept here for future reference.</span>
          </div>
        ) : (
          <div className="repair-history-table-wrap">
            <table className="repair-history-table">
              <thead>
                <tr>
                  <th scope="col">Repair</th>
                  <th scope="col">Status</th>
                  <th scope="col">Service and area</th>
                  <th scope="col">Last updated</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map(({ job }) => {
                  const isExpanded = expandedJobId === job.id;
                  return (
                    <tr key={job.id}>
                      <td>
                        <strong>{job.title}</strong>
                        <small>{job.service.name}</small>
                      </td>
                      <td>
                        <span className={`status-pill status-${job.status}`}>
                          <span /> {statusLabel[job.status]}
                        </span>
                      </td>
                      <td>
                        <strong>{governorateName(job.location)}</strong>
                        <small>{job.service.name}</small>
                      </td>
                      <td>{new Date(job.updatedAt ?? job.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                        {isExpanded && (
                          <div className="history-job-details">
                            <p>{job.description}</p>
                            <JobActions
                              job={job}
                              role="homeowner"
                              token={token}
                              onRefresh={refresh}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="history-footer-note">
            <span>Showing {visibleHistory.length} repair records.</span>
            <span>Your repair history, in one place.</span>
          </div>
        )}
      </section>
    </div>
  );
}
