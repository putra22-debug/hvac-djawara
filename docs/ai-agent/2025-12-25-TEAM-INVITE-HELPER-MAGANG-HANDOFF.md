# AI Agent Handoff — December 25, 2025
## Team Invitations Activation + Helper/Magang Role Enablement (People Management)

**Session Date:** December 25, 2025  
**Scope:** Fix team member invitation activation flow, enable helper/magang as addable roles, deploy updates.

---

## 1) What’s Live Now (High-Level)

### Team member invitations (People → Add Member)
- People Management can create **team invitations** in `team_invitations`.
- New invite URL is **`/team/invite/[token]`** (NOT `/invite/[token]`).
- Invite page lets user set password and activates account.

### Helper & Magang
- `helper` and `magang` roles are now **addable** from People Management (same invitation mechanism).

---

## 2) Key Fix / Root Cause

Previously, `/api/people/add-member` generated invite links to **`/invite/[token]`**, but that route is used for **Client Portal invitations**.
This created a mismatch where team invites could not be activated correctly.

Fix:
- Team invitations now use a dedicated route: **`/team/invite/[token]`**.

---

## 3) How Activation Works

### Flow
1. Admin creates invitation (People Management → Add Member).
2. System inserts `team_invitations` row and returns an invitation URL.
3. Invited user opens `/team/invite/[token]`, sets password.
4. API:
   - Creates or updates Supabase Auth user (service role)
   - Upserts `profiles`
   - Ensures `user_tenant_roles` exists (so user appears in `get_team_members`)
   - Marks `team_invitations` as `accepted` and sets `user_id`

### Redirect
- Tech-like roles redirect to technician login with prefilled email.
- Other roles redirect to staff login with prefilled email.

---

## 4) Files Added / Updated

### New
- `app/team/invite/[token]/page.tsx` — public page to set password and activate a team invite
- `app/api/people/complete-team-invite/route.ts` — service-role activation endpoint

### Updated
- `app/api/people/add-member/route.ts`
  - Generates URL: `/team/invite/[token]`
  - Allows `tech_head` to create invitations (in addition to owner/admin roles)
- `app/dashboard/people/people-client.tsx`
  - Adds `helper` + `magang` to addable roles
  - Copies/shows invite URLs as `/team/invite/[token]`

---

## 5) Notes / Constraints

- This invite activation uses Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`).
- The helper function that finds an existing auth user by email uses `admin.auth.admin.listUsers()` pagination fallback.
  - Works in practice but is not ideal at very large user counts.

---

## 6) Deployment Notes

- Deploy triggers by pushing to `origin/main` (and mirror `putra22/main` if needed).
- This session was pushed to both remotes.
