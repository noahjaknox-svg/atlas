# Supabase auth email templates

These files are the source of truth for Atlas's Supabase auth emails, but Supabase
does not read them from the repo. After changing one, paste it into **each** project's
dashboard: Authentication → Emails → Templates (staging `wkkgtnaokqhbikblapbp`,
production `hfasfrtyigtvvmwqaihb`). The subject line is in each file's header comment.

## Token-hash links (reset, invite, confirm signup)

`reset-password.html`, `invite-user.html` and `confirm-signup.html` link straight to
our app with a `token_hash`, not Supabase's `{{ .ConfirmationURL }}`:

```
{{ .SiteURL }}/auth/callback/recovery?token_hash={{ .TokenHash }}&type=recovery
{{ .SiteURL }}/auth/callback/invite?token_hash={{ .TokenHash }}&type=invite
{{ .SiteURL }}/auth/callback/invite?token_hash={{ .TokenHash }}&type=signup
```

`{{ .ConfirmationURL }}` points at Supabase's `/auth/v1/verify`, which spends the
single-use token on a plain GET — so email security scanners that pre-open links
(Microsoft Safe Links, Proofpoint, …) burned it before the recipient clicked, and every
link showed "expired". With a token hash, the page at `/auth/callback/*` does nothing
until the user clicks **Continue**, which calls `supabase.auth.verifyOtp` in the browser
(`components/auth-callback-content.tsx`).

`{{ .SiteURL }}` is the project's Site URL (Authentication → URL Configuration), so it
must be correct per project: `https://staging.prismjet.space` on staging,
`https://www.prismjet.space` on production.

**Deploy order:** the app must already have the token-hash callback code before a
project's templates are switched, or that environment's links will break. Update
production templates only after the code is on `main`.
