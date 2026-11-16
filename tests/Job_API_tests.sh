#!/usr/bin/env bash
# Copy/paste curl checks for the HomeMaintain job API.
# Start the backend and MongoDB at http://localhost:5000 before testing.
#
# Before running:
# 1. Log in as a homeowner and copy the JWT into HOMEOWNER_TOKEN.
# 2. Log in as another homeowner and copy that JWT into OTHER_HOMEOWNER_TOKEN.
# 3. Log in as a technician and copy the JWT into TECHNICIAN_TOKEN.
# 4. Log in as an admin and copy the JWT into ADMIN_TOKEN.
# 5. Fetch /api/services and copy the Plumbing repair id into JOB_SERVICE_ID.
# 6. Choose one supported governorate ID returned by /api/governorates for
#    JOB_LOCATION, for example "tunis".
#
# Run the create-job request before requests that use JOB_ID; copy data.id from
# its response. The final delete request permanently deletes that test job.

API_URL="http://localhost:5000"
HOMEOWNER_TOKEN="REPLACE_WITH_HOMEOWNER_TOKEN"
OTHER_HOMEOWNER_TOKEN="REPLACE_WITH_DIFFERENT_HOMEOWNER_TOKEN"
TECHNICIAN_TOKEN="REPLACE_WITH_TECHNICIAN_TOKEN"
ADMIN_TOKEN="REPLACE_WITH_ADMIN_TOKEN"
JOB_SERVICE_ID="REPLACE_WITH_ACTIVE_SERVICE_ID"
SERVICE_ID_TO_MANAGE="REPLACE_WITH_ID_FROM_SERVICE_CREATE_RESPONSE"
SERVICE_ID_TO_DELETE="REPLACE_WITH_UNUSED_SERVICE_ID"
JOB_LOCATION="tunis"
JOB_ID="REPLACE_WITH_ID_FROM_CREATE_RESPONSE"
INVALID_ID="000000000000000000000000"

#=========================================
#               List services
#=========================================

# Authenticated user can fetch the seeded active services → expect 200
# Copy a service id from data[] into JOB_SERVICE_ID.
curl -i -X GET "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# No token → expect 401
curl -i -X GET "http://localhost:5000/api/services"

#=========================================
#             List locations
#=========================================

# Authenticated user can fetch the 24 supported Tunisia governorates → expect 200
# Use one data[].id as JOB_LOCATION in job create/update/filter requests.
curl -i -X GET "http://localhost:5000/api/governorates" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# No token → expect 401
curl -i -X GET "http://localhost:5000/api/governorates"

#=========================================
#             List open jobs
#=========================================

# No token → expect 401
curl -i -X GET "http://localhost:5000/api/jobs"

# Homeowner cannot browse the technician job board → expect 403
curl -i -X GET "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Technician can list open jobs; status is open even when omitted → expect 200
# Each data[] item includes reporter { id, fullName } and service { id, name }.
# Response also includes pagination { page, limit, hasMore }.
curl -i -X GET "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# The only supported status query is open → expect 200
curl -i -X GET "http://localhost:5000/api/jobs?status=open" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Default page is 1 and default limit is 20 → expect 200
curl -i -X GET "http://localhost:5000/api/jobs?page=1" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Request page 2 with 5 jobs per page → expect 200
curl -i -X GET "http://localhost:5000/api/jobs?page=2&limit=5" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Filter by an active service → expect 200
curl -i -X GET "http://localhost:5000/api/jobs?serviceId=$JOB_SERVICE_ID" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# location is the house's governorate ID, not a room or interior location → expect 200
curl -i -X GET "http://localhost:5000/api/jobs?location=$JOB_LOCATION" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Filters can be combined; only open jobs are returned → expect 200
curl -i -X GET "http://localhost:5000/api/jobs?status=open&page=1&limit=10&serviceId=$JOB_SERVICE_ID&location=$JOB_LOCATION" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Oversized limit is capped at 100; inspect pagination.limit → expect 200
curl -i -X GET "http://localhost:5000/api/jobs?limit=500" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Invalid page or limit values → expect 400
curl -i -X GET "http://localhost:5000/api/jobs?page=0&limit=-1" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Excessively large page offset → expect 400
curl -i -X GET "http://localhost:5000/api/jobs?page=999999999999999&limit=100" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Unsupported status → expect 400
curl -i -X GET "http://localhost:5000/api/jobs?status=closed" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Malformed service ID → expect 400
curl -i -X GET "http://localhost:5000/api/jobs?serviceId=not-an-object-id" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Well-formed but unknown/inactive service ID → expect 400
curl -i -X GET "http://localhost:5000/api/jobs?serviceId=000000000000000000000000" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Unsupported location (not one of the returned governorate IDs) → expect 400
curl -i -X GET "http://localhost:5000/api/jobs?location=kitchen" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

#=========================================
#               Create a job
#=========================================

# No token → expect 401
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the kitchen sink.\"}"

# Technician cannot create homeowner listings → expect 403
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the kitchen sink.\"}"

# Valid open job → expect 201; copy data.id into JOB_ID
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the kitchen sink.\"}"

# A service referenced by a job cannot be deleted → expect 409
curl -i -X DELETE "http://localhost:5000/api/services/$JOB_SERVICE_ID" \
  -H "Authorization: ******"

# Identical open-job details for the same homeowner → expect 409
# The unique partial MongoDB index prevents duplicates even for concurrent requests.
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the kitchen sink.\"}"

# Same homeowner/location/service/description is a duplicate even if title differs → expect 409
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Another leaking sink title\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\" WATER IS LEAKING UNDER THE KITCHEN SINK. \"}"

# Empty object or array instead of a job object → expect 400
#! currently returns {"message":"title must be a string"}
#? should return empty body pr please enter the job information
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[]'

# Free-text service is not accepted; use serviceId → expect 400
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"service\":\"Plumbing\",\"description\":\"Water is leaking under the sink.\"}"

# Missing title, location, serviceId, or description → expect 400
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the sink.\"}"

curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the sink.\"}"

curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"description\":\"Water is leaking under the sink.\"}"

curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\"}"

# Unsupported location / non-string location → expect 400
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Leaking kitchen sink","location":"inside the kitchen","serviceId":"000000000000000000000000","description":"Water is leaking under the sink."}'

curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":42,\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the sink.\"}"

# Invalid category ID → expect 400
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"not-an-id\",\"description\":\"Water is leaking under the sink.\"}"

# Valid-format but nonexistent/inactive service ID → expect 400
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Leaking kitchen sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"000000000000000000000000\",\"description\":\"Water is leaking under the sink.\"}"

# Title shorter than 8 characters or longer than 72 → expect 400
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Sink\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the sink.\"}"

curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"1234567890123456789012345678901234567890123456789012345678901234567890123\",\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"Water is leaking under the sink.\"}"

#=========================================
#                Get a job
#=========================================
#! finish testing from here
# Job owner can view their job with reporter full name and service details → expect 200
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Another homeowner cannot view this job → expect 403
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN"

# Technician can view an open job → expect 200
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Admin can view any job → expect 200
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# No token / malformed ID / valid but missing job ID → expect 401 / 400 / 404
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID"

curl -i -X GET "http://localhost:5000/api/jobs/not-a-valid-id" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X GET "http://localhost:5000/api/jobs/$INVALID_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

#=========================================
#                Update a job
#=========================================

# Update title; response includes reporter full name and service details → expect 200
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated leaking kitchen sink"}'

# Update the house location using a governorate ID, service, and description → expect 200
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"location\":\"$JOB_LOCATION\",\"serviceId\":\"$JOB_SERVICE_ID\",\"description\":\"The pipe below the kitchen sink is leaking.\"}"

# Empty update object / blank description → expect 400
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"   "}'

# Unsupported location or invalid service ID → expect 400
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location":"inside the kitchen"}'

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"not-an-id"}'

# Status is not homeowner-editable → expect 400
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# No token / other homeowner / technician → expect 401 / 403 / 403
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title"}'

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Unauthorized edit"}'

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Unauthorized edit"}'

# Malformed ID / valid but missing job ID → expect 400 / 404
curl -i -X PATCH "http://localhost:5000/api/jobs/not-a-valid-id" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title"}'

curl -i -X PATCH "http://localhost:5000/api/jobs/$INVALID_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title"}'

#=========================================
#                Delete a job
#=========================================

# No token / other homeowner / technician → expect 401 / 403 / 403
curl -i -X DELETE "http://localhost:5000/api/jobs/$JOB_ID"

curl -i -X DELETE "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN"

curl -i -X DELETE "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Malformed ID / valid but missing job ID → expect 400 / 404
curl -i -X DELETE "http://localhost:5000/api/jobs/not-a-valid-id" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X DELETE "http://localhost:5000/api/jobs/$INVALID_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Delete the test job owned by this homeowner → expect 200
# Do this last; deletion is permanent.
curl -i -X DELETE "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Deleting the same job again → expect 404
curl -i -X DELETE "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

#=========================================
#       Create and manage services
#=========================================

# Admin creates an active service; copy data.id into SERVICE_ID_TO_MANAGE → expect 201
curl -i -X POST "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Window repair"}'

# Same name generates the same slug and conflicts → expect 409
curl -i -X POST "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Window repair"}'

# Homeowner cannot create a service → expect 403
curl -i -X POST "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Window repair"}'

# No token → expect 401
curl -i -X POST "http://localhost:5000/api/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Window repair"}'

# Missing/blank/too-short name or extra field → expect 400
curl -i -X POST "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -i -X POST "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":" "}'

curl -i -X POST "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"A"}'

curl -i -X POST "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Window repair","active":false}'

# Deactivate the new service → expect 200 with active=false
curl -i -X PATCH "http://localhost:5000/api/services/$SERVICE_ID_TO_MANAGE/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":false}'

# Inactive service is omitted from the active list → expect 200
curl -i -X GET "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# The legacy categoryId job field is no longer accepted; send serviceId → expect 400
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Repair a damaged window\",\"location\":\"$JOB_LOCATION\",\"categoryId\":\"$SERVICE_ID_TO_MANAGE\",\"description\":\"The window frame needs repair.\"}"

# Reactivate it → expect 200 with active=true
curl -i -X PATCH "http://localhost:5000/api/services/$SERVICE_ID_TO_MANAGE/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":true}'

# Reactivated service is listed again → expect 200
curl -i -X GET "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Homeowner cannot change service status → expect 403
curl -i -X PATCH "http://localhost:5000/api/services/$SERVICE_ID_TO_MANAGE/status" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":false}'

# Status must be a boolean and no other fields are accepted → expect 400
curl -i -X PATCH "http://localhost:5000/api/services/$SERVICE_ID_TO_MANAGE/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":"false"}'

curl -i -X PATCH "http://localhost:5000/api/services/$SERVICE_ID_TO_MANAGE/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":false,"name":"Other"}'

# No token / malformed ID / unknown ID → expect 401 / 400 / 404
curl -i -X PATCH "http://localhost:5000/api/services/$SERVICE_ID_TO_MANAGE/status" \
  -H "Content-Type: application/json" \
  -d '{"active":false}'

curl -i -X PATCH "http://localhost:5000/api/services/not-an-object-id/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":false}'

curl -i -X PATCH "http://localhost:5000/api/services/$INVALID_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":false}'

#=========================================
#              Delete a service
#=========================================

# Run this section last and only against a test database.
# SERVICE_ID_TO_DELETE must be an unused service record.
# Deletion is permanent; create a replacement service if needed.

# No token → expect 401
curl -i -X DELETE "http://localhost:5000/api/services/$SERVICE_ID_TO_DELETE"

# Authenticated non-admin cannot delete a service → expect 403
curl -i -X DELETE "http://localhost:5000/api/services/$SERVICE_ID_TO_DELETE" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X DELETE "http://localhost:5000/api/services/$SERVICE_ID_TO_DELETE" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Malformed service ID → expect 400
curl -i -X DELETE "http://localhost:5000/api/services/not-an-object-id" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Well-formed but unknown service ID → expect 404
curl -i -X DELETE "http://localhost:5000/api/services/$INVALID_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Delete an existing, unused service → expect 200 and a deletion confirmation
# Expect {"message":"Service deleted successfully"}
curl -i -X DELETE "http://localhost:5000/api/services/$SERVICE_ID_TO_DELETE" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Repeating the deletion → expect 404
curl -i -X DELETE "http://localhost:5000/api/services/$SERVICE_ID_TO_DELETE" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Deleted service should no longer appear in the active service list → expect 200
curl -i -X GET "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Old URL remains a compatibility alias to the same service list → expect 200
curl -i -X GET "http://localhost:5000/api/job-categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
