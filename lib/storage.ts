import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function client() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) throw new Error("S3 storage is not configured.");
  return { bucket, s3: new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" }) };
}

export async function putPrivateObject(key: string, bytes: Uint8Array, contentType: string) {
  const { s3, bucket } = client();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
}

export async function getPrivateObject(key: string) {
  const { s3, bucket } = client();
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return result.Body?.transformToByteArray();
}
