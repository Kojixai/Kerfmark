# Brackenbury OS

Working prototype of the back office for Brackenbury Home: estimating, projects, client portal, workshop, people, compliance and money. Next.js 16, React 19, TypeScript, three.js. All data is invented demo data (apart from Brackenbury's own company details) and lives in the browser, so it runs with no backend.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # costing engine and nesting tests
npm run build
```

## Deploy on Vercel

Import the repo in Vercel. It detects Next.js; no environment variables or settings are needed. Every visitor gets their own copy of the demo data in their browser, and **Access and demo → Reset demo data** puts it back.

## Deploy on the Hetzner server (auther.co.uk)

On the server, from any checkout of this repo:

```bash
sudo CERTBOT_EMAIL=you@example.com bash deploy/setup.sh
```

It installs Node 22 if needed, clones to `/srv/kerfmark`, builds, runs the app as a systemd service on `127.0.0.1:3005`, adds an nginx site for `auther.co.uk` and `www.auther.co.uk` only, and gets a Let's Encrypt certificate. It stops without changing anything if another nginx file already names `auther.co.uk` or port 3005 is taken, so auther.app is never touched. Re-run it to deploy updates.

## What to try

The overview has three worked projects.

- **P-2051 Walnut and brass sideboard** is being estimated from a client PDF. Clear the checks, drag the margin, change the width or number of bays and watch the cutting list, sheet layouts, drawing, price and 3D model all follow. Add a second item, send the quote, then on the project page click *Approve as the client*, sign, and the deposit invoice is raised. Keep clicking the next step through to the final invoice.
- **P-2045 ACJ320 cabin furniture** is aviation work on honeycomb panel with a fire-retardant finish, already approved.
- **P-2043 Saloon furniture, 62m yacht** has four items including labour-only upholstery and shipping, and a margin hit from a leather price rise.

Use **New enquiry** on the pipeline to start one from scratch. Switch role with the button at the bottom of the sidebar to see what the workshop, a fitter or a client can see.

## How it fits together

| Path | What |
| --- | --- |
| `lib/estimate.ts` | Costing engine: materials by unit (sheets nested, linear, m3 with yield, m2, each), edging, finishing area, labour by operation, subcontract ranges, overheads on labour or all costs, margin on price, and the "check before sending" list |
| `lib/nest.ts` | MaxRects sheet nesting with kerf, trim and grain direction |
| `lib/parametric.ts` | Cabinet, bookcase and table generators that output a full cutting list with 3D positions |
| `lib/store.ts` | Demo state and every action (send quote, approve, advance stage, invoices, chases). Each one maps to a Supabase insert/update or RPC in the real build |
| `lib/demo/` | Seed data: clients, staff, compliance, price book, the three worked estimates |
| `components/Estimator.tsx` | The estimator screen |
| `components/Viewer3D.tsx`, `components/Drawing.tsx` | 3D model and generated drawing, both built from the parts |
| `supabase/` | Production schema, RLS and seed. See `supabase/README.md` |

## What is simulated

PDF extraction (the file name is read, parts come from the parametric design with confidence scores), Xero, email sending, supplier price requests and the role switcher. In the real build the role comes from the Supabase JWT and the database refuses queries a role can't make; `supabase/migrations` already enforces that and was tested role by role against Postgres.
