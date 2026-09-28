import "dotenv/config";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const required = ["DATABASE_URL", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "BACKUP_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);

const sourceBucket = process.env.S3_BUCKET!;
const backupBucket = process.env.BACKUP_BUCKET!;
if (sourceBucket === backupBucket) throw new Error("BACKUP_BUCKET must be separate from S3_BUCKET.");
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT!, region: process.env.S3_REGION!, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! }, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" });

async function dumpDatabase(path: string) {
  const url = new URL(process.env.DATABASE_URL!);
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1) };
  await new Promise<void>((resolve, reject) => {
    const process = spawn("pg_dump", ["--format=custom", "--no-owner", "--file", path], { env, stdio: ["ignore", "inherit", "inherit"] });
    process.on("error", reject);
    process.on("exit", code => code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`)));
  });
}

async function main() {
  const day = new Date().toISOString().slice(0, 10);
  const directory = await mkdtemp(join(tmpdir(), "frimps-backup-"));
  const dumpPath = join(directory, "database.dump");
  try {
    await dumpDatabase(dumpPath);
    const file = await stat(dumpPath);
    await new Upload({ client: s3, params: { Bucket: backupBucket, Key: `database/${day}.dump`, Body: createReadStream(dumpPath), ContentLength: file.size, ContentType: "application/octet-stream" } }).done();
    let continuationToken: string | undefined;
    let count = 0;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: sourceBucket, Prefix: "diagnostics/", ContinuationToken: continuationToken }));
      for (const object of page.Contents || []) {
        if (!object.Key) continue;
        const file = await s3.send(new GetObjectCommand({ Bucket: sourceBucket, Key: object.Key }));
        if (!file.Body) throw new Error(`Missing diagnostic: ${object.Key}`);
        await s3.send(new PutObjectCommand({ Bucket: backupBucket, Key: `diagnostics/${day}/${object.Key.slice("diagnostics/".length)}`, Body: await file.Body.transformToByteArray(), ContentType: file.ContentType || "application/octet-stream" }));
        count++;
      }
      continuationToken = page.NextContinuationToken;
    } while (continuationToken);
    await s3.send(new PutObjectCommand({ Bucket: backupBucket, Key: `manifests/${day}.json`, Body: JSON.stringify({ createdAt: new Date().toISOString(), database: `database/${day}.dump`, diagnosticsPrefix: `diagnostics/${day}/`, fileCount: count }), ContentType: "application/json" }));
    console.log(`Backup completed for ${day}: database and ${count} diagnostics.`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
