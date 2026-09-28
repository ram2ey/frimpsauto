# Frimps Auto

Garage management for a Mercedes-Benz specialist workshop. The app covers customer and vehicle intake, assigned job orders, inspection checklists, diagnostic uploads, parts requests and inventory, invoices, and payments.

## Stack

- Next.js 16, React 19, TypeScript
- PostgreSQL 15 and Prisma 7
- Private local storage for diagnostic files on a persistent Docker volume
- Docker Compose for a single Hetzner server and Coolify deployment

## Roles

| Role | Access |
| --- | --- |
| Admin | All screens and actions, staff invitations, checklist templates, business invoice details |
| Supervisor | Customer intake, vehicle/job creation, technician assignment, checklists, diagnostics, parts requests, job closure |
| Finance | View jobs and customers, manage inventory, approve/reject/issue parts, invoices and payments |
| Technician | Read-only view of assigned jobs and their diagnostic files |

Permissions are checked in server actions and file routes as well as page navigation. Staff cannot register publicly. An admin creates an invitation link, which expires after 48 hours; the staff member sets a password through that link.

## Setup

1. Copy `.env.example` to `.env`. Set strong values for `POSTGRES_PASSWORD` and `BOOTSTRAP_ADMIN_PASSWORD`. Use a URL-safe value for `POSTGRES_PASSWORD`, since Compose inserts it into `DATABASE_URL`. Set `APP_URL` to the public HTTPS URL when deployed.
2. Run `docker compose up --build -d`. The app waits for PostgreSQL, applies the versioned migration, creates the initial admin and checklist, then starts on internal port 3000. Compose creates persistent `postgres_data` and `diagnostic_files` volumes on the server.
3. Sign in using `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`. Remove those two values from the app environment after the first successful start. The seed does not overwrite an existing admin password.
4. The initial catalog includes common and classic Mercedes-Benz names plus a snapshot of model names from the [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/). Run `docker compose exec app npm run catalog:import` to refresh the NHTSA names. The model field always accepts manual entry. The year selector spans 1926 through next model year.

Admins can enter the business name, address, phone, and email under **Business details**. These appear beside the logo in downloaded invoices. Finance staff and admins can download a PDF from each invoice; it includes the customer, vehicle, line items, payments, and balance. Mileage is recorded on each job's inspection checklist so repeat visits retain separate readings. Apply the new migrations before using this version.

For local development with an existing PostgreSQL server, set `DATABASE_URL`, run `npm install`, `npm run db:migrate`, `npm run db:seed`, and `npm run dev`.

For automated workflow checks, start the app against a disposable database whose name ends in `_test`, then run `npm run smoke` with the same `DATABASE_URL` and `APP_URL`. Set `SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD` to include invitation and admin checklist checks. Set `SMOKE_STORAGE=true` to include PDF/JPG upload and private-download checks. The smoke script creates test records and must never run against production data.

### Coolify on Hetzner

Deploy this repository as a Docker Compose application on one Hetzner server. Point the Coolify domain at the `app` service, enable HTTPS, and keep PostgreSQL private to the Compose network. Set `POSTGRES_PASSWORD`, `APP_URL`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in Coolify. All amounts use Ghana cedis (GHS). Tax is intentionally not calculated. Diagnostic uploads are saved under `/app/storage` in the `diagnostic_files` volume and are only served through the authenticated download route.

## Backup and restore

Automated off-server backups are not yet configured. The `postgres_data` and `diagnostic_files` volumes survive normal container replacement and redeployment, but losing the server or its disk would lose both. Back up both volumes together before using the app for irreplaceable workshop records. Avoid `docker compose down -v` and deleting these volumes in Coolify.

## Notes

The NHTSA model-name catalog is broad but does not establish every historic model/year pairing. The form accepts every Mercedes-Benz year from 1926 onward and lets staff type a missing model directly. Job checklist items and issued-part prices are stored as snapshots, so later template or catalog edits do not change completed work or existing invoices.
