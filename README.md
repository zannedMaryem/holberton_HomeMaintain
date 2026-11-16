# HomeMaintain

HomeMaintain is a proposed web application for helping people resolve household
maintenance problems. A user identifies a problem, explores possible solutions,
and can choose a DIY repair, equipment rental, search available technicians and
request a service directly, or post an open job for technicians to review.
Technicians can browse available jobs, apply, and propose the services they can
provide. The application is also intended to support a record of completed
maintenance.

## Project status

The backend implements authentication, user and technician profiles, a service
catalog, job applications and assignments, scheduling, cancellation, completion,
per-job ratings, and equipment rentals. The React frontend provides the public
homepage and signed-in homeowner/technician pages for jobs and equipment rentals.
DIY repair guidance remains planned.

The Figma design link currently requires a Figma login. The homepage uses the
provided local design export as its visual reference, with original local
illustrations rather than unavailable Figma assets.

## Running the frontend

Start the backend and configure its MongoDB connection as described in the
backend documentation. In another terminal, run:

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

Vite serves the frontend on port `5173` and proxies `/api` requests to the
backend on port `5000`. To type-check and create a production build, run:

```sh
npm --prefix frontend run build
```

## Equipment rentals

Homeowners and technicians can publish and manage their own equipment listings.
Listings include a Tunisia governorate and a daily price in TND. Signed-in users
can browse and search active listings, check availability, and immediately
reserve up to 14 distinct dates within the next 90 days. A day can only be
reserved once; the server atomically checks and records bookings. Renters can
cancel or reschedule their own future bookings; cancellation returns the dates
to availability. Listing owners can mark a listing unavailable or make it
available again. Deactivation hides a listing from new rentals but preserves
existing reservations. Payment and pickup coordination are handled outside the
application. No payment is collected or recorded in HomeMaintain: the renter
and equipment owner arrange payment in person, hand to hand, and coordinate
pickup and return directly.

Rental API routes:

- `GET /api/rentals` — browse active listings; optional `search`, `category`, and
  `location` filters.
- `GET /api/rentals/:rentalId/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` —
  check dates in a range of up to 31 days. During rescheduling, pass the
  renter's `bookingId` to exclude that booking's current dates from conflicts.
- `POST /api/rentals` — publish a listing.
- `PUT /api/rentals/:rentalId` — update the current user's active listing.
- `PATCH /api/rentals/:rentalId/active` — set `{ "active": boolean }` for
  the current user's listing. Deactivation preserves existing reservations.
- `DELETE /api/rentals/:rentalId` — mark the current user's listing unavailable
  for new bookings; existing reservations are retained.
- `POST /api/rentals/:rentalId/bookings` — immediately reserve selected dates.
- `PATCH /api/rentals/:rentalId/bookings/:bookingId` — reschedule the renter's
  own booking to available future dates. The original daily rate is retained.
- `DELETE /api/rentals/:rentalId/bookings/:bookingId` — cancel the renter's
  own future booking. The cancelled booking remains in the renter's history,
  and its dates become available again.
- `GET /api/rentals/mine` — retrieve all of the current user's listings,
  active or inactive, and booking history, including cancelled bookings.

All rental routes require authentication. Listing creation, editing, and deletion
are restricted to the listing owner; booking changes are restricted to the
renter. A booking can only be cancelled or rescheduled if all its reserved dates
are later than the current Tunisia calendar date. Existing reservations remain
visible and retained when an owner deactivates a listing.

## Frontend flow and file map

The React app starts at `frontend/index.html`, which provides the `#root`
element, and `frontend/src/main.tsx` mounts `App` into it and loads the shared
stylesheet. `App.tsx` owns the signed-in session and top-level navigation.
Navigation uses the URL hash (for example `#my-repairs`), parsed and checked by
`navigation.ts`. For signed-in routes, `AuthenticatedPage.tsx` selects a page
based on the current route and account role. Page components call the shared
`apiRequest` function in `api.ts`; that helper sends JSON, adds the bearer token,
and turns unsuccessful HTTP responses into errors for the page to display.

| File | Responsibility |
| --- | --- |
| `frontend/index.html` | Browser document title, metadata, root element, and module entry. |
| `frontend/src/main.tsx` | React DOM entry point; mounts `App` and imports global styles. |
| `frontend/src/App.tsx` | Landing page, session restore/sign-in/sign-out, navigation header, and route shell. |
| `frontend/src/navigation.ts` | Typed page names and hash-route parsing/validation. |
| `frontend/src/api.ts` | API URL, shared API/data types, authenticated JSON requests, session-storage ID helpers, and Tunisia date helper. |
| `frontend/src/styles.css` | Shared visual design, page layouts, and responsive styles. |
| `frontend/vite.config.ts` | Vite/React configuration and the local `/api` proxy to the backend. |
| `frontend/package.json` / `package-lock.json` | Frontend scripts and pinned dependency versions. |
| `frontend/src/components/AuthenticatedPage.tsx` | Signed-in route and role dispatch. |
| `frontend/src/components/AuthDialog.tsx` | Login and registration forms and authentication requests. |
| `frontend/src/components/PersonalSpacePage.tsx` | Signed-in Overview and shortcut cards. |
| `frontend/src/components/HomeownerWorkspace.tsx` | Homeowner My repairs: post jobs, review applications, schedule/cancel, and view history. |
| `frontend/src/components/TechnicianRepairsPage.tsx` | Technician My repairs: proposals, assigned work, completion, and ratings. |
| `frontend/src/components/TechnicianWorkspace.tsx` | Earlier technician job-workspace implementation; it is currently not routed by `AuthenticatedPage`. |
| `frontend/src/components/FindJobPage.tsx` | Technician search and application to open jobs. |
| `frontend/src/components/FindProPage.tsx` | Homeowner search for active technicians. |
| `frontend/src/components/RentalsPage.tsx` | Rental listings, availability calendar, booking, and the user's listings/bookings. |
| `frontend/src/components/ProfilePage.tsx` | Account and technician profile management. |
| `frontend/src/components/JobActions.tsx` | Shared schedule/reschedule, cancel, completion, and rating controls for a job. |
| `frontend/src/components/TechnicianAvatar.tsx` | Technician photo display with initials fallback. |
| `frontend/src/components/HomeMaintainArt.tsx` | Local SVG illustrations used on the public landing page. |

### Reading the frontend as a beginner

1. Start with `main.tsx` to see how React is mounted.
2. Read `App.tsx` to follow session restoration, sign-in state, and navigation.
3. Read `navigation.ts` and `AuthenticatedPage.tsx` to see how a hash selects a
   page and how role restrictions work.
4. Read `api.ts` to understand the frontend/backend boundary and shared types.
5. Follow one feature end to end; for rentals, start in `RentalsPage.tsx`, find
   its `apiRequest` calls, then inspect the corresponding `/api/rentals` route,
   controller, service, and model in `backend/src`.
6. Refer to `styles.css` for presentation. Most page-specific styles use a
   page-level class, while shared controls use common classes.

## Production deployment and operations checklist

The exact hosting provider has not been selected. Use separate frontend static
hosting and backend Node hosting, or a platform that supports both. Prefer a
same-origin reverse proxy where `/api` is forwarded to the backend; the frontend
already defaults to `/api`. If the frontend and API use different origins, set
`VITE_API_BASE_URL` to the public API base URL and configure an explicit backend
CORS allowlist before release (CORS is not currently configured in the app).

1. **Create staging and production environments.** Keep separate frontend
   builds, backend services, databases, and credentials. Use test accounts and
   non-production data in staging.
2. **Configure environment variables in the host's secret manager.** The
   backend requires `MONGODB_URI` and `JWT_SECRET`; `PORT` is optional locally
   and is normally supplied by the host. The frontend build can use
   `VITE_API_BASE_URL`; it is a public URL, not a secret. Never put database
   credentials or signing keys in `VITE_*` variables, source files, or logs.
   Generate a long, unique production `JWT_SECRET` and restrict database
   credentials/network access to the backend.
3. **Build and deploy.** Run backend build and tests, then
   `npm --prefix frontend run build`. Deploy `backend/dist` with the backend
   production dependencies and `node dist/server.js`; publish the frontend
   `frontend/dist` as static files. Confirm the production frontend points to
   the production API, not localhost.
4. **Protect and back up MongoDB.** Use a managed MongoDB deployment with TLS,
   least-privilege credentials, automated snapshots, and a retention period
   appropriate to the business. Enable point-in-time recovery if the provider
   supports it. Encrypt backups and restrict who can restore/download them.
   Periodically restore a snapshot into an isolated database and verify users,
   jobs, profiles, and rental reservations; a backup that has never been
   restored is not a verified recovery plan.
5. **Verify health and monitor operations.** `GET /api/health` currently
   confirms that the API process responds; it does not check database
   readiness. Add or configure a database-aware readiness check before relying
   on it for automated failover. Monitor API availability, 4xx/5xx rates,
   latency, backend restarts, MongoDB availability/storage, and backup
   completion. Alert an owner when thresholds fail. Do not log passwords,
   bearer tokens, or database connection strings.
6. **Release safely.** Deploy to staging first, run the acceptance checklist
   below, then promote the same build to production. Keep the prior deploy
   available for rollback, verify sign-in and a rental availability request
   after release, and document who can roll back and restore data.

### Short user acceptance test before launch

Run this in staging with one homeowner account and one technician account,
using test equipment and future dates. Record pass/fail, the build tested, and
any issue with steps to reproduce. Do not use real identity or payment data.

1. **Access:** register/sign in as each role; check page access, sign-out, and
   direct refresh of a signed-in hash route.
2. **Homeowner repairs:** post a job; verify it appears under Current repair;
   submit/accept a technician proposal; schedule and reschedule a date; cancel
   an assignment and confirm the job reopens; complete a job and submit a
   rating. Verify the history table and empty states.
3. **Technician repairs:** find an open job, apply, confirm the homeowner's
   decision appears, schedule an assigned job if available, mark it complete,
   and submit the technician's rating.
4. **Rentals:** publish, edit, and browse a listing; select multiple available
   days and verify the displayed total; confirm a reservation; verify those
   days become unavailable and the booking appears in My rentals. Confirm
   self-rental is rejected, a duplicate/overlapping reservation is rejected,
   invalid/out-of-window dates fail, and a listing with future reservations
   cannot be deleted.
5. **In-person payment:** confirm the renter and owner see the same agreed
   booking dates and total, and that the UI clearly states payment is arranged
   directly in person. Confirm no card/payment form or payment status is shown.
6. **Usability:** repeat the key flows on a narrow phone-sized viewport and
   desktop; check keyboard navigation, readable errors, loading states, and
   that a failed API request does not look like a successful booking.

Treat a failed sign-in, wrong user's data exposure, incorrect booking total,
double booking, or lost reservation as a launch blocker. Fix and rerun failed
steps; get a homeowner and technician to sign off on the final staging build.

## Documentation

- [System Architecture](Project_Documentation/SystemArchitecture.md) — proposed
  stack, components, architecture diagram, and data flow.
- [Business Rules](Project_Documentation/BUSINESS_RULES.md) — product rules,
  validation responsibilities, workflows, and decisions that still need
  confirmation.
- [Technical Documentation](Project_Documentation/TECHNICAL_DOCUMENTATION.md)
  — technical diagrams, request and feature workflows, and implementation
  guidelines.
- [Architecture Reference](Project_Documentation/ARCHITECTURE_REFERENCE.md) —
  module and data references, checklists, and MVP readiness items.

## Supported MVP journey

1. Identify and describe a household maintenance problem.
2. Post an open job under an available service and governorate.
3. Technicians maintain their service profile and submit proposals for matching
   open jobs.
4. The homeowner reviews proposals, accepts one, and reserves or reschedules an
   intervention slot.
5. The technician marks the job complete; both parties can then rate the other
   for that job.
6. The homeowner can cancel an assignment and reopen the job if plans change.

## Planned technology

The architecture proposes MongoDB, Express.js, React, and Node.js (MERN).
Problem-photo storage and email notifications are optional integrations and
are not prerequisites for the core MVP.

## Documentation conventions

The architecture and related documents are a design baseline, not evidence that
a feature is already implemented. Concrete product choices that are not
specified in the architecture are identified as decisions to confirm rather
than presented as settled requirements.
