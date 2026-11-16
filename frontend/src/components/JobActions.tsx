import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Star,
} from "lucide-react";
import {
  apiRequest,
  getTunisiaToday,
  type AccountRole,
  type ApiEnvelope,
  type AvailableSlot,
  type Job,
  type JobSlot,
} from "../api";
import TechnicianAvatar from "./TechnicianAvatar";

interface JobActionsProps {
  job: Job;
  role: AccountRole;
  token: string;
  onRefresh: () => void;
  onCancel?: () => void;
}

interface Availability {
  date: string;
  slots: AvailableSlot[];
}

export default function JobActions({
  job,
  role,
  token,
  onRefresh,
  onCancel,
}: JobActionsProps) {
  const [date, setDate] = useState(job.scheduledDate ?? getTunisiaToday());
  const [selectedSlot, setSelectedSlot] = useState<JobSlot | "">(
    job.scheduledSlot ?? "",
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(5);

  useEffect(() => {
    setDate(job.scheduledDate ?? getTunisiaToday());
    setSelectedSlot(job.scheduledSlot ?? "");
  }, [job.scheduledDate, job.scheduledSlot]);

  useEffect(() => {
    if (job.status !== "assigned" || !date) return;

    let active = true;
    setError("");
    apiRequest<ApiEnvelope<Availability>>(
      `/jobs/${encodeURIComponent(job.id)}/availability?date=${encodeURIComponent(date)}`,
      token,
    )
      .then(({ data }) => {
        if (active) {
          setSlots(data.slots);
          setSelectedSlot((current) =>
            data.slots.some((slot) => slot.id === current) ? current : "",
          );
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setSlots([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load time slots.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [date, job.id, job.status, token]);

  const schedule = async () => {
    if (!selectedSlot) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/jobs/${encodeURIComponent(job.id)}/schedule`, token, {
        method: "PATCH",
        body: { date, slot: selectedSlot },
      });
      setFeedback("Intervention time saved.");
      onRefresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save this time.",
      );
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/jobs/${encodeURIComponent(job.id)}/complete`, token, {
        method: "PATCH",
      });
      setFeedback("Job marked complete.");
      onRefresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not complete this job.",
      );
    } finally {
      setBusy(false);
    }
  };

  const rate = async () => {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/jobs/${encodeURIComponent(job.id)}/ratings`, token, {
        method: "POST",
        body: { score },
      });
      setFeedback("Your rating has been saved.");
      onRefresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not submit your rating.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (job.status === "assigned") {
    return (
      <div className="job-actions">
        <div className="job-action-heading">
          <CalendarDays size={18} />
          <div>
            <strong>{job.scheduledDate ? "Scheduled intervention" : "Plan the intervention"}</strong>
            <span>
              {job.scheduledDate && job.scheduledSlot
                ? `${formatScheduledDate(job.scheduledDate)} · ${job.scheduledSlot === "morning" ? "8:00 AM–12:00 PM" : "1:00 PM–5:00 PM"}`
                : "Choose a date and a four-hour time slot."}
            </span>
          </div>
        </div>
        {role === "homeowner" && job.scheduledDate && job.assignedTechnician && (
          <div className="scheduled-technician">
            <TechnicianAvatar
              name={job.assignedTechnician.displayName}
              photoDataUrl={job.assignedTechnician.photoDataUrl}
              className="scheduled-technician-avatar"
            />
            <span>
              <small>YOUR TECHNICIAN</small>
              <strong>{job.assignedTechnician.displayName}</strong>
            </span>
          </div>
        )}
        <div className="schedule-controls">
          <label>
            Date
            <input
              type="date"
              min={getTunisiaToday()}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSelectedSlot("");
              }}
            />
          </label>
          <div className="slot-options" role="group" aria-label="Available time slots">
            {slots.length > 0 ? (
              slots.map((slot) => (
                <button
                  type="button"
                  className={`slot-option ${selectedSlot === slot.id ? "is-selected" : ""}`}
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                >
                  <Clock3 size={16} />
                  {slot.label}
                </button>
              ))
            ) : (
              <span className="empty-slots">
                {error ? "Availability could not be loaded." : "No available slots for this date."}
              </span>
            )}
          </div>
        </div>
        <div className="job-action-footer">
          <span className="form-hint">Times are shown in Tunisia local time.</span>
          <div className="scheduled-action-buttons">
            <button
              className="button button-primary button-small"
              type="button"
              onClick={schedule}
              disabled={busy || !selectedSlot}
            >
              {busy ? "Saving…" : job.scheduledDate ? "Reschedule" : "Reserve time"}
            </button>
            {role === "homeowner" && onCancel && (
              <button
                className="button button-outline button-small"
                type="button"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        {role === "technician" && (
          <div className="complete-job-row">
            <span>Finished the work?</span>
            <button
              className="button button-outline button-small"
              type="button"
              onClick={complete}
              disabled={busy}
            >
              <CheckCircle2 size={16} /> Mark complete
            </button>
          </div>
        )}
        {feedback && <p className="feedback feedback-success">{feedback}</p>}
        {error && <p className="feedback feedback-error" role="alert">{error}</p>}
      </div>
    );
  }

  function formatScheduledDate(value: string): string {
    const date = new Date(`${value}T00:00:00.000Z`);
    return new Intl.DateTimeFormat("en-TN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }


  if (job.status === "completed") {
    const alreadyRated =
      role === "homeowner"
        ? job.ratings?.homeowner !== undefined
        : job.ratings?.technician !== undefined;
    const recipient =
      role === "homeowner" ? "the technician’s service" : "the homeowner";

    return (
      <div className="job-actions completed-actions">
        <div className="job-action-heading">
          <CheckCircle2 size={18} />
          <div>
            <strong>Job complete</strong>
            <span>Share a quick rating for {recipient}.</span>
          </div>
        </div>
        {alreadyRated ? (
          <p className="feedback feedback-success">
            <Star size={15} fill="currentColor" /> Your rating:{" "}
            {role === "homeowner"
              ? job.ratings?.homeowner
              : job.ratings?.technician}{" "}
            / 5
          </p>
        ) : (
          <div className="rating-row">
            <label>
              Your rating
              <select
                value={score}
                onChange={(event) => setScore(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option value={value} key={value}>
                    {value} {value === 1 ? "star" : "stars"}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-primary button-small"
              type="button"
              onClick={rate}
              disabled={busy}
            >
              {busy ? "Saving…" : "Submit rating"}
            </button>
          </div>
        )}
        {feedback && <p className="feedback feedback-success">{feedback}</p>}
        {error && <p className="feedback feedback-error" role="alert">{error}</p>}
      </div>
    );
  }

  return null;
}
