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
