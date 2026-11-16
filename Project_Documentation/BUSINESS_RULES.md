# HomeMaintain Business Rules

## Purpose and status

This document records the product behavior implied by the proposed
[system architecture](./SystemArchitecture.md). The architecture describes an
MVP, not a running product. Rules below are therefore a baseline for
implementation and product review; items marked **Confirm** require a product
decision before they can be enforced precisely.

## Core rules

| ID | Rule | Basis / status |
| --- | --- | --- |
| BR-01 | A user can identify a household maintenance problem and provide its location, service, and description. | Supported by the example problem-reporting flow. |
| BR-02 | A problem may include a photograph when image upload is available. | Optional capability in the architecture. |
| BR-03 | The application presents DIY repair, equipment rental, direct technician search/service requests, and open jobs that homeowners can assign directly or review technician proposals for. | Direct service requests, direct job assignment, and job applications are separate workflows. |
| BR-04 | A DIY guide should include relevant repair guidance and safety information. | Supported by the proposed guides module. |
| BR-05 | Equipment rental requests are subject to equipment availability for the requested period. | Availability checking is required by the architecture. |
| BR-06 | A user can search available professional profiles by relevant service and submit a direct service request to a selected professional. | The original direct-service workflow remains supported. Exact availability/search filters are **Confirm**. |
| BR-07 | A user may also publish a maintenance problem as an open job visible to technicians. | Additional marketplace path. Only open jobs are eligible for applications. |
| BR-08 | An authenticated technician may browse open jobs and apply with a proposal for a service they offer in the job's governorate. | The applicant must have an active profile with an active matching service offering and location. |
| BR-09 | The job owner may accept an application or directly assign a matching technician from the job's search results. | The job transitions atomically from `open` to `assigned`, preventing multiple selections. |
| BR-10 | Direct service requests and job applications are distinct records and workflows. | A direct request targets a selected professional; an application is a technician's proposal for an open job. |
| BR-11 | Rental requests, direct service requests, and technician applications have statuses that can be communicated to relevant users. | Exact transition rules are proposed below and should be confirmed. |
| BR-12 | Completed repairs and maintenance activities can be recorded in maintenance history. | Supported by the proposed maintenance-history module. |
| BR-13 | Posting jobs, applying, reviewing applications, accepting/declining proposals, and sending direct service requests require authentication and role/ownership authorization by the backend. | Access checks must be enforced server-side. |
| BR-14 | The browser must not connect directly to the database or receive database credentials. | Architecture security requirement. |
| BR-15 | A technician profile declares the governorates in which each offered service is available. | Homeowner job matching requires both the job's service and governorate to match. |
| BR-16 | Accepting a technician application stores its `accepted` status; remaining pending applications are declined when the job is assigned. | Status is persisted and returned when applications are listed. |
| BR-17 | After assignment, the homeowner may reserve an unbooked intervention slot for a calendar date. | Slots use Tunisia time: 8:00 AM–12:00 PM and 1:00 PM–5:00 PM; one assigned job may reserve each technician/slot/date combination. |
| BR-18 | The assigned technician may mark an assigned job complete; after completion, each participant may submit one rating for the other. | Ratings are whole-number scores from 1 to 5; only the assigned technician and job owner may rate. |
| BR-19 | The homeowner may cancel an assigned job to reopen it, releasing its technician and reserved appointment. | The prior accepted application becomes cancelled; a fresh proposal may be submitted. Completed jobs cannot be cancelled. |
| BR-20 | The homeowner or assigned technician may reschedule an assigned job to an available slot. | The same date/time validation and technician double-booking rules apply. |
| BR-21 | A technician may deactivate their profile without deleting profile or job history. | Deactivation prevents new applications and assignments; existing assigned work can still be completed. |
| BR-22 | A renter may cancel or reschedule only their own reservation when every booked date is in the future in Tunisia. | Cancellation keeps a history record and releases its dates; rescheduling checks availability atomically and preserves the original daily rate. |
| BR-23 | An equipment owner may deactivate or reactivate a listing. | Inactive listings are hidden from browse and cannot receive new bookings; existing reservations remain intact and visible in owner/renter history. |

## Workflow: identify a problem and choose a path

1. The user selects a problem location and service and enters a description.
2. The user may attach a photograph if that capability is enabled.
3. The application validates the request on the server and checks applicable
   access permissions.
4. The user reviews the assessment and selects DIY, rental, direct technician
   search/service request, or the open-job marketplace.
5. The backend stores the problem and any image reference. If the user chooses
   the marketplace path, it is published with an open job status; direct
   requests instead target a selected professional profile.

The proposed `POST /api/jobs` endpoint creates an open job. Direct technician
search and service requests use the professional directory and
`POST /api/service-requests`; these are separate design contracts, not
implemented API routes.

## Workflow: equipment rental (current MVP)

1. An authenticated homeowner or technician publishes equipment with a
   governorate and a daily TND price; only the owner can edit or change its
   availability.
2. An authenticated user browses active listings and checks available dates.
3. The renter selects one to 14 unique available dates, within the next 90 days,
   and confirms. The server atomically records the reservation and total.
4. Reserved dates are no longer available. The renter may reschedule to other
   available dates or cancel the booking if all reserved dates are later than
   today's date in Tunisia. A cancelled booking remains in history, releases
   its dates, and cannot be changed again.
5. The owner may mark a listing unavailable to prevent new reservations or
   reactivate it later. This does not cancel or alter existing bookings.
6. The renter and owner arrange hand-to-hand payment and pickup/return directly.
   HomeMaintain does not collect, transfer, or track payment.

There is no online payment, owner approval, or equipment return workflow in the
MVP. Overlapping date requests are rejected; reservations are confirmed
immediately by the application. Payment amount is calculated from the daily
TND rate recorded at booking time and the selected number of dates. Rescheduling
keeps that recorded daily rate even if the listing's price later changes.

## Workflow: find a professional and request service directly

1. The user searches the professional directory, optionally filtering by
   offered service and service area.
2. The application lists matching active professional profiles and their
   services.
3. The user selects a professional and service, then submits a request with
   details and, if supported, a preferred time.
4. The backend validates the selected profile/service and creates a direct
   service request with an initial status.
5. The professional and user can view request status; optional email
   notifications may be sent.

This direct-service path does not create a job-board posting or a
`jobApplication`. Scheduling, acceptance, pricing, and status transitions
remain **Confirm**.

## Workflow: publish a job and receive technician proposals

1. The user submits a maintenance problem and publishes it as an open job.
2. The backend validates the job details, associates the posting with its
   owner, and saves it with an open status.
3. An authenticated technician with an active professional profile browses
   open jobs.
4. The technician applies to a job, selecting one or more services they offer
   and providing a proposal. Optional pricing or availability information may
   be included if those fields are approved for the MVP.
5. The backend verifies that the job remains open, the applicant is a
   technician, and the proposed services are supported by that technician's
   profile. It saves an application with a pending status.
6. The job owner reviews the applications and accepts one proposal or declines
   applications.
7. When an application is accepted, the backend conditionally assigns the job
   to that technician, persists the accepted status, and prevents a second
   assignment. Other pending applications are marked declined.
8. The homeowner can request available dates and reserve a morning
   (8:00 AM–12:00 PM) or afternoon (1:00 PM–5:00 PM) slot. Dates and slot
   availability are evaluated in the `Africa/Tunis` time zone. The homeowner
   or assigned technician may reschedule; a technician cannot have two
   assigned jobs in the same slot.
9. The assigned technician marks the job complete. The homeowner can then rate
   the technician and the technician can rate the homeowner, each once per job
   on a 1-to-5 scale.
10. Before completion, the homeowner may cancel the assignment and reopen the
    job. The appointment is released and the prior accepted application is
    marked cancelled.

**States:** job `open`, `assigned`, `completed`, or `closed`; application
`pending`, `accepted`, `declined`, or `cancelled`. Declining one proposal
leaves the job open for other applications. Deactivating a technician profile
does not cancel assigned jobs; the technician may finish existing commitments.

## Validation responsibilities

Validation must be performed by the backend; client-side checks may improve
usability but are not a substitute.

| Input or operation | Minimum validation responsibility |
| --- | --- |
| Problem report | Require the fields agreed for the MVP; validate their shape and acceptable size; reject malformed data. The architecture does not define exact field limits. |
| Photograph | If enabled, check permitted file type and size and safely store it through the configured storage service. Exact limits and supported formats are **Confirm**. |
| Rental request | Require a valid equipment reference and rental period; reject invalid dates and unavailable/conflicting periods. |
| Job posting | Require the agreed problem fields, authenticated owner, an active service selected from the controlled service catalog, and a governorate ID from the supported Tunisian governorate list. |
| Direct service request | Require an authenticated requester, active professional profile, service offered by that profile, and the agreed request details. |
| Technician application | Require an active technician profile, an open job, a matching service and governorate offering, and a non-empty proposal. |
| Application review | Only the job owner may review or decide on applications for that job; only one application may be accepted. |
| Maintenance record | Validate required record details and ensure the actor can create or access the record. Exact fields and access policy are **Confirm**. |
| Protected operation | Authenticate the user and authorize the action on the server. |

Validation failures should return an appropriate HTTP error and a useful,
consistent response without disclosing stack traces or sensitive information.

## Product decisions to confirm

- Account roles and which actions each role may perform.
- Required fields and field limits for problems, requests, and history records.
- The initial service catalog is seeded by the backend; decide how services
  will be reviewed, changed, and eventually managed.
- Rental, job, and application states and permitted transitions.
- Direct professional-search filters and direct service-request status,
  scheduling, acceptance, and cancellation rules.
- Equipment handoff/return tracking remains outside the rental MVP and can be
  specified separately if the product needs an in-app return workflow.
- Technician proposal details, optional pricing/availability fields, scheduling,
  cancellation, and reopening policies.
- Whether declined applications can be revised or resubmitted. A cancelled
  accepted application can be resubmitted after the homeowner reopens the job.
- Photo formats, limits, retention, and access rules.
- Whether email notifications are in scope for the MVP.
