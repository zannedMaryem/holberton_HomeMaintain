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
| BR-01 | A user can identify a household maintenance problem and provide its location, category, and description. | Supported by the example problem-reporting flow. |
| BR-02 | A problem may include a photograph when image upload is available. | Optional capability in the architecture. |
| BR-03 | The application presents DIY repair, equipment rental, direct technician search/service requests, and posting an open job for technician proposals. | Core application purpose; direct requests and open job applications are separate paths. |
| BR-04 | A DIY guide should include relevant repair guidance and safety information. | Supported by the proposed guides module. |
| BR-05 | Equipment rental requests are subject to equipment availability for the requested period. | Availability checking is required by the architecture. |
| BR-06 | A user can search available professional profiles by relevant service and submit a direct service request to a selected professional. | The original direct-service workflow remains supported. Exact availability/search filters are **Confirm**. |
| BR-07 | A user may also publish a maintenance problem as an open job visible to technicians. | Additional marketplace path. Only open jobs are eligible for applications. |
| BR-08 | An authenticated technician may browse open jobs and apply with a proposal describing one or more services they can provide. | The applicant must have an active technician profile and propose services offered by that profile. |
| BR-09 | The job owner may review applications and accept a proposal; the server records the selected technician and closes the job to further applications. | Acceptance must be atomic; other pending applications are declined. |
| BR-10 | Direct service requests and job applications are distinct records and workflows. | A direct request targets a selected professional; an application is a technician's proposal for an open job. |
| BR-11 | Rental requests, direct service requests, and technician applications have statuses that can be communicated to relevant users. | Exact transition rules are proposed below and should be confirmed. |
| BR-12 | Completed repairs and maintenance activities can be recorded in maintenance history. | Supported by the proposed maintenance-history module. |
| BR-13 | Posting jobs, applying, reviewing applications, accepting/declining proposals, and sending direct service requests require authentication and role/ownership authorization by the backend. | Access checks must be enforced server-side. |
| BR-14 | The browser must not connect directly to the database or receive database credentials. | Architecture security requirement. |

## Workflow: identify a problem and choose a path

1. The user selects a problem location and category and enters a description.
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

## Workflow: request equipment

1. The user browses equipment and selects an item and rental period.
2. The server validates the request and checks availability for the requested
   period before accepting it.
3. The backend stores the rental request and its status.
4. The application displays the result and, if configured, sends request
   updates by email.

**Confirm:** rental-period limits, overlap/boundary semantics, pricing, payment,
approval, cancellation, return, and the allowed status transitions.

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
7. When an application is accepted, the backend atomically marks it accepted,
   assigns the job to that technician, and prevents further applications.
   Other pending applications are automatically marked declined.

**Proposed states:** job `open`, `assigned`, `completed`, or `closed`;
application `pending`, `accepted`, `declined`, or `withdrawn`. Declining one
proposal leaves the job open for other applications. Confirm how an assigned
job can be cancelled or reopened and whether technicians may revise or
resubmit a withdrawn/declined application.

## Validation responsibilities

Validation must be performed by the backend; client-side checks may improve
usability but are not a substitute.

| Input or operation | Minimum validation responsibility |
| --- | --- |
| Problem report | Require the fields agreed for the MVP; validate their shape and acceptable size; reject malformed data. The architecture does not define exact field limits. |
| Photograph | If enabled, check permitted file type and size and safely store it through the configured storage service. Exact limits and supported formats are **Confirm**. |
| Rental request | Require a valid equipment reference and rental period; reject invalid dates and unavailable/conflicting periods. |
| Job posting | Require the agreed problem fields, authenticated owner, and a valid publishable status. |
| Direct service request | Require an authenticated requester, active professional profile, service offered by that profile, and the agreed request details. |
| Technician application | Require an active technician profile, an open job, at least one proposed service that the technician offers, and a non-empty proposal. |
| Application review | Only the job owner may review or decide on applications for that job; only one application may be accepted. |
| Maintenance record | Validate required record details and ensure the actor can create or access the record. Exact fields and access policy are **Confirm**. |
| Protected operation | Authenticate the user and authorize the action on the server. |

Validation failures should return an appropriate HTTP error and a useful,
consistent response without disclosing stack traces or sensitive information.

## Product decisions to confirm

- Account roles and which actions each role may perform.
- Required fields and field limits for problems, requests, and history records.
- Rental, job, and application states and permitted transitions.
- Direct professional-search filters and direct service-request status,
  scheduling, acceptance, and cancellation rules.
- Rental scheduling, availability, payment, cancellation, and return policies.
- Technician proposal details, optional pricing/availability fields, scheduling,
  cancellation, and reopening policies.
- Whether a technician may submit more than one application per job, and
  whether withdrawn or declined applications can be revised or resubmitted.
- Photo formats, limits, retention, and access rules.
- Whether email notifications are in scope for the MVP.
