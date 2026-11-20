import { useEffect, useState, type FormEvent } from "react";
import {
  KeyRound,
  Mail,
  Plus,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import {
  apiRequest,
  type Account,
  type ApiEnvelope,
  type Governorate,
  type ServiceItem,
  type TechnicianProfile,
  type RatingSummary,
} from "../api";
import TechnicianAvatar from "./TechnicianAvatar";

interface ProfilePageProps {
  user: Account;
  token: string;
  onUserUpdate: (user: Account) => void;
  onTokenUpdate: (token: string) => void;
  onTechnicianProfileStatusChange: (active: boolean) => void;
}

interface TechnicianProfileForm {
  displayName: string;
  description: string;
  photoDataUrl: string | null;
  offerings: Record<string, string[]>;
}

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return [parts[0] ?? "", ""];
  return [parts.slice(0, -1).join(" "), parts.at(-1) ?? ""];
}

function emptyTechnicianForm(user: Account): TechnicianProfileForm {
  return {
    displayName: user.fullName,
    description: "",
    photoDataUrl: null,
    offerings: {},
  };
}

export default function ProfilePage({
  user,
  token,
  onUserUpdate,
  onTokenUpdate,
  onTechnicianProfileStatusChange,
}: ProfilePageProps) {
  const [firstName, lastName] = splitName(user.fullName);
  const [nameForm, setNameForm] = useState({ firstName, lastName });
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [technicianProfile, setTechnicianProfile] =
    useState<TechnicianProfile | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedGovernorateId, setSelectedGovernorateId] = useState("");
  const [technicianForm, setTechnicianForm] = useState<TechnicianProfileForm>(
    () => emptyTechnicianForm(user),
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [homeownerRatings, setHomeownerRatings] = useState<RatingSummary | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingTechnician, setSavingTechnician] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [technicianNotice, setTechnicianNotice] = useState("");
  const [accountError, setAccountError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [technicianError, setTechnicianError] = useState("");

  useEffect(() => {
    setNameForm({
      firstName: splitName(user.fullName)[0],
      lastName: splitName(user.fullName)[1],
    });
    setEmail(user.email);
  }, [user.email, user.fullName]);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const [serviceResult, governorateResult, profileResult, ratingResult] =
        await Promise.allSettled([
          apiRequest<ApiEnvelope<ServiceItem[]>>("/services", token),
          apiRequest<ApiEnvelope<Governorate[]>>("/governorates", token),
          apiRequest<ApiEnvelope<TechnicianProfile>>(
            "/technicians/me/profile",
            token,
          ),
          apiRequest<ApiEnvelope<RatingSummary>>("/users/me/ratings", token),
        ]);
      if (!active) return;

      if (serviceResult.status === "fulfilled") {
        setServices(serviceResult.value.data);
        setSelectedServiceId((current) => current || serviceResult.value.data[0]?.id || "");
      } else {
        setTechnicianError(errorMessage(serviceResult.reason));
      }
      if (governorateResult.status === "fulfilled") {
        setGovernorates(governorateResult.value.data);
        setSelectedGovernorateId(
          (current) => current || governorateResult.value.data[0]?.id || "",
        );
      } else {
        setTechnicianError(errorMessage(governorateResult.reason));
      }
      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value.data;
        setTechnicianProfile(profile);
        setTechnicianForm({
          displayName: profile.displayName,
          description: profile.description,
          photoDataUrl: profile.photoDataUrl ?? null,
          offerings: Object.fromEntries(
            profile.offerings.map((offering) => [
              offering.service.id,
              offering.governorates,
            ]),
          ),
        });
        setSelectedServiceId(
          profile.offerings[0]?.service.id ??
            (serviceResult.status === "fulfilled"
              ? serviceResult.value.data[0]?.id ?? ""
              : ""),
        );
        setSelectedGovernorateId(
          profile.offerings[0]?.governorates[0] ??
            (governorateResult.status === "fulfilled"
              ? governorateResult.value.data[0]?.id ?? ""
              : ""),
        );
      } else if (
        profileResult.reason instanceof Error &&
        profileResult.reason.message === "Technician profile not found"
      ) {
        setTechnicianProfile(null);
        setTechnicianForm(emptyTechnicianForm(user));
        if (serviceResult.status === "fulfilled") {
          setSelectedServiceId(serviceResult.value.data[0]?.id ?? "");
        }
        if (governorateResult.status === "fulfilled") {
          setSelectedGovernorateId(governorateResult.value.data[0]?.id ?? "");
        }
      } else {
        setTechnicianError(errorMessage(profileResult.reason));
      }
      if (user.role === "homeowner" && ratingResult.status === "fulfilled") {
        setHomeownerRatings(ratingResult.value.data);
      }
      setLoadingProfile(false);
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [token, user]);

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAccount(true);
    setAccountError("");
    setAccountNotice("");
    try {
      const { user: updatedUser } = await apiRequest<{ user: Account }>(
        "/users/me",
        token,
        {
          method: "PATCH",
          body: {
            firstName: nameForm.firstName.trim(),
            lastName: nameForm.lastName.trim(),
          },
        },
      );
      onUserUpdate(updatedUser);
      setAccountNotice("Your name was updated.");
    } catch (requestError) {
      setAccountError(errorMessage(requestError));
    } finally {
      setSavingAccount(false);
    }
  };

  const saveEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAccount(true);
    setAccountError("");
    setAccountNotice("");
    try {
      await apiRequest("/users/me/email", token, {
        method: "PATCH",
        body: { email: email.trim() },
      });
      onUserUpdate({ ...user, email: email.trim().toLowerCase() });
      setAccountNotice("Your email address was updated.");
    } catch (requestError) {
      setAccountError(errorMessage(requestError));
    } finally {
      setSavingAccount(false);
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError("");
    setPasswordNotice("");
    try {
      await apiRequest("/users/me/password", token, {
        method: "PATCH",
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordNotice("Your password was updated.");
    } catch (requestError) {
      setPasswordError(errorMessage(requestError));
    } finally {
      setSavingPassword(false);
    }
  };

  const addOffering = () => {
    if (!selectedServiceId || !selectedGovernorateId) {
      setTechnicianError("Choose a service and a governorate first.");
      return;
    }

    if (
      (technicianForm.offerings[selectedServiceId] ?? []).includes(
        selectedGovernorateId,
      )
    ) {
      setTechnicianError("That service area is already on your profile.");
      return;
    }

    setTechnicianError("");
    setTechnicianForm((current) => {
      const selectedAreas = current.offerings[selectedServiceId] ?? [];
      return {
        ...current,
        offerings: {
          ...current.offerings,
          [selectedServiceId]: [...selectedAreas, selectedGovernorateId],
        },
      };
    });
  };

  const removeOffering = (serviceId: string, governorateId: string) => {
    setTechnicianForm((current) => {
      const remainingAreas = (current.offerings[serviceId] ?? []).filter(
        (area) => area !== governorateId,
      );
      const offerings = { ...current.offerings };
      if (remainingAreas.length) offerings[serviceId] = remainingAreas;
      else delete offerings[serviceId];
      return { ...current, offerings };
    });
  };

  const chooseProfilePhoto = async (file: File | undefined) => {
    if (!file) return;
    setTechnicianError("");
    try {
      const photoDataUrl = await compressProfilePhoto(file);
      setTechnicianForm((current) => ({ ...current, photoDataUrl }));
    } catch (requestError) {
      setTechnicianError(errorMessage(requestError));
    }
  };

  const saveTechnicianProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const offerings = Object.entries(technicianForm.offerings).filter(
      ([, areas]) => areas.length > 0,
    );
    if (offerings.length === 0) {
      setTechnicianError("Choose at least one service and one governorate.");
      return;
    }
    setSavingTechnician(true);
    setTechnicianError("");
    setTechnicianNotice("");
    try {
      const response = await apiRequest<
        ApiEnvelope<TechnicianProfile> & { token: string; user: Account }
      >(
        "/technicians/me/profile",
        token,
        {
          method: "PUT",
          body: {
            displayName: technicianForm.displayName,
            description: technicianForm.description,
            photoDataUrl: technicianForm.photoDataUrl,
            active: technicianProfile?.active ?? true,
            offerings: offerings.map(([serviceId, areas]) => ({
              serviceId,
              governorates: areas,
            })),
          },
        },
      );
      setTechnicianProfile(response.data);
      onUserUpdate(response.user);
      onTokenUpdate(response.token);
      onTechnicianProfileStatusChange(response.data.active);
      setTechnicianNotice("Your professional profile was saved.");
    } catch (requestError) {
      setTechnicianError(errorMessage(requestError));
    } finally {
      setSavingTechnician(false);
    }
  };

  const setTechnicianActive = async (active: boolean) => {
    if (!technicianProfile) return;
    if (!active && !window.confirm("Deactivate your professional profile? Your job history will remain saved.")) {
      return;
    }
    setSavingTechnician(true);
    setTechnicianError("");
    setTechnicianNotice("");
    try {
      if (active) {
        const offerings = technicianProfile.offerings.map((offering) => ({
          serviceId: offering.service.id,
          governorates: offering.governorates,
        }));
        const { data } = await apiRequest<ApiEnvelope<TechnicianProfile>>(
          "/technicians/me/profile",
          token,
          {
            method: "PUT",
            body: {
              displayName: technicianProfile.displayName,
              description: technicianProfile.description,
              photoDataUrl: technicianProfile.photoDataUrl ?? null,
              active: true,
              offerings,
            },
          },
        );
        setTechnicianProfile(data);
        onTechnicianProfileStatusChange(data.active);
        setTechnicianNotice("Your professional profile is active again.");
      } else {
        await apiRequest("/technicians/me/profile", token, {
          method: "DELETE",
        });
        setTechnicianProfile({ ...technicianProfile, active: false });
        onTechnicianProfileStatusChange(false);
        setTechnicianNotice("Your profile is deactivated; your repair history remains available.");
      }
    } catch (requestError) {
      setTechnicianError(errorMessage(requestError));
    } finally {
      setSavingTechnician(false);
    }
  };

  return (
    <div className="workspace-content profile-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">PROFILE MANAGEMENT</span>
          <h2>Your account, your details.</h2>
          <p>Update your account information and sign-in security.</p>
        </div>
        <span className="profile-large-avatar">{getInitials(user.fullName)}</span>
      </div>

      <div
        className={`profile-page-grid ${
          user.role === "technician" ? "technician-profile-grid" : "homeowner-profile-grid"
        }`}
      >
        <div className="profile-settings-column">
          <section className="profile-settings-card">
            <div className="profile-section-heading">
              <span className="workspace-card-icon"><UserRound size={20} /></span>
              <div><h3>Personal details</h3><p>Change the name shown on your account.</p></div>
            </div>
            <form className="form-stack" onSubmit={saveAccount}>
              <div className="form-row">
                <label>
                  First name
                  <input
                    required
                    minLength={2}
                    maxLength={50}
                    value={nameForm.firstName}
                    onChange={(event) => setNameForm({ ...nameForm, firstName: event.target.value })}
                  />
                </label>
                <label>
                  Last name
                  <input
                    required
                    minLength={2}
                    maxLength={50}
                    value={nameForm.lastName}
                    onChange={(event) => setNameForm({ ...nameForm, lastName: event.target.value })}
                  />
                </label>
              </div>
              <button className="button button-primary button-small" disabled={savingAccount}>
                Save name
              </button>
            </form>
            {accountNotice && <p className="feedback feedback-success">{accountNotice}</p>}
            {accountError && <p className="feedback feedback-error" role="alert">{accountError}</p>}
          </section>

          <section className="profile-settings-card">
            <div className="profile-section-heading">
              <span className="workspace-card-icon"><Mail size={20} /></span>
              <div><h3>Email address</h3><p>Used for signing in to HomeMaintain.</p></div>
            </div>
            <form className="form-stack" onSubmit={saveEmail}>
              <label>
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                className={`button ${
                  user.role === "technician" ? "button-primary" : "button-outline"
                } button-small`}
                disabled={savingAccount}
              >
                Update email
              </button>
            </form>
          </section>

          <section className="profile-settings-card">
            <div className="profile-section-heading">
              <span className="workspace-card-icon"><KeyRound size={20} /></span>
              <div><h3>Password and security</h3><p>Choose a strong password you don’t use elsewhere.</p></div>
            </div>
            <form className="form-stack" onSubmit={savePassword}>
              <label>
                Current password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <span className="form-hint">
                Use 8–72 characters with uppercase, lowercase, a number, and a special character.
              </span>
              <button className="button button-primary button-small" disabled={savingPassword}>
                Update password
              </button>
            </form>
            {passwordNotice && <p className="feedback feedback-success">{passwordNotice}</p>}
            {passwordError && <p className="feedback feedback-error" role="alert">{passwordError}</p>}
          </section>
        </div>

        {homeownerRatings && (
          <section className="profile-settings-card">
            <div className="profile-section-heading">
              <span className="workspace-card-icon"><UserRound size={20} /></span>
              <div>
                <h3>Homeowner ratings</h3>
                <p>Ratings technicians have left after completed jobs.</p>
              </div>
            </div>
            <p className="profile-rating-summary">
              {homeownerRatings.average === null
                ? "No ratings yet"
                : `★ ${homeownerRatings.average} average · ${homeownerRatings.count} ${homeownerRatings.count === 1 ? "rating" : "ratings"}`}
            </p>
          </section>
        )}

        {user.role !== "admin" && (
          <section className="profile-settings-card technician-profile-settings">
            <div className="profile-section-heading">
              <span className="workspace-card-icon"><ShieldAlert size={20} /></span>
              <div>
                <h3>Professional profile</h3>
                <p>Set up the services and areas homeowners can find you for.</p>
              </div>
              {technicianProfile && (
                <span className={technicianProfile.active ? "profile-active-pill" : "profile-inactive-pill"}>
                  {technicianProfile.active ? "Active" : "Inactive"}
                </span>
              )}
            </div>
            {loadingProfile ? (
              <p className="form-hint">Loading technician profile…</p>
            ) : (
              <>
                <form className="form-stack profile-form" onSubmit={saveTechnicianProfile}>
                  <label>
                    Display name
                    <input
                      required
                      minLength={2}
                      maxLength={50}
                      value={technicianForm.displayName}
                      onChange={(event) =>
                        setTechnicianForm({ ...technicianForm, displayName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    About your work
                    <textarea
                      required
                      minLength={2}
                      maxLength={2000}
                      rows={4}
                      value={technicianForm.description}
                      onChange={(event) =>
                        setTechnicianForm({ ...technicianForm, description: event.target.value })
                      }
                    />
                  </label>
                  <div className="technician-photo-editor">
                    <TechnicianAvatar
                      name={technicianForm.displayName}
                      photoDataUrl={technicianForm.photoDataUrl ?? undefined}
                    />
                    <div className="technician-photo-copy">
                      <strong>Profile photo</strong>
                      <span>Choose a JPEG, PNG, or WebP image. It will be resized before saving.</span>
                    </div>
                    <label className="button button-outline button-small photo-upload-button">
                      Choose photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void chooseProfilePhoto(file);
                        }}
                      />
                    </label>
                    {technicianForm.photoDataUrl && (
                      <button
                        className="text-button photo-remove-button"
                        type="button"
                        onClick={() =>
                          setTechnicianForm((current) => ({
                            ...current,
                            photoDataUrl: null,
                          }))
                        }
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                  <fieldset className="technician-offering-picker">
                    <legend>Services and service areas</legend>
                    <div className="technician-offering-selects">
                      <label>
                        Service category
                        <select
                          required
                          value={selectedServiceId}
                          onChange={(event) =>
                            setSelectedServiceId(event.target.value)
                          }
                        >
                          {services.map((service) => (
                            <option value={service.id} key={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Service location
                        <select
                          required
                          value={selectedGovernorateId}
                          onChange={(event) =>
                            setSelectedGovernorateId(event.target.value)
                          }
                        >
                          {governorates.map((governorate) => (
                            <option value={governorate.id} key={governorate.id}>
                              {governorate.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      className="button button-outline button-small"
                      type="button"
                      disabled={!services.length || !governorates.length}
                      onClick={addOffering}
                    >
                      <Plus size={14} /> Add service area
                    </button>
                    <div className="technician-offering-list">
                      {Object.entries(technicianForm.offerings).flatMap(
                        ([serviceId, areaIds]) =>
                          areaIds.map((governorateId) => {
                            const serviceName =
                              services.find((service) => service.id === serviceId)
                                ?.name ?? "Service";
                            const governorateName =
                              governorates.find(
                                (governorate) => governorate.id === governorateId,
                              )?.name ?? governorateId;
                            return (
                              <span
                                className="technician-offering-chip"
                                key={`${serviceId}-${governorateId}`}
                              >
                                {serviceName} · {governorateName}
                                <button
                                  type="button"
                                  aria-label={`Remove ${serviceName} in ${governorateName}`}
                                  onClick={() =>
                                    removeOffering(serviceId, governorateId)
                                  }
                                >
                                  <X size={13} />
                                </button>
                              </span>
                            );
                          }),
                      )}
                    </div>
                    <p className="form-hint">
                      Add every service and governorate where you accept work.
                    </p>
                  </fieldset>
                  <button className="button button-primary button-wide" disabled={savingTechnician}>
                    Save professional profile
                  </button>
                </form>
                {technicianProfile && (
                  <button
                    className={`button ${technicianProfile.active ? "button-danger-quiet" : "button-outline"} button-wide profile-status-action`}
                    type="button"
                    disabled={savingTechnician}
                    onClick={() => void setTechnicianActive(!technicianProfile.active)}
                  >
                    {technicianProfile.active ? "Deactivate profile" : "Reactivate profile"}
                  </button>
                )}
                {technicianProfile && (
                  <p className="profile-rating-summary">
                    {technicianProfile.ratings.average === null
                      ? "No technician ratings yet"
                      : `★ ${technicianProfile.ratings.average} average · ${technicianProfile.ratings.count} ${technicianProfile.ratings.count === 1 ? "rating" : "ratings"}`}
                  </p>
                )}
              </>
            )}
            {technicianNotice && <p className="feedback feedback-success">{technicianNotice}</p>}
            {technicianError && <p className="feedback feedback-error" role="alert">{technicianError}</p>}
          </section>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

async function compressProfilePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loadedImage = new Image();
      loadedImage.onload = () => resolve(loadedImage);
      loadedImage.onerror = () => reject(new Error("Could not read this image."));
      loadedImage.src = objectUrl;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error("This image has no usable dimensions.");

    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the profile photo.");

    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const photoDataUrl = canvas.toDataURL("image/webp", 0.72);
    if (photoDataUrl.length > 75_000) {
      throw new Error("This photo could not be compressed enough. Choose another image.");
    }
    return photoDataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
