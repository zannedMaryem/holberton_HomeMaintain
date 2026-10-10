# HomeMaintain Architecture Reference

## Status

This is a reference for the proposed MVP in
[SystemArchitecture.md](./SystemArchitecture.md). It is not a schema contract
or an inventory of implemented features.

## Technology and component reference

| Area | Planned technology / component | Notes |
| --- | --- | --- |
| User interface | React | Screens include Home, Assessment, DIY, Rentals, and Professionals. |
| API | Node.js and Express.js | REST API, validation, business logic, authentication, authorization. |
| Persistence | MongoDB | Accessed by the backend only. |
| Architecture style | Client-server; modular monolith backend | Backend feature modules deploy as one service. |
| Image storage | Optional external service | For problem photos; database stores a reference. |
| Notifications | Optional email service | For rental or professional request updates. |

## Module reference

| Module | Responsibilities | Proposed data areas |
| --- | --- | --- |
| User and Account Management | Registration, login, profiles, roles, permissions | Users |
| Problem Assessment and DIY Guides | Problem reports, categories, guides, safety information | Problems, maintenance categories, DIY guides |
| Equipment and Rental Requests | Listings, availability checks, requests and status | Equipment, rental requests |
| Professionals and Service Requests | Professional profiles, offered services, booking requests | Professional profiles, service requests |
| Maintenance History | Records of completed repairs and maintenance | Maintenance records |

## Proposed MongoDB collections

Collection names from the architecture proposal:

| Collection | Intended contents | Design item to resolve |
| --- | --- | --- |
| `users` | Accounts and profiles | Role model, authentication fields, privacy. |
| `problems` | Household problem reports and image references | Required fields, ownership, photo retention. |
| `maintenanceCategories` | Problem/maintenance categories | Category ownership and controlled values. |
| `diyGuides` | Repair steps and safety information | Review process and applicable category links. |
| `equipment` | Equipment listings | Owner, availability representation, listing state. |
| `rentalRequests` | Equipment rental requests and status | Date rules, conflicts, state transitions. |
| `professionalProfiles` | Technician profiles and offered services | Verification and profile visibility. |
| `serviceRequests` | Requests for professional assistance | Scheduling, status, cancellation policy. |
| `maintenanceRecords` | Completed repairs and maintenance activities | Who may create/view records and relationship to a problem. |

These are initial proposed names. The final document schema, indexes,
validation constraints, and relationship strategy remain implementation
decisions.

## Data-flow reference

1. React sends a JSON request or, for an optional photo, a multipart upload.
2. Express middleware validates input and applies authentication and
   authorization.
3. The relevant feature module runs the business operation.
4. The backend reads/writes MongoDB and coordinates optional integrations.
5. The API returns an HTTP status and JSON result or error.
6. React displays the result.

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
- [ ] Define request status values and allowed transitions.
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

- [ ] Test successful and invalid problem reports.
- [ ] Test authentication and authorization boundaries.
- [ ] Test rental date validation, overlapping periods, and concurrent requests.
- [ ] Test request status updates and maintenance-history persistence.
- [ ] Test integration failures without leaking internal details.

## Decisions to track

The architecture does not define field-level validation limits, exact account
roles, booking state machines, rental pricing/payment, cancellation policies,
photo constraints, or notification triggers. Agree on those requirements before
treating the checklists as acceptance criteria.

For the product behavior baseline, see
[BUSINESS_RULES.md](./BUSINESS_RULES.md). For technical workflows and
implementation guidance, see
[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md).
