import fs from "fs";
import path from "path";

const source = path.join(process.cwd(), "node_modules", "tinymce");
const destination = path.join(process.cwd(), "public", "tinymce");

if (!fs.existsSync(source)) {
  console.error("❌ TinyMCE is not installed.");
  process.exit(1);
}

if (fs.existsSync(destination)) {
  fs.rmSync(destination, { recursive: true, force: true });
}

fs.cpSync(source, destination, { recursive: true });

console.log("✅ TinyMCE copied successfully!");