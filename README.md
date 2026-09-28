# Frimps Auto

Garage management for a Mercedes-Benz specialist workshop. The app covers customer and vehicle intake, assigned job orders, inspection checklists, diagnostic uploads, parts requests and inventory, invoices, and payments.

## Stack

- Next.js 16, React 19, TypeScript
- PostgreSQL 15 and Prisma 7
- Private S3-compatible object storage for diagnostic files
- Docker Compose for a single Hetzner server and Coolify deployment

## Roles

| Role | Access |
| --- | --- |
| Admin | All screens and actions, staff invitations, checklist templates |
| Supervisor | Customer intake, vehicle/job creation, technician assignment, checklists, diagnostics, parts requests, job closure |
| Finance | View jobs and customers, manage inventory, approve/reject/issue parts, invoices and payments |
| Technician | Read-only view of assigned jobs and their diagnostic files |

Permissions are checked in server actions and file routes as well as page navigation. Staff cannot register publicly. An admin creates an invitation link, which expires after 48 hours; the staff member sets a password through that link.

## Setup

1. Copy `.env.example` to `.env`. Set strong values for `POSTGRES_PASSWORD`, `BOOTSTRAP_ADMIN_PASSWORD`, and the S3 credentials. Use a URL-safe value for `POSTGRES_PASSWORD`, since Compose inserts it into `DATABASE_URL`. Set `APP_URL` to the public HTTPS URL when deployed.
2. Create **two private buckets** on the S3-compatible provider: one for `S3_BUCKET` and another for `BACKUP_BUCKET`. The configured credentials need read/write/list access to both.
3. Run `docker compose up --build -d`. The app waits for PostgreSQL, applies the versioned migration, creates the initial admin and checklist, then starts on internal port 3000.
4. Sign in using `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`. Remove those two values from the app environment after the first successful start. The seed does not overwrite an existing admin password.
5. The initial catalog includes common and classic Mercedes-Benz names plus a snapshot of model names from the [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/). Run `docker compose exec app npm run catalog:import` to refresh the NHTSA names. The model field always accepts manual entry. The year selector spans 1926 through next model year.

For local development with an existing PostgreSQL server, set `DATABASE_URL`, run `npm install`, `npm run db:migrate`, `npm run db:seed`, and `npm run dev`.

For automated workflow checks, start the app against a disposable database whose name ends in `_test`, then run `npm run smoke` with the same `DATABASE_URL` and `APP_URL`. Set `SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD` to include invitation and admin checklist checks. Set `SMOKE_S3=true` and point the app at a disposable S3 test endpoint to include PDF/JPG upload and private-download checks. The smoke script creates test records and must never run against production data.

### Coolify on Hetzner

Deploy this repository as a Docker Compose application on one Hetzner server. Point the Coolify domain at the `app` service, enable HTTPS, and keep PostgreSQL private to the Compose network. Set the environment values from `.env.example` in Coolify. The `backup` service starts a backup on launch and repeats every 24 hours. Monitor its logs and set a storage lifecycle policy for old snapshots according to the garage's retention needs. Keep both S3 buckets private. `APP_CURRENCY` defaults to `GHS`; change it to the garage's ISO 4217 currency code if needed. Tax is intentionally not calculated.

## Backup and restore

The `backup` service runs `npm run backup` daily. Each successful run stores `database/YYYY-MM-DD.dump`, a snapshot of every diagnostic file under `diagnostics/YYYY-MM-DD/`, and `manifests/YYYY-MM-DD.json` in `BACKUP_BUCKET`. A manifest is written only after the database and file copies succeed. The two buckets are off-server, separate from PostgreSQL's local volume.

To restore a chosen date:

1. Stop the `app` and `backup` services. Download that date's database dump and diagnostic snapshot from the backup bucket with an S3-compatible client.
2. Restore PostgreSQL to a **fresh empty** `frimps` database using `pg_restore --no-owner --dbname "$DATABASE_URL" database.dump`. Do not run the app's seed before the restore.
3. Copy the date's `diagnostics/YYYY-MM-DD/` objects into the primary bucket under `diagnostics/`, preserving the path after the date. The object keys in PostgreSQL must match those paths.
4. Start the app and backup services. Sign in, open a restored job, download a diagnostic attachment, and check an invoice and stock count.

The supplied Compose service uses PostgreSQL 15, matching the `pg_dump` client installed in the app image. A database version upgrade should update both together.

## Notes

The NHTSA model-name catalog is broad but does not establish every historic model/year pairing. The form accepts every Mercedes-Benz year from 1926 onward and lets staff type a missing model directly. Job checklist items and issued-part prices are stored as snapshots, so later template or catalog edits do not change completed work or existing invoices.
