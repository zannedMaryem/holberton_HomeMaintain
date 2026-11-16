#!/usr/bin/env bash
# Copy/paste API checks for services, technician profiles, job matching,
# applications, and homeowner assignment. Start the API and MongoDB first.
#
# Before running, replace tokens and IDs with values from the same test database.
# JOB_ID and DIRECT_ASSIGN_JOB_ID must come from the two create-job requests below.

API_URL="http://localhost:5000"
HOMEOWNER_TOKEN="REPLACE_WITH_HOMEOWNER_TOKEN"
OTHER_HOMEOWNER_TOKEN="REPLACE_WITH_DIFFERENT_HOMEOWNER_TOKEN"
TECHNICIAN_TOKEN="REPLACE_WITH_TECHNICIAN_TOKEN"
OTHER_TECHNICIAN_TOKEN="REPLACE_WITH_DIFFERENT_TECHNICIAN_TOKEN"
SERVICE_ID="REPLACE_WITH_ACTIVE_SERVICE_ID"
OTHER_SERVICE_ID="REPLACE_WITH_DIFFERENT_ACTIVE_SERVICE_ID"
JOB_ID="REPLACE_WITH_MATCHING_JOB_ID"
DIRECT_ASSIGN_JOB_ID="REPLACE_WITH_DIRECT_ASSIGNMENT_JOB_ID"
APPLICATION_ID="REPLACE_WITH_APPLICATION_ID"
TECHNICIAN_PROFILE_ID="REPLACE_WITH_TECHNICIAN_PROFILE_ID"
INVALID_ID="000000000000000000000000"

#=========================================
#            Service catalog
#=========================================

# Authenticated users can list active seeded services → expect 200
curl -i -X GET "http://localhost:5000/api/services" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Missing token → expect 401
curl -i -X GET "http://localhost:5000/api/services"

#=========================================
#       Technician self-profile access
#=========================================

# Homeowner cannot read or create a technician profile → expect 403
curl -i -X GET "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Homeowner profile","description":"Should be forbidden","offerings":[]}'

# Missing token → expect 401
curl -i -X GET "http://localhost:5000/api/technicians/me/profile"

# Technician with no profile yet → expect 404
curl -i -X GET "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Invalid/missing fields, empty offerings, and unsupported fields → expect 400
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"A","description":"Repair work","offerings":[]}'

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Sam Repair","description":"Home repairs","active":"yes","offerings":[]}'

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Sam Repair","description":"Home repairs","offerings":[],"role":"admin"}'

# Malformed, nonexistent/inactive, or duplicate service IDs → expect 400
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Sam Repair","description":"Home repairs","offerings":[{"serviceId":"not-an-id","governorates":["tunis"]}]}'

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Sam Repair","description":"Home repairs","offerings":[{"serviceId":"000000000000000000000000","governorates":["tunis"]}]}'

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Home repairs\",\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"tunis\"]},{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"ariana\"]}]}"

# Empty, unsupported, or repeated governorates → expect 400
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Home repairs\",\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[]}]}"

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Home repairs\",\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"not-a-governorate\"]}]}"

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Home repairs\",\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"tunis\",\"tunis\"]}]}"

# Create profile; each service declares the governorates it covers → expect 200
# Copy data.id to TECHNICIAN_PROFILE_ID.
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Residential repair specialist\",\"active\":true,\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"tunis\",\"ariana\"]}]}"

# Read own profile → expect 200 with service names and governorates
curl -i -X GET "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Deactivation does not prevent completion of an existing assignment → expect 200
curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/complete" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Updating the profile replaces its service/area coverage and can deactivate it → expect 200
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Updated residential repair specialist\",\"active\":false,\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"tunis\"]}]}"

# Reactivate with updated governorates before job matching → expect 200
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Updated residential repair specialist\",\"active\":true,\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"tunis\"]}]}"

#=========================================
#       Matching, applications, and assignment
#=========================================

# Create an open job for the service and governorate above → expect 201
# Copy data.id to JOB_ID.
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Repair leaking kitchen sink\",\"location\":\"tunis\",\"serviceId\":\"$SERVICE_ID\",\"description\":\"The kitchen sink pipe has a persistent water leak.\"}"

# Create a second, distinct open job for direct assignment → expect 201
# Copy data.id to DIRECT_ASSIGN_JOB_ID.
curl -i -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Repair broken kitchen tap\",\"location\":\"tunis\",\"serviceId\":\"$SERVICE_ID\",\"description\":\"The kitchen tap handle is broken and needs replacement.\"}"

# Homeowner sees only active technicians offering this job's service in its governorate → expect 200 
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/technicians" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Another homeowner cannot browse or review this job → expect 404 / 403
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/technicians" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN"

curl -i -X GET http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN

# Matching excludes technicians with the wrong governorate or service.
#! continue testing from here
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Updated residential repair specialist\",\"active\":true,\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"sfax\"]}]}"

curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/technicians" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Updated residential repair specialist\",\"active\":true,\"offerings\":[{\"serviceId\":\"$OTHER_SERVICE_ID\",\"governorates\":[\"tunis\"]}]}"

curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/technicians" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Restore a matching offering before application and assignment checks.
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Updated residential repair specialist\",\"active\":true,\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"tunis\"]}]}"

# A homeowner cannot submit a technician application → expect 403
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalMessage":"I can repair this job."}'

# Technician can apply with a proposal → expect 201; copy data.id to APPLICATION_ID
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalMessage":"I can inspect the pipe and repair the kitchen sink leak."}'

# Duplicate application → expect 409
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalMessage":"I can repair this leak."}'

# Empty proposal or unknown fields → expect 400
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalMessage":" "}'

curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalMessage":"I can help","proposedPrice":100}'

# Homeowner lists applications and accepts one → expect 200 and job status assigned
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"accept"}'

# Invalid decision / malformed application ID → expect 400
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"maybe"}'
#! after homeowner accepts should change the job application status to accepted 
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/applications/not-an-id" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"accept"}'

# Invalid profile ID → expect 400; valid but missing profile → expect 404
curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/assign" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"technicianProfileId":"not-an-id"}'

curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/assign" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"technicianProfileId\":\"$INVALID_ID\"}"

# A profile not offering the job service or governorate cannot be assigned → expect 409
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Updated residential repair specialist\",\"active\":true,\"offerings\":[{\"serviceId\":\"$OTHER_SERVICE_ID\",\"governorates\":[\"sfax\"]}]}"

curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/assign" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"technicianProfileId\":\"$TECHNICIAN_PROFILE_ID\"}"

#=========================================
#       Scheduling, completion, and ratings
#=========================================

# Use a future date so both standard intervention slots are available.
SCHEDULE_DATE="$(date -I -d tomorrow)"
PAST_DATE="$(date -I -d yesterday)"
RESCHEDULE_DATE="$(date -I -d '2 days')"

# Accepted application status is persisted and returned as accepted → expect 200
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Homeowner can see two four-hour time slots for an assigned job → expect 200
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/availability?date=$SCHEDULE_DATE" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Invalid and past dates are rejected → expect 400
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/availability?date=2028-02-30" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/availability?date=$PAST_DATE" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Another homeowner cannot inspect or reserve this job's appointment slots → expect 403
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/availability?date=$SCHEDULE_DATE" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/schedule" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$SCHEDULE_DATE\",\"slot\":\"morning\"}"

# Invalid slot and past date reservations are rejected → expect 400
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/schedule" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$SCHEDULE_DATE\",\"slot\":\"evening\"}"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/schedule" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$PAST_DATE\",\"slot\":\"morning\"}"

# Reserve the morning slot, then verify the same technician cannot be double-booked.
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/schedule" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$SCHEDULE_DATE\",\"slot\":\"morning\"}"

curl -i -X GET "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/availability?date=$SCHEDULE_DATE" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/schedule" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$SCHEDULE_DATE\",\"slot\":\"morning\"}"

# The separate afternoon slot remains reservable → expect 200
curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/schedule" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$SCHEDULE_DATE\",\"slot\":\"afternoon\"}"

# The assigned technician may also check availability and reschedule.
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/availability?date=$RESCHEDULE_DATE" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/schedule" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$RESCHEDULE_DATE\",\"slot\":\"afternoon\"}"

# A different technician cannot view or change this assignment's availability.
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/availability?date=$RESCHEDULE_DATE" \
  -H "Authorization: Bearer $OTHER_TECHNICIAN_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/schedule" \
  -H "Authorization: Bearer $OTHER_TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$RESCHEDULE_DATE\",\"slot\":\"morning\"}"

# A different homeowner cannot cancel; the owner can cancel and reopen the job.
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/cancel" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/cancel" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/cancel" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# Repeated cancellation conflicts, and the previous accepted proposal is cancelled.
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/cancel" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

# The previous applicant can submit a new proposal after the assignment is cancelled.
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalMessage":"I am available for this repair again."}'

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"accept"}'

# Re-book after reassignment so the remaining completion/rating checks can proceed.
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/schedule" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$SCHEDULE_DATE\",\"slot\":\"morning\"}"

# Neither party may rate until the technician marks the job complete → expect 409
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":5}'

# Only the assigned technician can complete this job; repeat completion is rejected.
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $OTHER_TECHNICIAN_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# A completed job can no longer be cancelled and reopened → expect 409
curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/cancel" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X PATCH "http://localhost:5000/api/jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# The assigned technician can still read their completed job → expect 200
curl -i -X GET "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

# Invalid scores are rejected; each participant can submit one 1-5 rating.
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":0}'

# A different homeowner cannot rate this job → expect 403
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":5}'

curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":5}'

curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":4}'

curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":1}'

# A different technician cannot rate the homeowner for this job → expect 403
curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $OTHER_TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":4}'

curl -i -X POST "http://localhost:5000/api/jobs/$JOB_ID/ratings" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":5}'

# Restore matching service and governorate, then directly assign → expect 200
curl -i -X PUT "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Sam Repair\",\"description\":\"Updated residential repair specialist\",\"active\":true,\"offerings\":[{\"serviceId\":\"$SERVICE_ID\",\"governorates\":[\"tunis\"]}]}"

curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/assign" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"technicianProfileId\":\"$TECHNICIAN_PROFILE_ID\"}"

# Direct assignment by a different homeowner → expect 403
curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/assign" \
  -H "Authorization: Bearer $OTHER_HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"technicianProfileId\":\"$TECHNICIAN_PROFILE_ID\"}"

# Reassigning an already assigned job → expect 409
curl -i -X PATCH "http://localhost:5000/api/jobs/$DIRECT_ASSIGN_JOB_ID/assign" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"technicianProfileId\":\"$TECHNICIAN_PROFILE_ID\"}"

# Technicians can deactivate their profile without deleting historical job data.
curl -i -X DELETE "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $HOMEOWNER_TOKEN"

curl -i -X DELETE "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"

curl -i -X GET "http://localhost:5000/api/technicians/me/profile" \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"