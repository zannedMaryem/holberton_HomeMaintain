# HomeMaintain

HomeMaintain is a proposed web application for helping people resolve household
maintenance problems. A user identifies a problem, explores possible solutions,
and can choose a DIY repair, equipment rental, or professional assistance. The
application is also intended to support a record of completed maintenance.

## Project status

The current repository contains project documentation and a proposed system
architecture. It does not yet contain an application implementation. References
to the MERN stack, API routes, database collections, workflows, and external
services describe the planned MVP unless explicitly stated otherwise.

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

## Planned MVP journey

1. Identify and describe a household maintenance problem.
2. Review relevant assessment information and available solutions.
3. Choose a DIY guide, request equipment, or contact a professional.
4. Record completed maintenance activity.

## Planned technology

The architecture proposes MongoDB, Express.js, React, and Node.js (MERN).
Problem-photo storage and email notifications are optional integrations and
are not prerequisites for the core MVP.

## Documentation conventions

The architecture and related documents are a design baseline, not evidence that
a feature is already implemented. Concrete product choices that are not
specified in the architecture are identified as decisions to confirm rather
than presented as settled requirements.
