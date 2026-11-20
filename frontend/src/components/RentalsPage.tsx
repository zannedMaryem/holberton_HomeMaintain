import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  RotateCcw,
  Wrench,
  X,
} from "lucide-react";
import {
  apiRequest,
  getTunisiaToday,
  type Account,
  type ApiEnvelope,
  type Governorate,
  type MyRentals,
  type RentalBooking,
  type RentalEquipment,
} from "../api";
import { RENTAL_EQUIPMENT_CATEGORIES } from "../rentalCategories";

interface RentalsPageProps {
  user: Account;
  token: string;
}

interface RentalForm {
  name: string;
  category: string;
  description: string;
  dailyPriceTnd: string;
  location: string;
}

interface Availability {
  availableDates: string[];
  unavailableDates: string[];
}

const emptyForm = (): RentalForm => ({
  name: "",
  category: "",
  description: "",
  dailyPriceTnd: "",
  location: "",
});

export default function RentalsPage({ user, token }: RentalsPageProps) {
  const [equipment, setEquipment] = useState<RentalEquipment[]>([]);
  const [myRentals, setMyRentals] = useState<MyRentals>({
    equipment: [],
    bookings: [],
  });
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(getTunisiaToday()),
  );
  const [availability, setAvailability] = useState<Availability>({
    availableDates: [],
    unavailableDates: [],
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reschedulingBookingId, setReschedulingBookingId] = useState("");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [form, setForm] = useState<RentalForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [equipmentResponse, myRentalsResponse, governorateResponse] =
        await Promise.all([
          apiRequest<ApiEnvelope<RentalEquipment[]>>("/rentals", token),
          apiRequest<ApiEnvelope<MyRentals>>("/rentals/mine", token),
          apiRequest<ApiEnvelope<Governorate[]>>("/governorates", token),
        ]);
      setEquipment(equipmentResponse.data);
      setMyRentals(myRentalsResponse.data);
      setGovernorates(governorateResponse.data);
      setSelectedId((current) =>
        equipmentResponse.data.some((item) => item.id === current)
          ? current
          : equipmentResponse.data[0]?.id ?? "",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load rental equipment.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleEquipment = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return equipment.filter((item) => {
      const matchesLocation =
        locationFilter === "all" || item.location === locationFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${item.name} ${item.category} ${item.description} ${item.location}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesLocation && matchesSearch;
    });
  }, [equipment, locationFilter, search]);

  const selectedEquipment =
    equipment.find((item) => item.id === selectedId) ?? null;
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const currentWeek = startOfWeek(getTunisiaToday());
  const maxWeek = startOfWeek(addDays(getTunisiaToday(), 84));
  const unavailableDates = new Set(availability.unavailableDates);
  const availableDates = new Set(availability.availableDates);
  const reschedulingBooking = myRentals.bookings.find(
    (item) => item.id === reschedulingBookingId,
  );
  const selectedTotal = selectedEquipment
    ? selectedDates.length *
      (reschedulingBooking?.dailyPriceTnd ?? selectedEquipment.dailyPriceTnd)
    : 0;

  useEffect(() => {
    if (!selectedEquipment) {
      setAvailability({ availableDates: [], unavailableDates: [] });
      return;
    }

    let active = true;
    setAvailabilityLoading(true);
    const from = weekDates[0] < getTunisiaToday()
      ? getTunisiaToday()
      : weekDates[0];
    const to = weekDates[weekDates.length - 1];
    const bookingQuery = reschedulingBookingId
      ? `&bookingId=${encodeURIComponent(reschedulingBookingId)}`
      : "";
    apiRequest<ApiEnvelope<Availability>>(
      `/rentals/${encodeURIComponent(selectedEquipment.id)}/availability?from=${from}&to=${to}${bookingQuery}`,
      token,
    )
      .then(({ data }) => {
        if (active) setAvailability(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load equipment availability.",
          );
        }
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reschedulingBookingId, selectedEquipment, token, weekDates]);

  const startCreate = () => {
    setEditingId("");
    setForm(emptyForm());
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const startEdit = (item: RentalEquipment) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description,
      dailyPriceTnd: String(item.dailyPriceTnd),
      location: item.location,
    });
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId("");
    setForm(emptyForm());
  };

  const submitEquipment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      dailyPriceTnd: Number(form.dailyPriceTnd),
    };
    try {
      const response = await apiRequest<ApiEnvelope<RentalEquipment>>(
        editingId ? `/rentals/${encodeURIComponent(editingId)}` : "/rentals",
        token,
        {
          method: editingId ? "PUT" : "POST",
          body: payload,
        },
      );
      setSelectedId(response.data.id);
      await loadData();
      closeForm();
      setNotice(editingId ? "Equipment details updated." : "Equipment listed for rent.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save this equipment listing.",
      );
    } finally {
      setSaving(false);
    }
  };

  const setListingActive = async (item: RentalEquipment, active: boolean) => {
    setError("");
    setNotice("");
    try {
      await apiRequest<ApiEnvelope<RentalEquipment>>(
        `/rentals/${encodeURIComponent(item.id)}/active`,
        token,
        { method: "PATCH", body: { active } },
      );
      await loadData();
      setNotice(
        active
          ? "Equipment is available for new rentals."
          : "Equipment is no longer available for new rentals; existing reservations are unchanged.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update equipment availability.",
      );
    }
  };

  const startReschedule = (item: RentalBooking) => {
    const listing = equipment.find(
      (candidate) => candidate.id === item.equipment.id,
    );
    if (!listing || !listing.active) {
      setError("This equipment is not available for rescheduling.");
      return;
    }
    setError("");
    setNotice("");
    setSelectedId(listing.id);
    setSelectedDates(item.dates);
    setReschedulingBookingId(item.id);
    setWeekStart(startOfWeek(item.dates[0]));
  };

  const cancelReschedule = () => {
    setReschedulingBookingId("");
    setSelectedDates([]);
  };

  const toggleDate = (date: string) => {
    if (date < getTunisiaToday() || unavailableDates.has(date)) return;
    setSelectedDates((current) => {
      if (current.includes(date)) return current.filter((value) => value !== date);
      if (current.length >= 14) return current;
      return [...current, date].sort();
    });
  };

  const submitBooking = async () => {
    if (!selectedEquipment || selectedDates.length === 0) return;
    setBooking(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest<ApiEnvelope<RentalBooking>>(
        `/rentals/${encodeURIComponent(selectedEquipment.id)}/bookings${
          reschedulingBookingId
            ? `/${encodeURIComponent(reschedulingBookingId)}`
            : ""
        }`,
        token,
        {
          method: reschedulingBookingId ? "PATCH" : "POST",
          body: { dates: selectedDates },
        },
      );
      setSelectedDates([]);
      setReschedulingBookingId("");
      setNotice(
        `${reschedulingBookingId ? "Rental dates updated" : "Rental confirmed"} for ${response.data.dates.length} ${
          response.data.dates.length === 1 ? "day" : "days"
        }. Total: ${formatTnd(response.data.totalPriceTnd)}.`,
      );
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reserve the selected days.",
      );
    } finally {
      setBooking(false);
    }
  };

  const cancelBooking = async (item: RentalBooking) => {
    if (
      !window.confirm(
        `Cancel your reservation for ${item.equipment.name} on ${formatDateList(item.dates)}?`,
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await apiRequest(
        `/rentals/${encodeURIComponent(item.equipment.id)}/bookings/${encodeURIComponent(item.id)}`,
        token,
        { method: "DELETE" },
      );
      if (reschedulingBookingId === item.id) cancelReschedule();
      await loadData();
      setNotice("Rental booking cancelled. Its dates are available again.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not cancel this rental booking.",
      );
    }
  };

  const canManageBooking = (item: RentalBooking) =>
    item.status === "confirmed" &&
    item.dates.length > 0 &&
    item.dates.every((date) => date > getTunisiaToday());

  const isOwner = (item: RentalEquipment) => item.ownerId === user.id;
  const governorateName = (id: string) =>
    governorates.find((governorate) => governorate.id === id)?.name ??
    formatGovernorate(id);

  return (
    <div className="workspace-content rentals-page">
      <div className="workspace-heading rental-heading">
        <div>
          <span className="eyebrow">EQUIPMENT RENTALS</span>
          <h2>Tools to help get the job done.</h2>
          <p>Browse local equipment and reserve available days in Tunisia.</p>
        </div>
        <button
          className="button button-primary button-small"
          type="button"
          onClick={startCreate}
        >
          <Plus size={16} /> List equipment
        </button>
      </div>

      {notice && <p className="feedback feedback-success" role="status">{notice}</p>}
      {error && <p className="feedback feedback-error" role="alert">{error}</p>}

      {showForm && (
        <form className="rental-listing-form" onSubmit={submitEquipment}>
          <div className="rental-form-heading">
            <div>
              <span className="eyebrow">{editingId ? "EDIT LISTING" : "NEW LISTING"}</span>
              <h3>{editingId ? "Update equipment details" : "List equipment for rent"}</h3>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close equipment form"
              onClick={closeForm}
            >
              <X size={18} />
            </button>
          </div>
          <div className="rental-form-grid">
            <label>
              Equipment name
              <input
                required
                minLength={3}
                maxLength={100}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Cordless drill"
              />
            </label>
            <label>
              Category
              <select
                required
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                <option value="">Select a category</option>
                {form.category &&
                  !RENTAL_EQUIPMENT_CATEGORIES.includes(
                    form.category as (typeof RENTAL_EQUIPMENT_CATEGORIES)[number],
                  ) && (
                    <option value={form.category}>{form.category} (existing category)</option>
                  )}
                {RENTAL_EQUIPMENT_CATEGORIES.map((category) => (
                  <option value={category} key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Price per day (TND)
              <input
                required
                type="number"
                min="0.001"
                max="100000"
                step="0.001"
                value={form.dailyPriceTnd}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dailyPriceTnd: event.target.value,
                  }))
                }
                placeholder="15.000"
              />
            </label>
            <label>
              Governorate
              <select
                required
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
              >
                <option value="">Select a governorate</option>
                {governorates.map(({ id, name }) => (
                  <option value={id} key={id}>{name}</option>
                ))}
              </select>
            </label>
            <label className="rental-description-field">
              Description
              <textarea
                required
                minLength={10}
                maxLength={1000}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe the equipment condition, included accessories, and pickup details."
              />
            </label>
          </div>
          <div className="rental-form-actions">
            <span className="form-hint">Rates are charged per selected calendar day in Tunisian dinars.</span>
            <button className="button button-primary button-small" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Publish listing"}
            </button>
          </div>
        </form>
      )}

      <div className="rental-catalog-toolbar">
        <div className="rental-result-count">
          <PackageOpen size={17} />
          <span>{loading ? "Loading equipment…" : `${visibleEquipment.length} listings`}</span>
        </div>
        <label className="search-field rental-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search equipment"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="rental-location-filter">
          <MapPin size={15} />
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            aria-label="Filter by governorate"
          >
            <option value="all">All governorates</option>
            {governorates.map(({ id, name }) => (
              <option value={id} key={id}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="rentals-layout">
        <section className="equipment-results">
          {loading ? (
            <div className="empty-workspace">Loading available equipment…</div>
          ) : visibleEquipment.length === 0 ? (
            <div className="empty-workspace">
              <span className="empty-icon"><Search size={22} /></span>
              <strong>No equipment found</strong>
              <span>Try a different search or governorate, or publish a listing.</span>
            </div>
          ) : (
            <div className="equipment-grid">
              {visibleEquipment.map((item, index) => (
                <article
                  className={`equipment-card ${selectedId === item.id ? "is-selected" : ""}`}
                  key={item.id}
                >
                  <button
                    className={`equipment-art equipment-art-${index % 4}`}
                    type="button"
                    aria-label={`View ${item.name}`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setSelectedDates([]);
                      setReschedulingBookingId("");
                    }}
                  >
                    <span className="equipment-art-circle">
                      <Wrench size={34} strokeWidth={1.5} />
                    </span>
                    <span className="equipment-image-label">{item.category}</span>
                  </button>
                  <div className="equipment-card-content">
                    <span className="equipment-category">{item.category}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <div className="equipment-card-meta">
                      <strong>{formatTnd(item.dailyPriceTnd)} / day</strong>
                      <span className="availability-preview">{governorateName(item.location)}</span>
                    </div>
                    <div className="equipment-owner">Listed by {item.ownerName}</div>
                    <div className={`rental-card-actions ${isOwner(item) ? "rental-card-actions-owner" : ""}`}>
                      {!isOwner(item) && (
                        <button
                          className="equipment-view-link"
                          type="button"
                          onClick={() => {
                            setSelectedId(item.id);
                            setSelectedDates([]);
                            setReschedulingBookingId("");
                          }}
                        >
                          Check availability <span>→</span>
                        </button>
                      )}
                      {isOwner(item) && (
                        <span className="rental-owner-actions">
                          <button
                            className="icon-button"
                            type="button"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => startEdit(item)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="rental-availability-toggle"
                            type="button"
                            onClick={() => void setListingActive(item, false)}
                          >
                            Mark unavailable
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rental-detail-panel">
          {selectedEquipment ? (
            <>
              <span className="eyebrow">RESERVE EQUIPMENT</span>
              {reschedulingBookingId && (
                <div className="rental-reschedule-banner" role="status">
                  <span>Rescheduling booking — select replacement dates.</span>
                  <button type="button" onClick={cancelReschedule}>Stop</button>
                </div>
              )}
              <div className="rental-detail-art"><Wrench size={48} strokeWidth={1.35} /></div>
              <span className="equipment-category">{selectedEquipment.category}</span>
              <h3>{selectedEquipment.name}</h3>
              <p className="rental-detail-description">{selectedEquipment.description}</p>
              <p className="rental-detail-location">
                <MapPin size={15} /> {governorateName(selectedEquipment.location)}
              </p>
              <div className="rental-calendar">
                <div className="rental-calendar-heading">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Previous week"
                    disabled={weekStart <= currentWeek}
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <strong>{formatWeekLabel(weekDates)}</strong>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Next week"
                    disabled={weekStart >= maxWeek}
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
                <div className="rental-week-grid">
                  {weekDates.map((date) => {
                    const isPast = date < getTunisiaToday();
                    const isBooked = unavailableDates.has(date);
                    const isSelected = selectedDates.includes(date);
                    const isAvailable = availableDates.has(date);
                    return (
                      <button
                        className={[
                          "rental-day",
                          isSelected ? "is-selected" : "",
                          isBooked ? "is-booked" : "",
                          !isAvailable && !isBooked && !isPast ? "is-pending" : "",
                        ].filter(Boolean).join(" ")}
                        type="button"
                        key={date}
                        disabled={
                          isPast ||
                          isBooked ||
                          !isAvailable ||
                          availabilityLoading ||
                          isOwner(selectedEquipment)
                        }
                        aria-pressed={isSelected}
                        onClick={() => toggleDate(date)}
                      >
                        <span>{formatWeekday(date)}</span>
                        <strong>{formatDayNumber(date)}</strong>
                        <small>
                          {isPast ? "Past" : isBooked ? "Reserved" : isSelected ? "Selected" : "Available"}
                        </small>
                      </button>
                    );
                  })}
                </div>
                <p className="rental-calendar-hint" aria-live="polite">
                  {availabilityLoading
                    ? "Checking available days…"
                    : isOwner(selectedEquipment)
                      ? "You cannot reserve your own listing."
                      : selectedDates.length >= 14
                        ? "A single reservation can include up to 14 days."
                        : "Select one or more available days; you can choose dates across weeks."}
                </p>
              </div>
              <div className="rental-estimate">
                <span>
                  {selectedDates.length} selected {selectedDates.length === 1 ? "day" : "days"}
                  <small>
                    {formatTnd(
                      reschedulingBooking?.dailyPriceTnd ??
                        selectedEquipment.dailyPriceTnd,
                    )} per day
                  </small>
                </span>
                <strong>{formatTnd(selectedTotal)}</strong>
              </div>
              <button
                className="button button-primary button-wide"
                type="button"
                disabled={
                  booking ||
                  availabilityLoading ||
                  selectedDates.length === 0 ||
                  isOwner(selectedEquipment)
                }
                onClick={() => void submitBooking()}
              >
                <CalendarCheck size={16} />
                {booking
                  ? reschedulingBookingId
                    ? "Updating dates…"
                    : "Confirming rental…"
                  : reschedulingBookingId
                    ? "Save new dates"
                    : "Confirm rental"}
              </button>
              {reschedulingBookingId && (
                <button
                  className="button button-outline button-wide"
                  type="button"
                  onClick={cancelReschedule}
                >
                  Stop rescheduling
                </button>
              )}
              <p className="rental-reservation-note">
                Dates are reserved immediately. No payment is collected in the app; arrange hand-to-hand payment and pickup directly with the equipment owner.
              </p>
            </>
          ) : (
            <div className="empty-workspace rental-select-empty">
              <span className="empty-icon"><CalendarDays size={21} /></span>
              <strong>Select equipment to view availability</strong>
              <span>Choose an item from the listings to reserve available days.</span>
            </div>
          )}
        </aside>
      </div>

      <section className="my-rentals-section">
        <div className="jobs-heading">
          <div>
            <span className="eyebrow">YOUR RENTALS</span>
            <h2>Bookings and listings</h2>
          </div>
        </div>
        <div className="my-rentals-grid">
          <div className="my-rentals-card">
            <h3><CalendarCheck size={17} /> Reserved equipment</h3>
            {myRentals.bookings.length === 0 ? (
              <p className="my-rentals-empty">Your confirmed equipment rentals will appear here.</p>
            ) : (
              <div className="my-rental-list">
                {myRentals.bookings.map((item) => (
                  <article className="my-rental-row" key={item.id}>
                    <div className="my-rental-row-details">
                      <strong>{item.equipment.name}</strong>
                      <span>
                        {formatDateList(item.dates)} · {formatTnd(item.totalPriceTnd)}
                      </span>
                      <small className={`rental-booking-status is-${item.status}`}>
                        {item.status === "cancelled" ? "Cancelled" : "Confirmed"}
                      </small>
                    </div>
                    {canManageBooking(item) && (
                      <div className="my-rental-row-actions">
                        <button
                          className="button button-outline button-small"
                          type="button"
                          onClick={() => startReschedule(item)}
                        >
                          <RotateCcw size={14} /> Reschedule
                        </button>
                        <button
                          className="button button-outline button-small"
                          type="button"
                          onClick={() => void cancelBooking(item)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="my-rentals-card">
            <h3><PackageOpen size={17} /> Your listings</h3>
            {myRentals.equipment.length === 0 ? (
              <p className="my-rentals-empty">Equipment you list for rent will appear here.</p>
            ) : (
              <div className="my-rental-list">
                {myRentals.equipment.map((item) => (
                  <article className="my-rental-row" key={item.id}>
                    <div className="my-rental-row-details">
                      <strong>{item.name}</strong>
                      <span>
                        {governorateName(item.location)} · {formatTnd(item.dailyPriceTnd)} / day
                      </span>
                      <small className={`rental-booking-status ${item.active ? "is-confirmed" : "is-cancelled"}`}>
                        {item.active ? "Available" : "Unavailable"}
                      </small>
                    </div>
                    <div className="my-rental-row-actions">
                      {item.active && (
                        <button
                          className="button button-outline button-small"
                          type="button"
                          onClick={() => startEdit(item)}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      )}
                      <button
                        className="button button-outline button-small"
                        type="button"
                        onClick={() => void setListingActive(item, !item.active)}
                      >
                        {item.active ? "Mark unavailable" : "Make available"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function startOfWeek(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return addDays(date, -(day === 0 ? 6 : day - 1));
}

function getWeekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatDayNumber(date: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatWeekLabel(dates: string[]): string {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(`${dates[0]}T00:00:00.000Z`))} – ${formatter.format(
    new Date(`${dates[dates.length - 1]}T00:00:00.000Z`),
  )}`;
}

function formatDateList(dates: string[]): string {
  return dates
    .map((date) =>
      new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T00:00:00.000Z`)),
    )
    .join(", ");
}

function formatTnd(amount: number): string {
  return `${new Intl.NumberFormat("en-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount)} TND`;
}

function formatGovernorate(location: string): string {
  return location
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
