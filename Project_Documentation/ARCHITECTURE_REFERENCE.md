# HomeMaintain Architecture Reference

## Status

This is a reference for the proposed MVP in
[SystemArchitecture.md](./SystemArchitecture.md). It is not a schema contract
or an inventory of implemented features.

## Technology and component reference

| Area | Planned technology / component | Notes |
| --- | --- | --- |
| User interface | React | Screens include Home, Assessment, DIY, Rentals, professional search and direct requests, job listings, technician applications, and application review. |
| API | Node.js and Express.js | REST API, validation, business logic, authentication, authorization. |
| Persistence | MongoDB | Accessed by the backend only. |
| Architecture style | Client-server; modular monolith backend | Backend feature modules deploy as one service. |
| Image storage | Optional external service | For problem photos; database stores a reference. |
| Notifications | Optional email service | For rental, direct service-request, job-application, and assignment updates. |

## Module reference

| Module | Responsibilities | Proposed data areas |
| --- | --- | --- |
| User and Account Management | Registration, login, profiles, roles, permissions | Users |
| Problem Assessment and DIY Guides | Problem reports, categories, guides, safety information | Problems, maintenance categories, DIY guides |
| Equipment and Rental Requests | Listings, availability checks, requests and status | Equipment, rental requests |
| Professional Directory and Direct Requests | Search active professional profiles and request a selected service directly | Professional profiles, services, service requests |
| Job Marketplace | User-posted open jobs, technician browsing/applications, owner review and assignment | Problems, professional profiles, services, job applications |
| Maintenance History | Records of completed repairs and maintenance | Maintenance records |

## Proposed MongoDB collections

Collection names from the architecture proposal:

| Collection | Intended contents | Design item to resolve |
| --- | --- | --- |
| `users` | Accounts and profiles | Role model, authentication fields, privacy. |
| `problems` | User-posted maintenance jobs and image references | Required fields, open/assigned lifecycle, ownership, photo retention. |
| `maintenanceCategories` | Problem/maintenance categories | Category ownership and controlled values. |
| `diyGuides` | Repair steps and safety information | Review process and applicable category links. |
| `equipment` | Equipment listings | Owner, availability representation, listing state. |
| `rentalRequests` | Equipment rental requests and status | Date rules, conflicts, state transitions. |
| `professionalProfiles` | Technician profiles and services offered | Technician account role, active-profile eligibility, verification, and profile visibility. |
| `services` | Service catalog used by profiles and proposals | Service ownership, controlled values, and lifecycle. |
| `serviceRequests` | Direct requests from users to selected professionals | Request status transitions, profile/service eligibility, optional link to a problem, scheduling and cancellation policy. |
| `jobApplications` | Technician applications and service proposals linked to jobs | Proposal fields, application states, one-acceptance rule, withdrawal/decline policy. |
| `maintenanceRecords` | Completed repairs and maintenance activities | Who may create/view records and relationship to a problem. |

These are initial proposed names. The final document schema, indexes,
validation constraints, and relationship strategy remain implementation
decisions.

The professional directory and job marketplace are parallel service paths.
Users can search active profiles and create `serviceRequests` for a selected
professional and service. Separately, the `problems` collection doubles as the
job-posting collection: only records published with an open status are
returned by the available-jobs listing. A technician's `jobApplications`
reference a problem/job and a profile and include at least one proposed service
from that profile. Accepting one application assigns the job and declines the
remaining pending applications; it does not replace the direct-request path.

## Data-flow reference

1. React sends a JSON request or, for an optional photo, a multipart upload.
2. Express middleware validates input and applies authentication and
   authorization.
3. The relevant feature module runs the business operation.
4. The backend reads/writes MongoDB and coordinates optional integrations.
5. The API returns an HTTP status and JSON result or error.
6. React displays the result.

For direct requests, users search active professional profiles and submit a
request for a service they offer; both parties can view the request status.
For the technician marketplace, authenticated technicians query only open jobs,
submit an application with services from their active profile, and the job
owner reviews those applications. Acceptance assigns the job atomically and
declines the remaining pending applications.

## Implementation checklist

### API and access

- [ ] Define and document the API routes and request/response schemas.
- [ ] Decide which operations require authentication and define role
      permissions.
- [ ] Implement server-side validation and consistent error responses.
- [ ] Keep database access and secrets on the backend.
- [ ] Require HTTPS in production and configure secrets outside source control.

### Data and workflows

- [ ] Define collection schemas, references, indexes, and retention policies.
- [ ] Define job, rental, and application status values and allowed transitions.
- [ ] Enforce technician-only access to available jobs and applications.
- [ ] Enforce job-owner-only application review and acceptance.
- [ ] Ensure accepting one proposal atomically assigns the job and prevents a
      second accepted application.
- [ ] Validate that each proposed service is active and belongs to the
      applying technician's profile.
- [ ] Validate that direct service requests reference an active professional
      profile and one of its active services.
- [ ] Restrict direct-request reads and status changes to the customer and
      addressed professional.
- [ ] Define direct service-request statuses, scheduling, acceptance,
      cancellation, and completion behavior.
- [ ] Implement server-side rental availability and conflict checks.
- [ ] Confirm how concurrent rental requests are made consistent.
- [ ] Define which user roles may create and view maintenance records.

### Optional integrations

- [ ] Decide whether photo uploads are in MVP scope; if so, define format,
      size, access, and retention constraints.
- [ ] Decide whether email notifications are in MVP scope and which events
      trigger them.
- [ ] Ensure the core user journey behaves clearly when optional services are
      disabled or unavailable.

### Verification

- [ ] Test valid and invalid open-job postings.
- [ ] Test authentication and authorization boundaries.
- [ ] Test rental date validation, overlapping periods, and concurrent requests.
- [ ] Test job/application status updates and maintenance-history persistence.
- [ ] Test professional search filters, direct-request validation, and
      customer/professional access boundaries.
- [ ] Test open-job visibility, technician application eligibility, and
      proposal service validation.
- [ ] Test application review permissions and concurrent acceptance attempts.
- [ ] Test integration failures without leaking internal details.

## Decisions to track

The architecture does not define field-level validation limits, exact account
roles, direct service-request and job/application state transitions, professional
search filters, rental pricing/payment, cancellation policies, proposal pricing,
photo constraints, or notification triggers. Agree on those requirements
before treating the checklists as acceptance criteria.

For the product behavior baseline, see
[BUSINESS_RULES.md](./BUSINESS_RULES.md). For technical workflows and
implementation guidance, see
[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md).
