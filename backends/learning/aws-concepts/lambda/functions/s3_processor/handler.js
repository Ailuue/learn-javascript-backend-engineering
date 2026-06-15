// Triggered by S3 ObjectCreated events. The event carries one Record per object.
exports.handler = async (event) => {
  for (const record of event.Records ?? []) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const size = record.s3.object.size ?? "unknown";
    console.log(`[s3_processor] New object: s3://${bucket}/${key}  (${size} bytes)`);
  }
  return { processed: (event.Records ?? []).length };
};
