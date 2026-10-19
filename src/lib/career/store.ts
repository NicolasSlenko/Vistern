import "server-only"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/aws/s3"
import {
  workspaceSchema,
  WorkspaceConflict,
  type CareerWorkspace,
} from "./workspace"

const key = (userId: string) => `uploads/${userId}/career-workspace.json`

function statusCode(error: unknown) {
  return (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
    ?.httpStatusCode
}

export async function readCareerWorkspace(userId: string) {
  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key(userId),
      }),
    )
    const text = await result.Body?.transformToString()
    if (!text || !result.ETag)
      throw new Error("Incomplete career workspace response")
    return { data: workspaceSchema.parse(JSON.parse(text)), etag: result.ETag }
  } catch (error) {
    if (statusCode(error) === 404)
      return { data: workspaceSchema.parse({}), etag: null }
    throw error
  }
}

export async function writeCareerWorkspace(
  userId: string,
  data: CareerWorkspace,
  etag: string | null,
) {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key(userId),
        Body: JSON.stringify(data),
        ContentType: "application/json",
        ...(etag ? { IfMatch: etag } : { IfNoneMatch: "*" }),
      }),
    )
  } catch (error) {
    if ([409, 412].includes(statusCode(error) || 0))
      throw new WorkspaceConflict(
        "Your plan changed in another window. Reload it before saving.",
      )
    throw error
  }
}
