import { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  Search,
  Wrench,
} from "lucide-react";
import {
  apiRequest,
  type Account,
  type ApiEnvelope,
  type Job,
} from "../api";
import type { AppPage } from "../navigation";
import { KitchenIllustration } from "./HomeMaintainArt";

interface PersonalSpacePageProps {
  user: Account;
  token: string;
  hasActiveTechnicianProfile: boolean;
  onNavigate: (page: AppPage) => void;
}

export default function PersonalSpacePage({
  user,
  token,
  hasActiveTechnicianProfile,
  onNavigate,
}: PersonalSpacePageProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [respondingTo, setRespondingTo] = useState("");
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<ApiEnvelope<Job[]>>("/jobs/mine", token),
      hasActiveTechnicianProfile
        ? apiRequest<ApiEnvelope<Job[]>>("/jobs?limit=3", token)
        : Promise.resolve({ data: [] as Job[] }),
    ])
      .then(([mineResponse, availableResponse]) => {
        if (!active) return;
        setJobs(mineResponse.data);
        setAvailableJobs(
          availableResponse.data.filter(
            (job) => job.reporter?.id !== user.id &&
              !mineResponse.data.some((mine) => mine.id === job.id),
          ),
        );
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load your overview.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasActiveTechnicianProfile, refreshVersion, token, user.id]);

  const respondToRequest = async (
    job: Job,
    decision: "accept" | "decline",
  ) => {
    if (!job.applicationId) return;
    setRespondingTo(job.id);
    setError("");
    try {
      await apiRequest(
        `/jobs/${encodeURIComponent(job.id)}/applications/${encodeURIComponent(job.applicationId)}`,
        token,
        { method: "PATCH", body: { decision } },
      );
      setRefreshVersion((version) => version + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update this job request.",
      );
    } finally {
      setRespondingTo("");
    }
  };

  const isHomeowner = user.role === "homeowner";
  const activeJobs = jobs.filter(
    (job) => job.status === "open" || job.status === "assigned",
  );
  const completedJobs = jobs.filter((job) => job.status === "completed");
  const overviewJobs = jobs;
  const incomingRequests = jobs.filter(
    (job) =>
      job.applicationRequestType === "homeowner_request" &&
      job.applicationStatus === "pending",
  );
  const currentJobs = jobs.filter((job) =>
    isHomeowner ? job.status === "open" || job.status === "assigned" : job.status === "assigned",
  );
  const heroSlides = [
    ...incomingRequests.map((job) => ({ kind: "pending" as const, job })),
    ...currentJobs.slice(0, 3).map((job) => ({ kind: "current" as const, job })),
    ...availableJobs.map((job) => ({ kind: "available" as const, job })),
  ];
  const activeHeroSlide = heroSlides[heroSlideIndex % Math.max(heroSlides.length, 1)];
  const firstName = user.fullName.trim().split(/\s+/)[0] || user.fullName;

  useEffect(() => {
    setHeroSlideIndex(0);
    if (heroSlides.length < 2) return;
    const timer = window.setInterval(() => {
      setHeroSlideIndex((index) => (index + 1) % heroSlides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="workspace-content overview-page">
      <header className="overview-heading">
        <div>
          <span className="eyebrow">YOUR HOMEMAINTAIN ACCOUNT</span>
          <h1>Overview</h1>
          <p>Welcome back, {firstName}.</p>
        </div>
        <button
          className="button button-primary button-small"
          type="button"
          onClick={() =>
            onNavigate(
              isHomeowner
                ? "my-repairs"
                : hasActiveTechnicianProfile
                  ? "find-job"
                  : "profile",
            )
          }
        >
          {isHomeowner || !hasActiveTechnicianProfile ? (
            <ClipboardPlus size={16} />
          ) : (
            <Search size={16} />
          )}
          {isHomeowner
            ? "Start a repair"
            : hasActiveTechnicianProfile
              ? "Find a job"
              : "Set up your technician profile"}
        </button>
      </header>

      {error && <p className="feedback feedback-error" role="alert">{error}</p>}

      <section className="overview-hero">
        <div className="overview-hero-copy">
          {activeHeroSlide ? (
            <>
              <span className="overview-hero-kicker">
                {activeHeroSlide.kind === "pending"
                  ? `PENDING JOB REQUEST${incomingRequests.length === 1 ? "" : "S"}`
                  : activeHeroSlide.kind === "current"
                    ? "CURRENT OPEN JOBS"
                    : "RECENT AVAILABLE JOBS"}
              </span>
              <h2>{activeHeroSlide.job.title}</h2>
              <p>
                {activeHeroSlide.job.service.name} · {activeHeroSlide.job.location}
                {activeHeroSlide.kind === "pending"
                  ? " · A homeowner is requesting your help."
                  : activeHeroSlide.kind === "available"
                    ? " · A new job is available in your area."
                    : ` · ${formatJobActivity(activeHeroSlide.job)}`}
              </p>
              {activeHeroSlide.kind === "pending" ? (
                <div className="application-actions overview-hero-actions">
                  <button
                    className="button button-primary button-small"
                    type="button"
                    disabled={respondingTo === activeHeroSlide.job.id}
                    onClick={() => void respondToRequest(activeHeroSlide.job, "accept")}
                  >
                    Accept
                  </button>
                  <button
                    className="button button-outline button-small"
                    type="button"
                    disabled={respondingTo === activeHeroSlide.job.id}
                    onClick={() => void respondToRequest(activeHeroSlide.job, "decline")}
                  >
                    Decline
                  </button>
                  <button
                    className="overview-hero-link"
                    type="button"
                    onClick={() => onNavigate("my-repairs")}
                  >
                    View all repairs <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <button
                  className="overview-hero-link"
                  type="button"
                  onClick={() =>
                    onNavigate(activeHeroSlide.kind === "available" ? "find-job" : "my-repairs")
                  }
                >
                  {activeHeroSlide.kind === "available" ? "Browse available jobs" : "View your repairs"}
                  <ArrowRight size={16} />
                </button>
              )}
              {heroSlides.length > 1 && (
                <div className="overview-hero-indicators" aria-label="Overview cards">
                  {heroSlides.map((slide, index) => (
                    <button
                      type="button"
                      key={`${slide.kind}-${slide.job.id}`}
                      className={index === heroSlideIndex ? "is-active" : ""}
                      aria-label={`Show ${slide.kind} job ${index + 1}`}
                      aria-current={index === heroSlideIndex ? "true" : undefined}
                      onClick={() => setHeroSlideIndex(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <span className="overview-hero-kicker">
                {isHomeowner ? "HOME CARE, MADE SIMPLE" : "YOUR WORKSPACE"}
              </span>
              <h2>{isHomeowner ? "Your home, in good hands." : "Your work, all in one place."}</h2>
              <p>
                {isHomeowner
                  ? "Keep track of repairs, find trusted local professionals, and take the next step when you’re ready."
                  : "Keep up with your proposals, find new local work, and manage your professional profile."}
              </p>
              <button
                className="overview-hero-link"
                type="button"
                onClick={() =>
                  onNavigate(
                    isHomeowner
                      ? "my-repairs"
                      : hasActiveTechnicianProfile
                        ? "find-job"
                        : "profile",
                  )
                }
              >
                {isHomeowner
                  ? "View your repairs"
                  : hasActiveTechnicianProfile
                    ? "Browse available jobs"
                    : "Create your technician profile"}
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
        <div className="overview-hero-art" aria-hidden="true">
          <KitchenIllustration />
          <span className="overview-art-caption">
            <Wrench size={15} /> A little care goes a long way
          </span>
        </div>
      </section>

      <section className="overview-summary" aria-label="Repair summary">
        <div className="overview-summary-heading">
          <div>
            <span className="eyebrow">YOUR ACTIVITY</span>
            <h2>At a glance</h2>
          </div>
          <button
            className="overview-text-link"
            type="button"
            onClick={() => onNavigate("my-repairs")}
          >
            All repairs <ArrowRight size={15} />
          </button>
        </div>
        <div className="overview-stat-grid">
          <div className="overview-stat-card">
            <span className="overview-stat-icon"><BriefcaseBusiness size={18} /></span>
            <div>
              <strong>{loading ? "—" : jobs.length}</strong>
              <span>{isHomeowner ? "Repairs and requests" : "Jobs in your account"}</span>
            </div>
          </div>
          <div className="overview-stat-card">
            <span className="overview-stat-icon overview-stat-icon-active"><CalendarDays size={18} /></span>
            <div>
              <strong>{loading ? "—" : activeJobs.length}</strong>
              <span>In progress</span>
            </div>
          </div>
          <div className="overview-stat-card">
            <span className="overview-stat-icon overview-stat-icon-complete"><CheckCircle2 size={18} /></span>
            <div>
              <strong>{loading ? "—" : completedJobs.length}</strong>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </section>

      <section className="overview-recent">
        <div className="overview-section-heading">
          <div>
            <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
            <h2>Recent repairs</h2>
          </div>
          <button
            className="overview-text-link"
            type="button"
            onClick={() => onNavigate("my-repairs")}
          >
            See all <ArrowRight size={15} />
          </button>
        </div>
        {loading ? (
          <div className="overview-empty">Loading your repair activity…</div>
        ) : overviewJobs.length === 0 ? (
          <div className="overview-empty overview-empty-card">
            <span className="overview-stat-icon"><BriefcaseBusiness size={18} /></span>
            <div>
              <strong>No repairs yet</strong>
              <p>
                {isHomeowner
                  ? "Start a repair whenever you need a hand around the house."
                  : "When you apply or are assigned to a job, it will appear here."}
              </p>
            </div>
            <button
              className="button button-outline button-small"
              type="button"
              onClick={() =>
                onNavigate(
                  isHomeowner
                    ? "my-repairs"
                    : hasActiveTechnicianProfile
                      ? "find-job"
                      : "profile",
                )
              }
            >
              {isHomeowner
                ? "Start a repair"
                : hasActiveTechnicianProfile
                  ? "Find a job"
                  : "Create a profile"} <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="overview-repair-list">
            {overviewJobs.slice(0, 3).map((job) => (
              <button
                type="button"
                className="overview-repair-row"
                key={job.id}
                onClick={() => onNavigate("my-repairs")}
              >
                <span className={`overview-status-dot overview-status-${job.status}`} />
                <span className="overview-repair-copy">
                  <strong>{job.title}</strong>
                  <small>{job.service.name} <span>·</span> {formatJobActivity(job)}</small>
                </span>
                {job.status === "assigned" && job.scheduledDate ? (
                  <span className="overview-repair-date">
                    <CalendarDays size={14} /> {formatDate(job.scheduledDate)}
                  </span>
                ) : null}
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="overview-shortcuts">
        <div className="overview-section-heading">
          <div>
            <span className="eyebrow">QUICK ACCESS</span>
            <h2>What would you like to do?</h2>
          </div>
        </div>
        <div className="overview-shortcut-grid">
          <button
            className="overview-shortcut-card"
            type="button"
            onClick={() =>
              onNavigate(
                isHomeowner
                  ? "find-pro"
                  : hasActiveTechnicianProfile
                    ? "find-job"
                    : "profile",
              )
            }
          >
            <span className="overview-stat-icon"><Search size={18} /></span>
            <span>
              <strong>
                {isHomeowner
                  ? "Find a pro"
                  : hasActiveTechnicianProfile
                    ? "Find a job"
                    : "Create a technician profile"}
              </strong>
              <small>
                {isHomeowner
                  ? "Explore local professionals by service and area."
                  : hasActiveTechnicianProfile
                    ? "Browse requests that match your skills."
                    : "Add your services and areas from profile management."}
              </small>
            </span>
            <ArrowRight size={16} />
          </button>
          <button
            className="overview-shortcut-card"
            type="button"
            onClick={() => onNavigate("rentals")}
          >
            <span className="overview-stat-icon"><Wrench size={18} /></span>
            <span>
              <strong>Equipment rentals</strong>
              <small>Browse tools or list equipment for rent.</small>
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

function formatStatus(status: Job["status"]): string {
  if (status === "open") return "Looking for a technician";
  if (status === "assigned") return "Technician assigned";
  if (status === "completed") return "Completed";
  return "Closed";
}

function formatJobActivity(job: Job): string {
  if (
    job.applicationRequestType === "homeowner_request" &&
    job.applicationStatus === "pending"
  ) {
    return "Pending job request";
  }
  if (job.applicationStatus === "pending") return "Proposal pending";
  return formatStatus(job.status);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-TN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
