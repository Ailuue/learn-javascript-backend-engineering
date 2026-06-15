// Small helpers to package Lambda code into a zip buffer in memory.
// AWS Lambda always wants a zip; adm-zip builds one without touching disk.

const AdmZip = require("adm-zip");

// Zip a file on disk under the archive name "handler.js".
function zipFile(path) {
  const zip = new AdmZip();
  zip.addLocalFile(path, "", "handler.js");
  return zip.toBuffer();
}

// Zip an in-memory string as "handler.js" (used for re-deploys / inline code).
function zipCode(code) {
  const zip = new AdmZip();
  zip.addFile("handler.js", Buffer.from(code));
  return zip.toBuffer();
}

module.exports = { zipFile, zipCode };
