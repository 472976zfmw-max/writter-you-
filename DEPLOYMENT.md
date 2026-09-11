# WriteRight deployment split

The project now has two independently deployable static surfaces:

- `index.html` is the customer app. Deploy it as the public ordering and order-tracking site.
- `team.html` is the private team dashboard. Deploy it behind authentication or on a restricted admin host.

Both pages share `styles.css`, while customer interactions live in `app.js` and team-only interactions live in `team.js`. This keeps the customer bundle from containing dashboard behavior and makes it straightforward to move the dashboard behind a separate domain later.

For a static host, upload each HTML file with the shared stylesheet and its matching JavaScript file. The customer dashboard link points to `team.html` in the same host by default; change that href to the private dashboard URL when the team app is deployed separately.

The browser demo remains available as a fallback, but production orders now use the Vercel `/api` routes and Supabase tables. Apply `supabase/schema.sql`, add the values from `.env.example` to Vercel Project Settings, and deploy from the repository root.

When a customer completes the details step, their homework submission is stored under the same demo order. The team dashboard reads and displays the customer's name, phone, subject, grade, page count, pasted text, uploaded file names, ink colour, handwriting style, and special instructions in the “Latest customer submission” panel.

## Production setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_ANON_KEY`, and `TEAM_EMAILS` as Vercel environment variables. Never expose the secret key in browser code.
3. Import this repository into Vercel and deploy. The customer app submits to `/api/orders`; tracking reads `/api/orders/:orderId`.
4. Protect `team.html` with Vercel access protection or a Supabase Auth login before giving the URL to staff. The team API route requires a bearer token and should be connected to your Supabase Auth session.
5. Connect your custom domain to Vercel. Keep the customer and team pages on the same project/origin so storage and live updates work consistently.

The current code includes the production database/API foundation, but payment-gateway credentials, Supabase Auth login UI, and real file uploads must be configured with your provider credentials before accepting real orders.
## 