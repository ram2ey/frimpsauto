import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const base = process.env.APP_URL || "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) throw new Error("Smoke tests require a dedicated database whose name ends in _test.");
const sql = new pg.Pool({ connectionString: databaseUrl });
const suffix = randomUUID().slice(0, 8);

function decode(value) { return value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">"); }
function forms(html) { return [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(match => match[0]); }
function formFor(html, marker) {
  const result = forms(html).find(form => form.includes(marker));
  assert.ok(result, `Form not found: ${marker}`);
  return result;
}
function hidden(form) {
  const values = {};
  for (const input of form.matchAll(/<input\b[^>]*>/g)) {
    if (!input[0].includes('type="hidden"')) continue;
    const name = input[0].match(/name="([^"]*)"/)?.[1];
    if (!name) continue;
    values[decode(name)] = decode(input[0].match(/value="([^"]*)"/)?.[1] || "");
  }
  return values;
}
async function get(path, cookie = "") {
  return fetch(new URL(path, base), { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
}
async function page(path, cookie = "") {
  const response = await get(path, cookie);
  assert.equal(response.status, 200, `GET ${path}: ${response.status}`);
  return response.text();
}
async function submit(path, form, fields, cookie = "") {
  const data = new FormData();
  for (const [key,value] of Object.entries({ ...hidden(form), ...fields })) data.set(key, String(value));
  return fetch(new URL(path, base), { method: "POST", body: data, headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}) }, redirect: "manual" });
}
function okAction(response, label) { assert.ok(response.status === 200 || response.status === 303, `${label}: ${response.status}`); }
async function signIn(username, password) {
  const html = await page("/login");
  const response = await submit("/login", formFor(html, "Sign in"), { username, password });
  assert.equal(response.status, 303, `Login failed: ${response.status}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Session cookie missing");
  return cookie;
}
async function addUser(role) {
  const username = `${role.toLowerCase()}-${randomUUID().slice(0, 8)}`;
  const password = `local-test-${role}-${suffix}-pass`;
  const result = await sql.query('INSERT INTO "User" (id,name,username,"passwordHash",role,active,"createdAt","mustChangePassword") VALUES ($1,$2,$3,$4,$5,true,NOW(),false) RETURNING id', [randomUUID(), `${role} ${suffix}`, username, await bcrypt.hash(password, 12), role]);
  return { id: result.rows[0].id, username, password };
}

async function main() {
  const health = await get("/api/health");
  assert.equal(health.status, 200);
  const smokeAdminUsername = process.env.SMOKE_ADMIN_USERNAME || process.env.SMOKE_ADMIN_EMAIL;
  if (smokeAdminUsername && process.env.SMOKE_ADMIN_PASSWORD) {
    let adminCookie = await signIn(smokeAdminUsername, process.env.SMOKE_ADMIN_PASSWORD);
    const adminGate = await get("/team", adminCookie);
    if (adminGate.status === 307) {
      assert.equal(new URL(adminGate.headers.get("location"), base).pathname, "/change-password");
      const firstChange = await page("/change-password", adminCookie);
      const changed = await submit("/change-password", formFor(firstChange, "Save password"), { currentPassword: process.env.SMOKE_ADMIN_PASSWORD, newPassword: `admin-new-${suffix}-password`, confirmPassword: `admin-new-${suffix}-password` }, adminCookie);
      assert.equal(changed.status, 303);
      adminCookie = changed.headers.get("set-cookie")?.split(";")[0] || adminCookie;
    }
    const teamHtml = await page("/team", adminCookie);
    const newUsername = `created-${suffix}`;
    const temporaryPassword = `temporary-${suffix}-password`;
    const created = await submit("/team", formFor(teamHtml, "Create user"), { name: `Created ${suffix}`, username: newUsername, password: temporaryPassword, role: "TECHNICIAN" }, adminCookie);
    assert.equal(created.status, 303);
    const createdUser = await sql.query('SELECT id,"mustChangePassword" FROM "User" WHERE username=$1', [newUsername]);
    assert.equal(createdUser.rows[0].mustChangePassword, true);
    let staffCookie = await signIn(newUsername, temporaryPassword);
    const forced = await get("/dashboard", staffCookie);
    assert.equal(new URL(forced.headers.get("location"), base).pathname, "/change-password");
    const passwordPage = await page("/change-password", staffCookie);
    const ownPassword = `new-${suffix}-password`;
    const firstPassword = await submit("/change-password", formFor(passwordPage, "Save password"), { currentPassword: temporaryPassword, newPassword: ownPassword, confirmPassword: ownPassword }, staffCookie);
    assert.equal(new URL(firstPassword.headers.get("location"), base).pathname, "/dashboard");
    staffCookie = firstPassword.headers.get("set-cookie")?.split(";")[0] || staffCookie;
    await page("/dashboard", staffCookie);
    const accountHtml = await page("/account", staffCookie);
    const secondPassword = `changed-${suffix}-password`;
    const changedAgain = await submit("/account", formFor(accountHtml, "Save password"), { currentPassword: ownPassword, newPassword: secondPassword, confirmPassword: secondPassword }, staffCookie);
    assert.equal(changedAgain.status, 303);
    staffCookie = changedAgain.headers.get("set-cookie")?.split(";")[0] || staffCookie;
    const renamedUsername = `renamed-${suffix}`;
    const updatedAccount = await page("/account", staffCookie);
    const renamed = await submit("/account", formFor(updatedAccount, "Save username"), { username: renamedUsername, currentPassword: secondPassword }, staffCookie);
    assert.equal(renamed.status, 303);
    await signIn(renamedUsername, secondPassword);
    const refreshedTeam = await page("/team", adminCookie);
    const resetPassword = `reset-${suffix}-password`;
    okAction(await submit("/team", formFor(refreshedTeam, `id="password-${createdUser.rows[0].id}"`), { password: resetPassword }, adminCookie), "Reset staff password");
    assert.equal(new URL((await get("/dashboard", staffCookie)).headers.get("location"), base).pathname, "/login");
    const resetCookie = await signIn(renamedUsername, resetPassword);
    assert.equal(new URL((await get("/dashboard", resetCookie)).headers.get("location"), base).pathname, "/change-password");
    const checklistHtml = await page("/checklists", adminCookie);
    okAction(await submit("/checklists", formFor(checklistHtml, "Create template"), { name: `Smoke checklist ${suffix}`, items: "Lights\nBrakes" }, adminCookie), "Create template");
    const createdTemplate = await sql.query('SELECT id FROM "ChecklistTemplate" WHERE name=$1', [`Smoke checklist ${suffix}`]);
    assert.equal(createdTemplate.rows.length, 1);
    const settingsHtml = await page("/settings", adminCookie);
    okAction(await submit("/settings", formFor(settingsHtml, "Save details"), { name: `Frimps Smoke ${suffix}`, address: "Accra, Ghana", phone: "+233 20 000 0000", email: "accounts@example.com" }, adminCookie), "Save business details");
    const profile = await sql.query('SELECT name,address,phone,email FROM "BusinessProfile" WHERE id=$1', ["primary"]);
    assert.equal(profile.rows[0].name, `Frimps Smoke ${suffix}`);
  }
  const supervisor = await addUser("SUPERVISOR");
  const technician = await addUser("TECHNICIAN");
  const otherTechnician = await addUser("TECHNICIAN");
  const finance = await addUser("FINANCE");
  const supervisorCookie = await signIn(supervisor.username, supervisor.password);
  const technicianCookie = await signIn(technician.username, technician.password);
  const otherTechnicianCookie = await signIn(otherTechnician.username, otherTechnician.password);
  const financeCookie = await signIn(finance.username, finance.password);
  const template = await sql.query('SELECT id FROM "ChecklistTemplate" LIMIT 1');
  const intake = await page("/jobs/new", supervisorCookie);
  const jobResponse = await submit("/jobs/new", formFor(intake, "Create job order"), {
    customerName: `Smoke Customer ${suffix}`, customerPhone: "0000000000", year: 1984,
    modelName: "300 D", plate: `TEST${suffix}`, complaint: "Rough idle and brake inspection",
    technicianId: technician.id, templateId: template.rows[0].id,
  }, supervisorCookie);
  assert.equal(jobResponse.status, 303, `Create job: ${jobResponse.status}`);
  const jobPath = new URL(jobResponse.headers.get("location"), base).pathname;
  const jobId = jobPath.split("/").at(-1);
  assert.match(await page(jobPath, technicianCookie), /Rough idle and brake inspection/);
  assert.equal((await get("/finance", technicianCookie)).status, 307);
  assert.equal((await get("/settings", financeCookie)).status, 307);
  assert.equal((await get(jobPath, otherTechnicianCookie)).status, 307);

  // Dashboard cards and aggregates must respect the same job access as detail pages.
  const technicianDashboard = await page("/dashboard", technicianCookie);
  const technicianMain = technicianDashboard.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0] || "";
  assert.match(technicianMain, new RegExp(`Smoke Customer ${suffix}`));
  assert.match(technicianMain, /Assigned to you<\/div><div class="value">1<\/div>/);
  assert.doesNotMatch(technicianMain, /Outstanding|href="\/jobs\/new"/);
  const emptyDashboard = await page("/dashboard", otherTechnicianCookie);
  const emptyMain = emptyDashboard.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0] || "";
  assert.doesNotMatch(emptyMain, new RegExp(`Smoke Customer ${suffix}`));
  assert.match(emptyMain, /No jobs have been assigned to you yet/);
  assert.match(emptyMain, /Assigned to you<\/div><div class="value">0<\/div>/);
  assert.match(await page("/dashboard", financeCookie), /Outstanding/);
  assert.match(await page("/dashboard", supervisorCookie), /New job/);
  assert.match(await page(`/jobs?q=TEST${suffix}`, technicianCookie), new RegExp(`Smoke Customer ${suffix}`));
  const hiddenSearch = await page(`/jobs?q=TEST${suffix}`, otherTechnicianCookie);
  assert.match(hiddenSearch, /No matching jobs found/);
  if (process.env.SMOKE_STORAGE === "true") {
    const upload = new FormData();
    upload.set("file", new Blob(["%PDF-1.4\nFrimps smoke diagnostic\n"], { type: "application/pdf" }), "initial.pdf");
    const uploaded = await fetch(new URL(`/api/jobs/${jobId}/diagnostics`, base), { method: "POST", body: upload, headers: { Cookie: supervisorCookie, Origin: base }, redirect: "manual" });
    assert.equal(uploaded.status, 303, `Diagnostic upload: ${uploaded.status}`);
    assert.equal((await fetch(new URL(`/api/jobs/${jobId}/diagnostics`, base), { method: "POST", body: upload, headers: { Cookie: financeCookie, Origin: base }, redirect: "manual" })).status, 403);
    const jpeg = new FormData();
    jpeg.set("file", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: "image/jpeg" }), "inspection.jpg");
    assert.equal((await fetch(new URL(`/api/jobs/${jobId}/diagnostics`, base), { method: "POST", body: jpeg, headers: { Cookie: supervisorCookie, Origin: base }, redirect: "manual" })).status, 303);
    const invalid = new FormData();
    invalid.set("file", new Blob(["not a real pdf"], { type: "application/pdf" }), "invalid.pdf");
    assert.equal((await fetch(new URL(`/api/jobs/${jobId}/diagnostics`, base), { method: "POST", body: invalid, headers: { Cookie: supervisorCookie, Origin: base }, redirect: "manual" })).status, 400);
    const diagnostic = await sql.query('SELECT id FROM "Diagnostic" WHERE "jobId"=$1', [jobId]);
    assert.equal(diagnostic.rows.length, 2);
    const filePath = `/api/diagnostics/${diagnostic.rows[0].id}`;
    assert.equal((await get(filePath, technicianCookie)).status, 200);
    assert.equal((await get(filePath, otherTechnicianCookie)).status, 404);
    assert.equal((await get(filePath, financeCookie)).status, 200);
  }

  const jobHtml = await page(jobPath, supervisorCookie);
  assert.doesNotMatch(intake, /name="mileage"/, "Mileage belongs to the job inspection, not intake");
  okAction(await submit(jobPath, formFor(jobHtml, "Mileage at this visit"), { mileage: "123450" }, supervisorCookie), "Record job mileage");
  const jobMileage = await sql.query('SELECT mileage FROM "Job" WHERE id=$1', [jobId]);
  assert.equal(jobMileage.rows[0].mileage, 123450);
  const checklist = await submit(jobPath, formFor(jobHtml, "Not checked"), { result: "PASS", note: "Inspected" }, supervisorCookie);
  okAction(checklist, "Save checklist");
  const checked = await sql.query('SELECT result FROM "JobChecklistItem" WHERE "jobId"=$1 ORDER BY "sortOrder" LIMIT 1', [jobId]);
  assert.equal(checked.rows[0].result, "PASS");
  const financeFindings = await submit(jobPath, formFor(jobHtml, "Save findings"), { findings: "Finance must not edit this" }, financeCookie);
  assert.ok(financeFindings.status >= 400 || financeFindings.status === 303);
  const unchanged = await sql.query('SELECT findings FROM "Job" WHERE id=$1', [jobId]);
  assert.notEqual(unchanged.rows[0].findings, "Finance must not edit this");

  const inventoryHtml = await page("/inventory", financeCookie);
  const partResponse = await submit("/inventory", formFor(inventoryHtml, "Add part"), { sku: `SMOKE-${suffix}`, name: `Brake pad ${suffix}`, price: "75.25", stockQty: "10", reorderLevel: "2" }, financeCookie);
  okAction(partResponse, "Create part");
  const part = await sql.query('SELECT id FROM "Part" WHERE sku=$1', [`SMOKE-${suffix.toUpperCase()}`]);
  assert.equal(part.rows.length, 1, "Part creation did not persist");
  const requestHtml = await page(jobPath, supervisorCookie);
  const requestResponse = await submit(jobPath, formFor(requestHtml, "Request part"), { partId: part.rows[0].id, quantity: "2", note: "Replace worn pads" }, supervisorCookie);
  okAction(requestResponse, "Request part");
  const request = await sql.query('SELECT id FROM "PartRequest" WHERE "jobId"=$1', [jobId]);
  const financeHtml = await page("/finance", financeCookie);
  okAction(await submit("/finance", formFor(financeHtml, "Approve"), {}, financeCookie), "Approve part");
  const approvedHtml = await page("/finance", financeCookie);
  okAction(await submit("/finance", formFor(approvedHtml, "Issue qty"), { quantity: "2" }, financeCookie), "Issue part");
  const issued = await sql.query('SELECT p."stockQty",r.status,r."issuedQty" FROM "Part" p JOIN "PartRequest" r ON r."partId"=p.id WHERE r.id=$1', [request.rows[0].id]);
  assert.deepEqual(issued.rows[0], { stockQty: 8, status: "ISSUED", issuedQty: 2 });
  const invoiceQuery = await sql.query('SELECT id FROM "Invoice" WHERE "jobId"=$1', [jobId]);
  const invoiceId = invoiceQuery.rows[0].id;
  const partLine = await sql.query('SELECT quantity,"unitCents" FROM "InvoiceItem" WHERE "invoiceId"=$1 AND type=$2', [invoiceId, "PART"]);
  assert.deepEqual(partLine.rows[0], { quantity: 2, unitCents: 7525 });

  const anotherRequestHtml = await page(jobPath, supervisorCookie);
  okAction(await submit(jobPath, formFor(anotherRequestHtml, "Request part"), { partId: part.rows[0].id, quantity: "1", note: "Check replacement need" }, supervisorCookie), "Request another part");
  const rejectHtml = await page("/finance", financeCookie);
  okAction(await submit("/finance", formFor(rejectHtml, "Reject"), {}, financeCookie), "Reject part");

  const closeHtml = await page(jobPath, supervisorCookie);
  okAction(await submit(jobPath, formFor(closeHtml, "Mark job complete"), {}, supervisorCookie), "Close job");
  const invoicePath = `/finance/invoices/${invoiceId}`;
  const invoiceHtml = await page(invoicePath, financeCookie);
  okAction(await submit(invoicePath, formFor(invoiceHtml, "Add charge"), { description: "Brake fitting", quantity: "1", price: "40.00" }, financeCookie), "Add labor");
  const readyInvoice = await page(invoicePath, financeCookie);
  okAction(await submit(invoicePath, formFor(readyInvoice, "Issue invoice"), {}, financeCookie), "Issue invoice");
  const issuedInvoice = await page(invoicePath, financeCookie);
  assert.match(issuedInvoice, new RegExp(`/api/invoices/${invoiceId}/download`));
  const download = await get(`/api/invoices/${invoiceId}/download`, financeCookie);
  assert.equal(download.status, 200);
  assert.match(download.headers.get("content-type") || "", /application\/pdf/);
  assert.match(download.headers.get("content-disposition") || "", /attachment/);
  const pdf = Buffer.from(await download.arrayBuffer());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.includes(Buffer.from("/Subtype /Image")), "Invoice PDF must contain the logo");
  assert.ok(pdf.includes(Buffer.from(`Smoke Customer ${suffix}`)), "Invoice PDF must contain the customer");
  if (smokeAdminUsername && process.env.SMOKE_ADMIN_PASSWORD) assert.ok(pdf.includes(Buffer.from(`Frimps Smoke ${suffix}`)), "Invoice PDF must contain saved business details");
  okAction(await submit(invoicePath, formFor(issuedInvoice, "Record payment"), { amount: "50.00", method: "Cash" }, financeCookie), "Record payment");
  const balance = await sql.query('SELECT i.status, COALESCE((SELECT SUM(quantity*"unitCents") FROM "InvoiceItem" WHERE "invoiceId"=i.id),0) AS total, COALESCE((SELECT SUM("amountCents") FROM "Payment" WHERE "invoiceId"=i.id),0) AS paid FROM "Invoice" i WHERE i.id=$1', [invoiceId]);
  assert.equal(balance.rows[0].status, "PARTIAL");
  assert.equal(Number(balance.rows[0].total) - Number(balance.rows[0].paid), 14050);
  const partialHtml = await page(invoicePath, financeCookie);
  okAction(await submit(invoicePath, formFor(partialHtml, "Record payment"), { amount: "140.50", method: "Card" }, financeCookie), "Pay balance");
  const paidInvoice = await sql.query('SELECT status FROM "Invoice" WHERE id=$1', [invoiceId]);
  assert.equal(paidInvoice.rows[0].status, "PAID");
  console.log("Smoke workflow passed: roles, staff creation, password changes, dashboard access and counts, job search, job, checklist, diagnostic access, parts, stock, invoice and payments.");
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sql.end());
