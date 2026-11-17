import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  apiRequest,
  type ApiEnvelope,
  type Governorate,
  type Job,
  type ServiceItem,
  type TechnicianListing,
} from "../api";
import TechnicianAvatar from "./TechnicianAvatar";

interface FindProPageProps {
  token: string;
  onPostRepair: () => void;
}

export default function FindProPage({ token, onPostRepair }: FindProPageProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [technicians, setTechnicians] = useState<TechnicianListing[]>([]);
  const [selectedTechnician, setSelectedTechnician] =
    useState<TechnicianListing | null>(null);
  const [requestJob, setRequestJob] = useState<Job | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestedTechnicianId, setRequestedTechnicianId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const savedJobId = window.sessionStorage.getItem(
      "homemaintain-find-pro-job-id",
    );
    Promise.all([
      apiRequest<ApiEnvelope<ServiceItem[]>>("/services", token),
      apiRequest<ApiEnvelope<Governorate[]>>("/governorates", token),
      savedJobId
        ? apiRequest<ApiEnvelope<Job>>(
            `/jobs/${encodeURIComponent(savedJobId)}`,
            token,
          ).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([serviceResponse, governorateResponse, savedJobResponse]) => {
        if (!active) return;
        setServices(serviceResponse.data);
        setGovernorates(governorateResponse.data);
        const job = savedJobResponse?.data.status === "open"
          ? savedJobResponse.data
          : null;
        if (!job) {
          window.sessionStorage.removeItem("homemaintain-find-pro-job-id");
        }
        setRequestJob(job);
        setServiceId(job?.service.id ?? serviceResponse.data[0]?.id ?? "");
        setLocation(job?.location ?? governorateResponse.data[0]?.id ?? "");
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load service and location options.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!serviceId || !location) return;
    let active = true;
    setLoadingResults(true);
    setError("");
    setSelectedTechnician(null);
    apiRequest<ApiEnvelope<TechnicianListing[]>>(
      `/technicians?serviceId=${encodeURIComponent(serviceId)}&location=${encodeURIComponent(location)}`,
      token,
    )
      .then(({ data }) => {
        if (active) setTechnicians(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setTechnicians([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load available technicians.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingResults(false);
      });
    return () => {
      active = false;
    };
  }, [location, serviceId, token]);

  const visibleTechnicians = technicians.filter((technician) =>
    `${technician.displayName} ${technician.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const selectedIsVisible = visibleTechnicians.some(
    (technician) => technician.id === selectedTechnician?.id,
  );

  const requestTechnician = async (technician: TechnicianListing) => {
    if (!requestJob) return;
    setSendingRequest(true);
    setError("");
    try {
      await apiRequest(`/jobs/${encodeURIComponent(requestJob.id)}/applications`, token, {
        method: "POST",
        body: {
          technicianProfileId: technician.id,
          proposalMessage: `I would like to request your help with “${requestJob.title}”.`,
        },
      });
      window.sessionStorage.removeItem("homemaintain-find-pro-job-id");
      setRequestedTechnicianId(technician.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send this request.",
      );
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="workspace-content find-pro-page">
      <div className="find-pro-heading">
        <div>
          <span className="eyebrow">LOCAL PROFESSIONALS</span>
          <h2>Find the right pro for your home.</h2>
          <p>Choose a service and governorate to see technicians working nearby.</p>
          {requestJob && (
            <p className="feedback feedback-success" role="status">
              Showing technicians for “{requestJob.title}”. Choose a profile to send a job request.
            </p>
          )}
        </div>
        <div className="find-pro-trust-note">
          <ShieldCheck size={18} />
          <span>Compare profiles, then post a repair to receive a proposal.</span>
        </div>
      </div>

      <div className="find-pro-toolbar">
        <label className="find-pro-filter">
          Service
          <select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            disabled={loadingOptions || Boolean(requestJob)}
          >
            {services.map((service) => (
              <option value={service.id} key={service.id}>{service.name}</option>
            ))}
          </select>
        </label>
        <label className="find-pro-filter">
          Governorate
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={loadingOptions || Boolean(requestJob)}
          >
            {governorates.map((governorate) => (
              <option value={governorate.id} key={governorate.id}>
                {governorate.name}
              </option>
            ))}
          </select>
        </label>
        <label className="search-field">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search technicians"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {error && <p className="feedback feedback-error" role="alert">{error}</p>}

      <div className="find-pro-layout">
        <section className="technician-results">
          <div className="jobs-heading">
            <div>
              <span className="eyebrow">
                {loadingOptions
                  ? "LOADING FILTERS"
                  : `${services.find((service) => service.id === serviceId)?.name ?? "SERVICE"} · ${formatGovernorate(location)}`}
              </span>
              <h3>Professionals in your area</h3>
            </div>
            <span className="jobs-count">
              {loadingResults ? "Searching…" : `${visibleTechnicians.length} ${visibleTechnicians.length === 1 ? "pro" : "pros"}`}
            </span>
          </div>
          {loadingResults ? (
            <div className="empty-workspace">Searching matching service areas…</div>
          ) : visibleTechnicians.length === 0 ? (
            <div className="empty-workspace">
              <span className="empty-icon"><UserRound size={22} /></span>
              <strong>No technicians found in this area</strong>
              <span>Try a different service or governorate, or post a repair for professionals to find.</span>
              <button
                className="button button-primary button-small"
                type="button"
                onClick={onPostRepair}
              >
                Post a repair <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="technician-list">
              {visibleTechnicians.map((technician, index) => {
                const isSelected = selectedTechnician?.id === technician.id;
                return (
                  <article
                    className={`technician-result-card ${isSelected ? "is-selected" : ""}`}
                    key={technician.id}
                  >
                    <TechnicianAvatar
                      name={technician.displayName}
                      photoDataUrl={technician.photoDataUrl}
                      className={`avatar-tone-${index % 4}`}
                    />
                    <div className="technician-result-copy">
                      <div className="technician-result-name">
                        <h4>{technician.displayName}</h4>
                        <span><BadgeCheck size={14} /> Active profile</span>
                      </div>
                      <p>{technician.description}</p>
                      <div className="job-meta">
                        <span><MapPin size={14} /> {formatGovernorate(location)}</span>
                        <span>{technician.service.name}</span>
                      </div>
                      <div className="technician-rating-summary">
                        {technician.ratings.average === null
                          ? "No ratings yet"
                          : `★ ${technician.ratings.average} · ${technician.ratings.count} ${technician.ratings.count === 1 ? "rating" : "ratings"}`}
                      </div>
                    </div>
                    <button
                      className="button button-outline button-small"
                      type="button"
                      onClick={() =>
                        setSelectedTechnician(isSelected ? null : technician)
                      }
                    >
                      {isSelected ? "Selected" : "View profile"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="pro-detail-panel">
          {selectedTechnician && selectedIsVisible ? (
            <>
              <span className="eyebrow">TECHNICIAN PROFILE</span>
              <div className="pro-detail-person">
                <TechnicianAvatar
                  name={selectedTechnician.displayName}
                  photoDataUrl={selectedTechnician.photoDataUrl}
                  className="avatar-tone-2"
                />
                <div>
                  <h3>{selectedTechnician.displayName}</h3>
                  <span><BadgeCheck size={14} /> Active in {formatGovernorate(location)}</span>
                </div>
              </div>
              <p className="pro-detail-description">{selectedTechnician.description}</p>
              <div className="pro-detail-offering">
                <strong>Service area</strong>
                <span>{selectedTechnician.service.name} · {formatGovernorate(location)}</span>
              </div>
              <div className="technician-rating-summary">
                {selectedTechnician.ratings.average === null
                  ? "No ratings yet"
                  : `★ ${selectedTechnician.ratings.average} average from ${selectedTechnician.ratings.count} completed jobs`}
              </div>
              <div className="pro-detail-info">
                <ShieldCheck size={17} />
                <p>
                  HomeMaintain requests are sent to this technician for review.
                </p>
              </div>
              <button
                className="button button-primary button-wide"
                type="button"
                onClick={() =>
                  requestJob
                    ? void requestTechnician(selectedTechnician)
                    : onPostRepair()
                }
                disabled={sendingRequest || requestedTechnicianId === selectedTechnician.id}
              >
                {requestJob
                  ? requestedTechnicianId === selectedTechnician.id
                    ? "Request sent"
                    : sendingRequest
                      ? "Sending request…"
                      : "Request this technician"
                  : "Post a repair request"} <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="pro-detail-empty">
              <span className="workspace-card-icon"><UserRound size={21} /></span>
              <h3>Choose a professional</h3>
              <p>Select a profile to review service details{requestJob ? " and request help with your repair" : " and continue to a repair request"}.</p>
              <div className="pro-detail-info">
                <ShieldCheck size={17} />
                <p>{requestJob ? "Send a request for this open job; the technician can accept or decline." : "Choose a professional before creating a repair job."}</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}


function formatGovernorate(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
