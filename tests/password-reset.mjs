import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import bcrypt from "bcryptjs";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Password reset tests require a dedicated database whose name ends in _test.");
}
const sql = new pg.Pool({ connectionString: databaseUrl });
const firstPort = Number(process.env.RESET_TEST_PORT || 3117);
const servers = new Set();
const userIds = [];

async function startServer(port, flag) {
  const env = { ...process.env, NODE_ENV: "production" };
  delete env.ALLOW_TEMPORARY_PASSWORD_RESET;
  if (flag !== undefined) env.ALLOW_TEMPORARY_PASSWORD_RESET = flag;
  const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  servers.add(child);
  let startupError;
  let output = "";
  child.on("error", error => { startupError = error; });
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError;
    if (child.exitCode !== null) throw new Error(`Test server exited: ${output}`);
    try {
      if ((await fetch(`${base}/login`, { signal: AbortSignal.timeout(1000) })).ok) return { base, child };
    } catch { /* Wait for startup. */ }
    await delay(100);
  }
  throw new Error(`Test server did not start: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
  servers.delete(child);
}

function decode(value) {
  return value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function formFor(html, marker) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(match => match[0]).find(value => value.includes(marker));
  assert.ok(form, `Form missing: ${marker}`);
  return form;
}

async function submit(base, path, form, fields) {
  const data = new FormData();
  for (const input of form.matchAll(/<input\b[^>]*>/g)) {
    if (!input[0].includes('type="hidden"')) continue;
    const name = input[0].match(/name="([^"]*)"/)?.[1];
    if (name) data.set(decode(name), decode(input[0].match(/value="([^"]*)"/)?.[1] || ""));
  }
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return fetch(new URL(path, base), { method: "POST", body: data, headers: { Origin: base }, redirect: "manual" });
}

function redirectTo(response, path) {
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), path);
}

async function addUser(role = "TECHNICIAN", active = true) {
  const id = randomUUID();
  const username = `reset-${randomUUID().slice(0, 8)}`;
  const password = randomBytes(16).toString("hex");
  const token = randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(password, 12);
  await sql.query('INSERT INTO "User" (id,name,username,"passwordHash",role,active,"createdAt","mustChangePassword") VALUES ($1,$2,$3,$4,$5,$6,NOW(),true)', [id, "Reset test user", username, passwordHash, role, active]);
  userIds.push(id);
  for (const sessionToken of [token, randomBytes(32).toString("hex")]) {
    await sql.query('INSERT INTO "Session" (id,"tokenHash","userId","expiresAt","createdAt") VALUES ($1,$2,$3,NOW()+INTERVAL \'1 day\',NOW())', [randomUUID(), createHash("sha256").update(sessionToken).digest("hex"), id]);
  }
  return { id, username, password, passwordHash, token };
}

async function state(user) {
  const result = await sql.query('SELECT username,"passwordHash","mustChangePassword",active,(SELECT COUNT(*)::int FROM "Session" WHERE "userId"="User".id) AS sessions FROM "User" WHERE id=$1', [user.id]);
  return result.rows[0];
}

async function main() {
  const enabled = await startServer(firstPort, "true");
  const loginHtml = await (await fetch(`${enabled.base}/login`)).text();
  assert.ok(loginHtml.includes('href="/forgot-password"'));
  const resetResponse = await fetch(`${enabled.base}/forgot-password`);
  assert.equal(resetResponse.status, 200);
  const resetHtml = await resetResponse.text();
  const resetForm = formFor(resetHtml, "Reset password");
  const loginForm = formFor(loginHtml, "Sign in");
  const account = await addUser();
  const inactive = await addUser("TECHNICIAN", false);
  const accountBefore = await state(account);
  const inactiveBefore = await state(inactive);

  for (const newPassword of ["short", "a".repeat(73), "😀".repeat(19)]) {
    const response = await submit(enabled.base, "/forgot-password", resetForm, { username: account.username, newPassword });
    redirectTo(response, "/forgot-password?error=New%20password%20must%20be%20at%20least%206%20characters%20and%20at%20most%2072%20bytes");
    assert.deepEqual(await state(account), accountBefore);
    assert.ok(!response.headers.get("location").includes(newPassword));
  }
  const countBefore = Number((await sql.query('SELECT COUNT(*) AS count FROM "User"')).rows[0].count);
  for (const username of ["", `missing-${randomUUID()}`, inactive.username]) {
    const response = await submit(enabled.base, "/forgot-password", resetForm, { username, newPassword: "unused-new-password" });
    redirectTo(response, "/forgot-password?error=Unable%20to%20reset%20password%20for%20this%20account");
  }
  assert.deepEqual(await state(inactive), inactiveBefore);
  assert.equal(Number((await sql.query('SELECT COUNT(*) AS count FROM "User"')).rows[0].count), countBefore);
  assert.deepEqual(await state(account), accountBefore);

  const newPassword = "é".repeat(36); // Exactly 72 UTF-8 bytes.
  const reset = await submit(enabled.base, "/forgot-password", resetForm, { username: `  ${account.username.toUpperCase()}  `, newPassword });
  redirectTo(reset, "/login?reset=1");
  assert.equal(reset.headers.get("set-cookie"), null, "Reset must not sign in automatically");
  const updated = await state(account);
  assert.equal(updated.username, account.username);
  assert.equal(updated.mustChangePassword, false);
  assert.equal(updated.sessions, 0);
  assert.equal(bcrypt.getRounds(updated.passwordHash), 12);
  assert.ok(await bcrypt.compare(newPassword, updated.passwordHash));
  assert.ok(!await bcrypt.compare(account.password, updated.passwordHash));
  const oldSession = await fetch(`${enabled.base}/account`, { headers: { Cookie: `frimps_session=${account.token}` }, redirect: "manual" });
  assert.equal(oldSession.status, 307);
  assert.equal(oldSession.headers.get("location"), "/login");
  const oldLogin = await submit(enabled.base, "/login", loginForm, { username: account.username, password: account.password });
  redirectTo(oldLogin, "/login?error=Invalid%20username%20or%20password");
  const newLogin = await submit(enabled.base, "/login", loginForm, { username: account.username, password: newPassword });
  redirectTo(newLogin, "/dashboard");
  assert.ok(newLogin.headers.get("set-cookie")?.includes("frimps_session="));
  const successHtml = await (await fetch(`${enabled.base}/login?reset=1`)).text();
  assert.ok(successHtml.includes("Password reset. Sign in with your new password."));

  const admin = await addUser("ADMIN");
  redirectTo(await submit(enabled.base, "/forgot-password", resetForm, { username: admin.username, newPassword: "a".repeat(72) }), "/login?reset=1");
  assert.equal((await state(admin)).sessions, 0);
  redirectTo(await submit(enabled.base, "/login", loginForm, { username: admin.username, password: "a".repeat(72) }), "/dashboard");

  for (const [index, flag] of [undefined, "false", "TRUE"].entries()) {
    const disabled = await startServer(firstPort + 1 + index, flag);
    const login = await (await fetch(`${disabled.base}/login`)).text();
    assert.ok(!login.includes('href="/forgot-password"'));
    const page = await fetch(`${disabled.base}/forgot-password`, { redirect: "manual" });
    assert.equal(page.status, 307);
    assert.equal(page.headers.get("location"), "/login");
    const before = await state(account);
    // Replay the real action from the enabled server against the same build
    // with the switch disabled, bypassing the hidden link and page redirect.
    redirectTo(await submit(disabled.base, "/forgot-password", resetForm, { username: account.username, newPassword: "must-not-be-saved" }), "/login");
    assert.deepEqual(await state(account), before);
    await stopServer(disabled.child);
  }
  console.log("Password reset integration tests passed: active users and admins, username normalization, password limits, unknown/inactive accounts, session revocation, sign-in, and disabled page/action guards.");
}

try {
  await main();
} finally {
  await Promise.all([...servers].map(stopServer));
  if (userIds.length) await sql.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [userIds]);
  await sql.end();
}
