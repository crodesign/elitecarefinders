import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import path from "path";

export const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
    },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// All media stored under media/ prefix in the bucket
export const R2_PREFIX = "media";

export function toR2Key(filename: string): string {
    return `${R2_PREFIX}/${filename}`;
}

export function toPublicUrl(filename: string): string {
    return `${R2_PUBLIC_URL}/${R2_PREFIX}/${filename}`;
}

export function filenameFromUrl(url: string): string {
    return url.split("/").pop() ?? "";
}

export function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const map: Record<string, string> = {
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
        ".pdf": "application/pdf",
    };
    return map[ext] ?? "application/octet-stream";
}

export async function r2Upload(filename: string, body: Buffer, contentType: string): Promise<void> {
    await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: toR2Key(filename),
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
    }));
}

export async function r2Delete(filename: string): Promise<void> {
    await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: toR2Key(filename),
    }));
}

export async function r2Rename(oldFilename: string, newFilename: string): Promise<void> {
    // R2/S3 has no rename — copy then delete
    await r2Client.send(new CopyObjectCommand({
        Bucket: R2_BUCKET,
        CopySource: `${R2_BUCKET}/${toR2Key(oldFilename)}`,
        Key: toR2Key(newFilename),
        MetadataDirective: "COPY",
    }));
    await r2Delete(oldFilename);
}

export async function r2Exists(filename: string): Promise<boolean> {
    try {
        await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: toR2Key(filename) }));
        return true;
    } catch {
        return false;
    }
}

export async function r2List(prefix: string): Promise<string[]> {
    const filenames: string[] = [];
    let continuationToken: string | undefined;
    const fullPrefix = `${R2_PREFIX}/${prefix}`;
    do {
        const response = await r2Client.send(new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: fullPrefix,
            ContinuationToken: continuationToken,
        }));
        for (const obj of response.Contents ?? []) {
            if (obj.Key) {
                filenames.push(obj.Key.slice(R2_PREFIX.length + 1));
            }
        }
        continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    return filenames;
}
