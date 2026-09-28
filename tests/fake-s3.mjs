import { createServer } from "node:http";
import { createHash } from "node:crypto";

const objects = new Map();
createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const key = decodeURIComponent(url.pathname);
  if (request.method === "GET" && url.searchParams.get("list-type") === "2") {
    const bucket = key.replace(/^\//, "").replace(/\/$/, "");
    const prefix = url.searchParams.get("prefix") || "";
    const items = [...objects.entries()].filter(([path]) => path.startsWith(`/${bucket}/${prefix}`));
    const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const body = `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>${escape(bucket)}</Name><IsTruncated>false</IsTruncated>${items.map(([path, object]) => `<Contents><Key>${escape(path.slice(bucket.length + 2))}</Key><Size>${object.bytes.length}</Size></Contents>`).join("")}</ListBucketResult>`;
    response.writeHead(200, { "Content-Type": "application/xml" });
    response.end(body);
    return;
  }
  if (request.method === "PUT") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    objects.set(key, { bytes, contentType: request.headers["content-type"] || "application/octet-stream" });
    response.writeHead(200, { ETag: `"${createHash("md5").update(bytes).digest("hex")}"` });
    response.end();
    return;
  }
  if (request.method === "GET") {
    const object = objects.get(key);
    if (!object) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { "Content-Type": object.contentType, "Content-Length": object.bytes.length });
    response.end(object.bytes);
    return;
  }
  response.writeHead(405);
  response.end();
}).listen(9100, "127.0.0.1", () => console.log("Temporary S3 test server ready on port 9100"));
