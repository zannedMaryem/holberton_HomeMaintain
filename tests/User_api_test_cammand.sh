#!/usr/bin/env bash
# API test commands for HomeMaintain.
# Run this file manually or copy/paste individual commands.
# Ensure the server is running at http://127.0.0.1:5000 before using.
#
# WORKFLOW: Most tests depend on IDs returned by previous calls.
# Follow this order: Users → 
# Replace placeholder IDs (USER_ID, etc.) with real ones as you go.


# ================================
#            Register User
# ================================

# Create a user → copy the returned "id" as USER_ID
# NOTE: response should only contain "id, full name, eamil and message : User registered successfully" — NEVER the password
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"Maryem","lastName":"Zanned","email":"maryem2@gmail.com","password":"Maryem123!"}'

# Create a seccond User
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"Jane","lastName":"Doe","email":"J.Doe@gmail.com","password":"JaneTheBrain123!"}'

# Create a third User
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"Dante","lastName":"Morette","email":"DanteMorette@gmail.com","password":"MoretteDon123!"}'
#-------------------
# --- Edge cases ---
#-------------------

# First name too short → expect 400
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"M","lastName":"Zanned","email":"maryemzan@gmail.com","password":"Maryem123!"}'

# Missing required field (last_name) → expect 400
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"Mary","email":"maryem1@gmail.com","password":"Maryem123!"}'

# Missing required field (password) → expect 400
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"Dameon","lastName":"Salvatore","email":"dameonloveselena@icloud.com"}'

# Invalid email adress (duplicate) → expect 400
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"Clara","lastName":"Bennet","email":"maryem2@gmail.com","password":"BennetHieress123!"}'

# Invalid email format → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Clara","lastName":"Bennet","email":"invalid-email","password":"BennetHieress123!"}'
#---------------------------------------
# --- Password validation edge cases ---
#---------------------------------------

# Password too short (under 8 chars) → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+1@gmail.com","password":"Sh0rt!"}'

# Password too long (over 72 chars) → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+2@gmail.com","password":"Aa1!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'

# Password missing uppercase letter → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+3@gmail.com","password":"lowercase1!"}'

# Password missing lowercase letter → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+4@gmail.com","password":"UPPERCASE1!"}'

# Password missing digit → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+5@gmail.com","password":"NoDigitsHere!"}'

# Password missing special character → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+6@gmail.com","password":"NoSpecial123"}'

# Password is not a string (number) → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+7@gmail.com","password":12345678}'

# Password is empty string → expect 400
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Dana","lastName":"Lee","email":"dana.lee+8@gmail.com","password":""}'

# Two users with the SAME password should get DIFFERENT hashes (verify manually in DB/storage, not via API)
# This confirms bcrypt's automatic salting — not directly testable via curl, just a reminder.

#=========================================
#              Login
#=========================================

curl -X POST http://localhost:5000/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"J.Doe@gmail.com","password":"JaneTheBrain123!"}'
#--------------------------------------
# -----------Edge Cases ---------------
#--------------------------------------

# Invalid Password → expect 401
curl -X POST http://localhost:5000/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"maryem2@gmail.com","password":"WrongPassword123!"}'

# Invalid Email → expect 401
curl -X POST http://localhost:5000/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"maryem2@gmail.com","password":"WrongPassword123!"}'

# Missing Email → expect 400
curl -X POST http://localhost:5000/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{"password":"Maryem123!"}'

# Missing Password → expect 400
curl -X POST http://localhost:5000/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"maryem2@gmail.com"}'

#=========================================
#              Update User
#=========================================
# Paste the token returned by login here. Keep this value private.
TOKEN="REPLACE_WITH_LOGIN_TOKEN"

# Authenticated user update requests require a bearer token.
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jenny"}'

# Profile update: missing fields → expect 400
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Profile update: first name is not a string → expect 400
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":123}'

# Profile update: first name too short → expect 400
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"J"}'

# Profile update: first name too long → expect 400
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"ThisFirstNameIsMoreThanFiftyCharactersLongAndShouldFail"}'

# Profile update: missing token → expect 401
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jenny"}'

#=========================================
#              Update Email
#=========================================

# Missing email → expect 400
curl -X PATCH http://localhost:5000/api/users/me/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Invalid email format → expect 400
curl -X PATCH http://localhost:5000/api/users/me/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'

# Email is not a string → expect 400
curl -X PATCH http://localhost:5000/api/users/me/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":123}'

# Email is already used by another account → expect 409
# Ensure the Jane Doe account above exists before running this case.
curl -X PATCH http://localhost:5000/api/users/me/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"j.doe@gmail.com"}'

# Email is unchanged → expect 409.
# Replace the value with the authenticated user's current email.
curl -X PATCH http://localhost:5000/api/users/me/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"CURRENT_USER_EMAIL"}'

# Update email successfully → expect 200; use a unique address
curl -X PATCH http://localhost:5000/api/users/me/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"maryem.updated@example.com"}'

#=========================================
#             Update Password
#=========================================

# Missing new password → expect 400
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"CURRENT_PASSWORD"}'

# Missing current password → expect 400
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NewPassword123!"}'

# New password is not a string → expect 400
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"CURRENT_PASSWORD","newPassword":12345678}'

# New password lacks complexity → expect 400
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"CURRENT_PASSWORD","newPassword":"weakpassword"}'

# New password is too short → expect 400
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"CURRENT_PASSWORD","newPassword":"Aa1!"}'

# New password is too long → expect 400
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"CURRENT_PASSWORD","newPassword":"Aa1!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'

# Wrong current password → expect 401
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"WrongPassword123!","newPassword":"NewPassword123!"}'

# Update password successfully → expect 200.
# Replace CURRENT_PASSWORD with the account's actual current password.
curl -X PATCH http://localhost:5000/api/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"CURRENT_PASSWORD","newPassword":"NewPassword123!"}'


#=========================================
#              Delete account
#=========================================

# Missing token → expect 401
curl -X DELETE http://localhost:5000/api/users/me

# Invalid token → expect 401
curl -X DELETE http://localhost:5000/api/users/me \
  -H "Authorization: Bearer invalid-token"

# Delete the authenticated account → expect 200.
# Run this last because it deletes the account associated with TOKEN.
curl -X DELETE http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN"

#===========================================
#               Admin
#===========================================

# IMPORTANT:
# Before running these tests, make sure an admin account exists and that both
# ADMIN_TOKEN and REGULAR_TOKEN contain valid JWTs for an admin and a non-admin
# user respectively. Replace the placeholder IDs below with real Mongo IDs.
#
# Recommended setup:
# 1) Create a regular user via /api/auth/register.
# 2) Create or promote an admin user in MongoDB (or another trusted setup step).
# 3) Login as both users and paste their returned tokens below.
#
# Example variables to update before use:
ADMIN_TOKEN="REPLACE_WITH_ADMIN_TOKEN"
REGULAR_TOKEN="REPLACE_WITH_NON_ADMIN_TOKEN"
ADMIN_ID="REPLACE_WITH_ADMIN_USER_ID"
TARGET_USER_ID="REPLACE_WITH_TARGET_USER_ID"
INVALID_ID="507f1f77bcf86cd799439011"

#-------------------------------------------
# --- Admin authentication & authorization ---
#-------------------------------------------

# Missing token → expect 401
curl -X GET http://localhost:5000/api/admin/users

# Invalid token format → expect 401
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer not-a-valid-token"

# Non-admin user cannot access admin route → expect 403
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $REGULAR_TOKEN"

# Admin can list all users → expect 200
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

#-------------------------------------------
# --- Admin get user by id ---
#-------------------------------------------

# Fetch a valid user by ID → expect 200
curl -X GET "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Fetch a user that does not exist → expect 404
curl -X GET "http://localhost:5000/api/admin/users/$INVALID_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Invalid ObjectId format → expect 400

curl -X GET "http://localhost:5000/api/admin/users/not-a-valid-id" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

#-------------------------------------------
# --- Admin update user by id ---
#-------------------------------------------

# Update a user with valid fields → expect 200
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Updated","lastName":"User","email":"updated.user@example.com","role":"technician"}'

# Empty payload → expect 400
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Invalid role → expect 400
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"superadmin"}'

# First name not a string → expect 400
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":123}'

# First name too short → expect 400
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"A"}'

# First name too long → expect 400
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"ThisFirstNameIsMoreThanFiftyCharactersLongAndShouldFail"}'

# Last name not a string → expect 400
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lastName":123}'

# Invalid email format → expect 400
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'

# Duplicate email on another account → expect 409 or 400 depending on validation path
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'

# User not found → expect 404
curl -X PATCH "http://localhost:5000/api/admin/users/$INVALID_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

#-------------------------------------------
# --- Admin delete user by id ---
#-------------------------------------------

# Delete a valid user → expect 200 with "User successfully deleted"
curl -X DELETE "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Deleting a non-existent user → expect 404
curl -X DELETE "http://localhost:5000/api/admin/users/$INVALID_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Deleting self should be blocked → expect 400
curl -X DELETE "http://localhost:5000/api/admin/users/$ADMIN_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Non-admin cannot delete a user → expect 403
curl -X DELETE "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $REGULAR_TOKEN"

#-------------------------------------------
# --- Admin stress checks ---
#-------------------------------------------

# Extra whitespace in names should be trimmed and accepted when valid
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"   M   ","lastName":"  Zanned  "}'

# Email case should be normalized to lowercase → expect 200
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"Mixed.CASE+USER@Example.COM"}'

# Role promotion to admin should succeed when valid → expect 200
curl -X PATCH "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Reattempt to delete an already deleted user → expect 404
curl -X DELETE "http://localhost:5000/api/admin/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
#===========================================

