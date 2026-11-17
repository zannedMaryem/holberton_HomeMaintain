import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  apiRequest,
  type Account,
  type ApiEnvelope,
  type Job,
} from "../api";
import JobActions from "./JobActions";

interface TechnicianRepairsPageProps {
  user: Account;
  token: string;
  hasActiveTechnicianProfile: boolean;
  onFindJobs: () => void;
}

const applicationLabel: Record<NonNullable<Job["applicationStatus"]>, string> = {
  pending: "Proposal awaiting review",
  accepted: "Proposal accepted",
  declined: "Proposal declined",
  cancelled: "Assignment cancelled",
};

export default function TechnicianRepairsPage({
  user,
  token,
  hasActiveTechnicianProfile,
  onFindJobs,
}: TechnicianRepairsPageProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [filter, setFilter] = useState<
    "all" | "awaiting" | "assigned" | "past"
  >("all");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiRequest<ApiEnvelope<Job[]>>(
        "/jobs/technician/mine",
        token,
      );
      setJobs(data);
    } catch (requestError) {
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
    void loadJobs();
  }, [loadJobs, refreshVersion]);

  const refresh = () => setRefreshVersion((version) => version + 1);
  const completedCount = jobs.filter((job) => job.status === "completed").length;
  const awaitingCount = jobs.filter(
    (job) => job.status === "open" && job.applicationStatus === "pending",
  ).length;
  const assignedCount = jobs.filter((job) => job.status === "assigned").length;
  const pastCount = jobs.filter(isPastJob).length;
  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (filter === "awaiting") {
          return job.status === "open" && job.applicationStatus === "pending";
        }
        if (filter === "assigned") return job.status === "assigned";
        if (filter === "past") return isPastJob(job);
        return true;
      }),
    [filter, jobs],
  );

  return (
    <div className="workspace-content technician-repairs-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">PROFESSIONAL ACCOUNT</span>
          <h2>My repairs</h2>
          <p>Track your proposals, scheduled work, and completed jobs.</p>
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
          {hasActiveTechnicianProfile && (
            <button
              className="button button-primary button-small"
              type="button"
              onClick={onFindJobs}
            >
              Find jobs <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="repair-summary-row technician-repair-summary">
        <div className="repair-summary-card technician-repair-summary-card">
          <span className="summary-icon"><BriefcaseBusiness size={19} /></span>
          <div><strong>{jobs.length}</strong><span>Jobs in your account</span></div>
        </div>
        <div className="repair-summary-card technician-repair-summary-card">
          <span className="summary-icon summary-icon-open"><RefreshCw size={18} /></span>
          <div><strong>{assignedCount}</strong><span>Assigned to you</span></div>
        </div>
        <div className="repair-summary-card technician-repair-summary-card">
          <span className="summary-icon summary-icon-complete"><Check size={19} /></span>
          <div><strong>{awaitingCount}</strong><span>Awaiting homeowner</span></div>
        </div>
      </div>

      {error && <p className="feedback feedback-error" role="alert">{error}</p>}
      {loading ? (
        <div className="empty-workspace">Loading your repair history…</div>
      ) : (
        <>
          <section className="technician-repair-workspace">
            <div className="technician-repair-list-heading">
              <div>
                <span className="eyebrow">YOUR WORK</span>
                <h3>Repair activity</h3>
              </div>
              <span className="jobs-count">{visibleJobs.length} shown</span>
            </div>
            <div className="technician-repair-filters" role="group" aria-label="Filter repair activity">
              {([
                ["all", "All jobs", jobs.length],
                ["awaiting", "Awaiting review", awaitingCount],
                ["assigned", "Assigned", assignedCount],
                ["past", "Past work", pastCount],
              ] as const).map(([value, label, count]) => (
                <button
                  type="button"
                  className={filter === value ? "is-selected" : ""}
                  aria-pressed={filter === value}
                  key={value}
                  onClick={() => setFilter(value)}
                >
                  {label} <span>{count}</span>
                </button>
              ))}
            </div>

            {jobs.length === 0 ? (
              <div className="empty-workspace repairs-empty">
                <span className="empty-icon"><BriefcaseBusiness size={22} /></span>
                <strong>No repair jobs yet</strong>
                <span>When you send a proposal or are assigned a job, it will appear here.</span>
                {hasActiveTechnicianProfile && (
                  <button
                    className="button button-primary button-small"
                    type="button"
                    onClick={onFindJobs}
                  >
                    Browse open jobs <ArrowRight size={15} />
                  </button>
                )}
              </div>
            ) : visibleJobs.length === 0 ? (
              <div className="empty-workspace repairs-empty">
                <strong>No jobs in this view</strong>
                <span>Choose another filter to see more of your work history.</span>
              </div>
            ) : (
              <div className="job-list repairs-job-list">
                {visibleJobs.map((job) => (
                  <article className="job-card technician-repair-card" key={job.id}>
                    <div className="job-card-top">
                      <div className="job-card-title">
                        <span className={`status-pill status-${job.status}`}>
                          <span />
                          {job.status === "assigned"
                            ? "Assigned to you"
                            : job.status === "open"
                              ? job.applicationRequestType === "homeowner_request"
                                ? "Homeowner requested you"
                                : applicationLabel[job.applicationStatus ?? "pending"]
                              : job.status === "completed"
                                ? "Completed"
                                : "Closed"}
                        </span>
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
                    {job.status === "assigned" || job.status === "completed" ? (
                      <JobActions
                        job={job}
                        role="technician"
                        token={token}
                        onRefresh={refresh}
                      />
                    ) : (
                      <div className="application-sent-note">
                        {job.status === "open" && job.applicationStatus === "pending"
                          ? "Your proposal is with the homeowner for review."
                          : job.applicationStatus === "cancelled"
                            ? hasActiveTechnicianProfile
                              ? "This job was reopened. You can apply again from Find a job."
                              : "This job was reopened. Reactivate your profile before applying again."
                            : job.applicationStatus === "declined"
                              ? "The homeowner selected another proposal."
                              : "This job is kept in your repair history."}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
          <div className="technician-repairs-footer">
            <span>{completedCount} completed jobs</span>
            <span>Welcome back, {user.fullName.split(" ")[0]}.</span>
          </div>
        </>
      )}
    </div>
  );
}

function isPastJob(job: Job): boolean {
  return (
    job.status === "completed" ||
    job.status === "closed" ||
    job.applicationStatus === "declined" ||
    job.applicationStatus === "cancelled"
  );
}

function formatGovernorate(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
