# Product Designer Portfolio

A responsive, CMS-driven portfolio implementation based on the supplied Figma screenshots. The public site and `/admin/` share one Supabase JSON content record, while a filtered public view prevents draft projects, certificates, experience entries, and collaborator feedback from being exposed.

## Run locally

1. Start a static server with `npm run serve`.
2. Open `http://localhost:4173/`.
3. Open `http://localhost:4173/admin/` for the CMS.

No dependency installation is required. Run `npm run check`, `npm test`, and `npm run build` for verification.

## Supabase setup

1. Review and run `supabase-schema.sql` in a safe Supabase project. Do not run it blindly against production.
2. Create a public Storage bucket named `portfolio`.
3. Copy `config.example.js` to `config.js` and add the project URL and anon key.
4. Configure invitation-only access and add the invited buyer's UUID to `admin_users` using the instructions below.
5. Insert the existing CMS content as the `site` row. The included SQL uses `on conflict do nothing`, so existing edited data is not overwritten.

The browser uses only the anon key. Authentication, admin authorization, content updates, and uploads remain protected by Row Level Security. Uploaded objects are never automatically deleted because URLs may be shared by multiple records.

## Buyer activation (one Supabase project per buyer)

Use a separate Vercel deployment and Supabase project for each buyer. This schema stores only one `site` record; sharing a Supabase project between buyers would give its admins access to the same content and uploads.

Before sending an invitation:

1. In Supabase Authentication settings, disable **Allow new users to sign up**. Keep email authentication enabled; disable anonymous sign-ins and unused auth providers. Public signup must be disabled in Supabase, not merely hidden in the UI.
2. Set the Authentication **Site URL** to `https://YOUR-DOMAIN/admin/`. Add that exact URL to the redirect allowlist. Avoid wildcard preview domains in production. Keep the trailing slash. Dashboard invitations use the Site URL.
3. Configure production SMTP and test delivery. Set password minimum length to at least 12 in Supabase as well as the UI, enable available password strength/leaked-password protection, set a short email-link expiry (for example one hour), and review Auth rate limits for login and recovery.
4. Keep the standard invite and recovery email templates using `{{ .ConfirmationURL }}`. These pages handle Supabase's implicit redirect with `#access_token=...&type=invite` or `type=recovery`. Custom PKCE/code or token-hash email templates are not supported by this implementation.
5. Apply the reviewed schema, create the Storage bucket, and seed the `site` content record. Set only the project URL and public anon key in `config.js`. Never put a `service_role`/secret key in browser files or the public deployment.

For each purchase:

1. Obtain the buyer's email address; do not request their password.
2. In Supabase **Authentication > Users**, choose **Invite user** and enter their email. No public invitation endpoint is deployed.
3. Copy the invited user's UUID from Authentication and grant access in SQL Editor before asking them to activate:

   ```sql
   insert into public.admin_users (user_id)
   values ('INVITED_USER_UUID')
   on conflict (user_id) do nothing;
   ```

4. The buyer opens the email link, creates and confirms their password, and signs in at `/admin/`. If they open it before step 3, access is denied; finish the grant, then ask them to reopen the link or request a password reset. Expired/used links require a fresh invitation or reset.
5. Existing owners use **Forgot password?** on the login page. The response does not disclose whether an address exists. Password changes attempt to revoke refresh sessions; previously issued access tokens can remain valid until expiry. Use an appropriately short JWT lifetime.

Only trusted dashboard/server operations may grant `admin_users` membership. Neither registration, user-editable metadata, nor the link's `type` grants admin privileges. RLS remains the authority for database and Storage access. To revoke a buyer's editor access immediately, delete their `admin_users` row; to disable their account too, manage it in Supabase Authentication.

### Production verification

Using a disposable buyer account, verify invitation delivery, activation, login, saving and uploads, password recovery, and rejection of expired/reused links. Verify that direct public signup fails, an authenticated account absent from `admin_users` cannot read private content/update/upload/grant membership, and a user from a different buyer's Supabase project cannot access this project. Local automated tests mock Supabase; they cannot confirm deployed Auth settings or RLS policies.

## Asset guidance

- Logo: recommended `800 x 240 px`, `10:3`, transparent PNG or WebP, maximum 10 MB. Square and alternate ratios remain proportional through `object-fit: contain`.
- Portrait: recommended `1200 x 1600 px`, `3:4`, transparent PNG or WebP, maximum 10 MB. Use a half-body crop with the complete head, hair, shoulders, and torso visible.
- About/experience photo: recommended `1200 x 1400 px`, `6:7`.
- Project main image: recommended `1600 x 1000 px`, `8:5`.
- Project thumbnail: recommended `1200 x 900 px`, `4:3`.
- Certificate: recommended `1600 x 1100 px`.
- CV: PDF, maximum 10 MB; a direct URL is also supported.

Projects can be marked as homepage highlights, certificates support issuer and publication year, and Experience descriptions and skills use repeatable fields in the admin editor.

## Font

The interface loads Urbanist from Google Fonts using weights 400, 500, 600, 700, and 800 with the Google Fonts stylesheet. Urbanist is licensed under the SIL Open Font License 1.1 and permits commercial web use. The browser uses its normal swap behavior from the Google Fonts CSS; for a fully self-hosted deployment, download official WOFF2 files from the Google Fonts repository and declare them with `font-display: swap`.

## Routing

Project cards use `project.html?slug=project-slug`. A production host can rewrite legacy `/projects/:slug` paths to `project.html?slug=:slug`. No prior route list was present in the supplied workspace, so exact legacy redirects must be added when those URLs are available.
