import { uploadDocumentFromBuffer } from "./src/services/cloudinaryService";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    console.log("Starting upload test with auto for PDF...");
    const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Title (Dummy PDF)\n>>\nendobj\nxref\n0 2\n0000000000 65535 f\n0000000009 00000 n\ntrailer\n<<\n/Size 2\n/Root 1 0 R\n>>\nstartxref\n49\n%%EOF\n", "utf-8"); // fake PDF buffer
    const result = await uploadDocumentFromBuffer(buffer, {
      folder: "test-folder",
      resourceType: "auto"
    });
    console.log("Upload success:", result);
  } catch (error) {
    console.error("Upload error:", error);
  }
}

run();
