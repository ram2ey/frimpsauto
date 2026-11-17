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


import { readFile } from "node:fs/promises";

// Checks for the fixes from the code audit. Run like the smoke test, against a *_test database
// and a production build (`npm run build && npm start`), since it reads the action manifest.
const manifest = JSON.parse(await readFile(new URL("../.next/server/server-reference-manifest.json", import.meta.url), "utf8"));
function actionId(name) {
  const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  assert.ok(entry, `Action not found: ${name}`);
  return entry[0];
}
async function callAction(path, name, fields, cookie) {
  const data = new FormData();
  data.set(`$ACTION_ID_${actionId(name)}`, "");
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  return fetch(new URL(path, base), { method: "POST", body: data, headers: { Origin: base, Cookie: cookie }, redirect: "manual" });
}
function flashOf(response) {
  const raw = response.headers.getSetCookie().find(value => value.startsWith("frimps_flash="));
  if (!raw) return null;
  const value = decodeURIComponent(raw.split(";")[0].slice("frimps_flash=".length));
  try { return JSON.parse(decodeURIComponent(value)).message; } catch { return JSON.parse(value).message; }
}
const count = async (query, params) => Number((await sql.query(query, params)).rows[0].count);

async function main() {
  const shop = await addUser("SHOP_STAFF");
  const finance = await addUser("FINANCE");
  const supervisor = await addUser("SUPERVISOR");
  const shopCookie = await signIn(shop.username, shop.password);
  const financeCookie = await signIn(finance.username, finance.password);

  const partId = randomUUID();
  await sql.query(`INSERT INTO "Part" (id, sku, name, "priceCents", "stockQty", "shopStockQty", active, "createdAt") VALUES ($1,$2,$3,10000,50,50,true,NOW())`, [partId, `AUDIT-${suffix}`.toUpperCase(), `Audit part ${suffix}`]);
  const sales = () => count(`SELECT COUNT(*) FROM "DirectSaleItem" WHERE "partId"=$1`, [partId]);
  const sale = (cookie, location, unitPrice, extra = {}, quantity = 1) =>
    callAction(location === "WORKSHOP" ? "/inventory" : "/shop", "createDirectSale", { location, paymentMethod: "Cash", itemsJson: JSON.stringify([{ partId, quantity, unitPrice }]), ...extra }, cookie);

  // 1. Counter-sale prices are checked against the catalog.
  await sale(shopCookie, "RETAIL_SHOP", "1.00");
  assert.equal(await sales(), 0, "below-catalog price without a reason must be refused");
  await sale(shopCookie, "RETAIL_SHOP", "-50.00", { discountReason: "x" });
  assert.equal(await sales(), 0, "negative price must be refused");
  await sale(shopCookie, "RETAIL_SHOP", "100.00", {}, 0);
  assert.equal(await sales(), 0, "zero quantity must be refused");
  await sale(shopCookie, "RETAIL_SHOP", "95.00", { discountReason: "Regular customer" });
  assert.equal(await sales(), 0, "shop staff must not change prices, even with a reason");
  await sale(shopCookie, "RETAIL_SHOP", "150.00");
  assert.equal(await sales(), 0, "shop staff must not raise prices either");
  await sale(shopCookie, "WORKSHOP", "100.00");
  assert.equal(await sales(), 0, "shop staff cannot sell from the workshop");
  await sale(financeCookie, "WORKSHOP", "40.00");
  assert.equal(await sales(), 0, "finance discount still needs a reason");
  await sale(financeCookie, "WORKSHOP", "40.00", { discountReason: "Damaged box" });
  assert.equal(await sales(), 1, "finance may set prices with a reason");
  const discounted = await sql.query(`SELECT s."totalCents", s.notes FROM "DirectSale" s JOIN "DirectSaleItem" i ON i."saleId"=s.id WHERE i."partId"=$1`, [partId]);
  assert.equal(discounted.rows[0].totalCents, 4000);
  assert.match(discounted.rows[0].notes, /Discount by .*Reason: Damaged box/);
  await sale(shopCookie, "RETAIL_SHOP", "100.00", {}, 2);
  assert.equal(await sales(), 2, "shop staff can sell at the catalog price");
  const stock = (await sql.query(`SELECT "stockQty", "shopStockQty" FROM "Part" WHERE id=$1`, [partId])).rows[0];
  assert.deepEqual([stock.stockQty, stock.shopStockQty], [49, 48]);
  const shopShelf = await page("/shop/inventory", shopCookie);
  assert.ok(!shopShelf.includes("Add New Catalog SKU"), "shop staff must not see the add-part form");
  assert.ok(!shopShelf.includes('name="price"'), "shop staff must not see price inputs");
  await callAction("/shop/inventory", "createPart", { sku: `SHOP-${suffix}`, name: "Shop-made part", price: "1.00", stockQty: "1", reorderLevel: "0", location: "RETAIL_SHOP" }, shopCookie);
  assert.equal(await count(`SELECT COUNT(*) FROM "Part" WHERE sku=$1`, [`SHOP-${suffix}`.toUpperCase()]), 0, "shop staff must not create priced parts");

  // 2. Shop staff cannot change catalog prices or write stock off.
  const partHtml = await page(`/inventory/${partId}`, financeCookie);
  await submit(`/inventory/${partId}`, formFor(partHtml, "Save part"), { name: "Renamed", price: "1.00", reorderLevel: "0", shopReorderLevel: "0", active: "on" }, shopCookie);
  assert.equal((await sql.query(`SELECT "priceCents" FROM "Part" WHERE id=$1`, [partId])).rows[0].priceCents, 10000, "shop staff must not change prices");
  okAction(await submit(`/inventory/${partId}`, formFor(partHtml, "Save part"), { name: `Audit part ${suffix}`, price: "100.00", reorderLevel: "3", shopReorderLevel: "7", active: "on" }, financeCookie), "Finance saves part");
  assert.equal((await sql.query(`SELECT "shopReorderLevel" FROM "Part" WHERE id=$1`, [partId])).rows[0].shopReorderLevel, 7, "finance can set the shop reorder level");
  const shopInventory = await page("/shop/inventory", shopCookie);
  const writeOff = await submit("/shop/inventory", formFor(shopInventory, "Confirm stock intake"), { partId, delta: "-5", reason: "gone" }, shopCookie);
  assert.equal((await sql.query(`SELECT "shopStockQty" FROM "Part" WHERE id=$1`, [partId])).rows[0].shopStockQty, 48, "shop staff must not write stock off");
  assert.match(flashOf(writeOff) || "", /write-offs need Finance/, "write-off refusal should be shown to the user");
  okAction(await callAction("/shop/inventory", "setShopReorderLevel", { partId, shopReorderLevel: "4" }, shopCookie), "Shop staff sets shelf reorder level");
  assert.equal((await sql.query(`SELECT "shopReorderLevel" FROM "Part" WHERE id=$1`, [partId])).rows[0].shopReorderLevel, 4);

  // 3. Errors reach the user as a banner.
  const bad = await callAction("/shop/inventory", "setShopReorderLevel", { partId, shopReorderLevel: "-1" }, shopCookie);
  assert.equal(bad.status, 200);
  const message = flashOf(bad);
  assert.match(message || "", /whole number of 0 or more/);
  const banner = await page("/shop/inventory", `${shopCookie}; frimps_flash=${encodeURIComponent(encodeURIComponent(JSON.stringify({ message, at: 1 })))}`);
  assert.ok(banner.includes("whole number of 0 or more"), "flash banner should render");

  // 4. Shop staff cannot decide workshop part requests.
  const customerId = randomUUID(), vehicleId = randomUUID(), jobId = randomUUID(), requestId = randomUUID();
  await sql.query(`INSERT INTO "Customer" (id,name,phone,"createdAt") VALUES ($1,'Audit','0200000000',NOW())`, [customerId]);
  await sql.query(`INSERT INTO "Vehicle" (id,"customerId",year,"customModel","createdAt") VALUES ($1,$2,2015,'C-Class',NOW())`, [vehicleId, customerId]);
  await sql.query(`INSERT INTO "Job" (id,"customerId","vehicleId",complaint,status,"createdById","createdAt","updatedAt") VALUES ($1,$2,$3,'Noise','WAITING_PARTS',$4,NOW(),NOW())`, [jobId, customerId, vehicleId, supervisor.id]);
  await sql.query(`INSERT INTO "PartRequest" (id,"jobId","partId","requestedQty",status,"createdAt") VALUES ($1,$2,$3,1,'REQUESTED',NOW())`, [requestId, jobId, partId]);
  const financeHtml = await page("/finance", financeCookie);
  const approveForm = forms(financeHtml).find(form => form.includes("Approve") && form.includes(`Audit part ${suffix}`)) || formFor(financeHtml, "Approve");
  await submit("/finance", approveForm, {}, shopCookie);
  assert.equal((await sql.query(`SELECT status FROM "PartRequest" WHERE id=$1`, [requestId])).rows[0].status, "REQUESTED", "shop staff must not approve part requests");

  // 5. Shop staff have a working account page; password rules are enforced.
  const accountHtml = await page("/shop/account", shopCookie);
  const shortPw = await submit("/shop/account", formFor(accountHtml, "Save password"), { currentPassword: shop.password, newPassword: "short1", confirmPassword: "short1" }, shopCookie);
  assert.match(decodeURIComponent(shortPw.headers.get("location") || ""), /^\/shop\/account\?error=New password must be at least 10/);
  const newPassword = `audit-${suffix}-new-password`;
  const changed = await submit("/shop/account", formFor(accountHtml, "Save password"), { currentPassword: shop.password, newPassword, confirmPassword: newPassword }, shopCookie);
  assert.equal(changed.headers.get("location"), "/shop/account?changed=1");

  // 6. No password hashes in the staff page.
  const adminUser = await addUser("ADMIN");
  const adminCookie = await signIn(adminUser.username, adminUser.password);
  const team = await page("/team", adminCookie);
  assert.ok(!/\$2[aby]\$\d\d\$/.test(team), "team page must not contain bcrypt hashes");
  assert.ok(!team.includes("passwordHash"), "team page must not contain passwordHash");

  // 7. Login page only shows fixed messages.
  const crafted = await page("/login?error=Call%200244%20000%20000%20to%20verify");
  // (The URL itself appears in Next's router data; what matters is that no notice is rendered from it.)
  assert.ok(!/class="notice"[^<]*to verify/.test(crafted) && !crafted.includes('class="notice"'), "login must not show arbitrary text");

  // 8. Vehicle photos are not served to shop staff.
  const changedShopCookie = await signIn(shop.username, newPassword);
  await sql.query(`UPDATE "Vehicle" SET "photoKey"=$2 WHERE id=$1`, [vehicleId, `vehicles/${vehicleId}/${randomUUID()}.jpg`]);
  assert.equal((await get(`/api/vehicles/${vehicleId}/photo`, changedShopCookie)).status, 404);

  // 9. Sign-in is throttled after repeated failures (last, since it blocks this IP+username).
  const victim = await addUser("TECHNICIAN");
  for (let i = 0; i < 5; i++) {
    const response = await submit("/login", formFor(await page("/login"), "Sign in"), { username: victim.username, password: "wrong-password" });
    assert.equal(response.headers.get("location"), "/login?error=invalid");
  }
  const locked = await submit("/login", formFor(await page("/login"), "Sign in"), { username: victim.username, password: victim.password });
  assert.match(locked.headers.get("location") || "", /^\/login\?error=locked/, "6th attempt should be throttled even with the right password");
  assert.ok((await page(locked.headers.get("location"))).includes("Too many failed sign-in attempts"));

  console.log("Audit checks passed: sale pricing and discounts, shop staff permissions, flash errors, shop account page, password rules, no hashes on team page, fixed login messages, photo access, sign-in throttling.");
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sql.end());
