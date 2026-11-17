# Frontend flow and file map

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

## Reading the frontend as a beginner

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
