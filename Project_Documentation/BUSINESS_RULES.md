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
| BR-03 | The application presents possible solution paths: DIY repair, equipment rental, and professional assistance. | Core application purpose. |
| BR-04 | A DIY guide should include relevant repair guidance and safety information. | Supported by the proposed guides module. |
| BR-05 | Equipment rental requests are subject to equipment availability for the requested period. | Availability checking is required by the architecture. |
| BR-06 | Professional service requests are associated with a professional profile and requested service. | Supported by the proposed professionals module. |
| BR-07 | Rental and professional-service requests have a status that can be communicated to the user. | Request status and updates are part of the proposed modules. Exact states are **Confirm**. |
| BR-08 | Completed repairs and maintenance activities can be recorded in maintenance history. | Supported by the proposed maintenance-history module. |
| BR-09 | Operations that require an account or elevated permissions must be authenticated and authorized by the backend. | Authentication and authorization are backend responsibilities. Which operations are protected is **Confirm**. |
| BR-10 | The browser must not connect directly to the database or receive database credentials. | Architecture security requirement. |

## Workflow: report and assess a problem

1. The user selects a problem location and category and enters a description.
2. The user may attach a photograph if that capability is enabled.
3. The application validates the request on the server and checks applicable
   access permissions.
4. The backend stores the problem and any image reference.
5. The application returns a result; the user can continue to assessment and
   solution selection.

The architecture gives `POST /api/problems` as an example endpoint only. The
route is not an implemented or final API contract.

## Workflow: request equipment

1. The user browses equipment and selects an item and rental period.
2. The server validates the request and checks availability for the requested
   period before accepting it.
3. The backend stores the rental request and its status.
4. The application displays the result and, if configured, sends request
   updates by email.

**Confirm:** rental-period limits, overlap/boundary semantics, pricing, payment,
approval, cancellation, return, and the allowed status transitions.

## Workflow: request professional service

1. The user finds a professional and selects an offered service.
2. The server validates the request and checks the user's authorization where
   required.
3. The backend stores the service request and its status.
4. The application displays the result and, if configured, sends updates.

**Confirm:** scheduling rules, technician acceptance, cancellations, fees,
dispute handling, and status transitions.

## Validation responsibilities

Validation must be performed by the backend; client-side checks may improve
usability but are not a substitute.

| Input or operation | Minimum validation responsibility |
| --- | --- |
| Problem report | Require the fields agreed for the MVP; validate their shape and acceptable size; reject malformed data. The architecture does not define exact field limits. |
| Photograph | If enabled, check permitted file type and size and safely store it through the configured storage service. Exact limits and supported formats are **Confirm**. |
| Rental request | Require a valid equipment reference and rental period; reject invalid dates and unavailable/conflicting periods. |
| Professional request | Require a valid professional/service reference and the agreed request details. |
| Maintenance record | Validate required record details and ensure the actor can create or access the record. Exact fields and access policy are **Confirm**. |
| Protected operation | Authenticate the user and authorize the action on the server. |

Validation failures should return an appropriate HTTP error and a useful,
consistent response without disclosing stack traces or sensitive information.

## Product decisions to confirm

- Account roles and which actions each role may perform.
- Required fields and field limits for problems, requests, and history records.
- Rental and service-request states and permitted transitions.
- Rental scheduling, availability, payment, cancellation, and return policies.
- Professional scheduling and cancellation policies.
- Photo formats, limits, retention, and access rules.
- Whether email notifications are in scope for the MVP.
