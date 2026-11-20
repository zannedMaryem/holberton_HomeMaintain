# Deployment

## Render API

Create a Render Blueprint from this repository using the checked-in `render.yaml`, or create a **Web Service** and choose Docker. The service uses `backend/Dockerfile` with `backend` as the build context. Render supplies `PORT`; the API listens on it.

Add these environment variables in Render:

- `MONGODB_URI`: your MongoDB connection string
- `JWT_SECRET`: a long, random secret
- `CORS_ORIGIN`: your Vercel site origin, for example `https://your-project.vercel.app`. Separate multiple allowed origins with commas.

The API health endpoint is `/api/health`.

## Vercel frontend

Import the repository into Vercel and set the project **Root Directory** to `frontend`. Vercel detects Vite and uses `npm run build` with `dist` as the output directory. The checked-in `frontend/vercel.json` enables client-side routes and deep links.

In the Vercel project environment variables, set:

- `VITE_API_BASE_URL`: the full Render API URL ending with `/api`, for example `https://your-api.onrender.com/api`

Redeploy after changing this variable; Vite embeds it during the build.

## Optional Render frontend container

The frontend also has a Docker image. Create a separate Render Web Service with Dockerfile `frontend/Dockerfile` and build context `frontend`. Set `VITE_API_BASE_URL` to the same full Render API URL. Render makes service environment variables available as Docker build arguments. The container serves the static site on port `10000` and supports client-side routes.

Keep secrets in Render's environment settings. Do not put backend credentials in frontend environment variables or commit them to the repository.
