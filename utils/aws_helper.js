import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function putToS3(opts) {
  const Bucket = process.env.S3_BUCKET;
  const { key, body, contentType } = opts;
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
  return `https://${Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
}
