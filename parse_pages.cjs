const fs = require('fs');
const path = require('path');

const PAGES_DIR = 'C:\\Users\\DELL\\OneDrive\\Desktop\\sky states advnce\\src\\pages';

function getFiles(dir, files_ = []) {
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = path.join(dir, files[i]);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      if (name.endsWith('.astro') || name.endsWith('.js') || name.endsWith('.json')) {
        files_.push(name);
      }
    }
  }
  return files_;
}

const allFiles = getFiles(PAGES_DIR);

console.log(`Found ${allFiles.length} files in pages directory.`);

allFiles.forEach(filePath => {
  const relPath = path.relative(PAGES_DIR, filePath);
  console.log(`\n========================================`);
  console.log(`FILE: ${relPath}`);
  console.log(`========================================`);
  
  if (filePath.endsWith('.astro')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract Title
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'N/A';
    console.log(`Title: ${title}`);
    
    // Extract Meta Description
    const metaDescMatch = content.match(/<meta\s+content="([^"]+)"\s+name="description"/i) || content.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    const desc = metaDescMatch ? metaDescMatch[1].trim() : 'N/A';
    console.log(`Meta Description: ${desc}`);
    
    // Extract Frontmatter
    const frontmatterMatch = content.match(/^---([\s\S]*?)---/);
    if (frontmatterMatch) {
      console.log(`Frontmatter:\n${frontmatterMatch[1].trim()}`);
    }
    
    // Extract all H1, H2, H3 and H4
    const headers = [];
    const headerRegex = /<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
      headers.push(`${match[1].toUpperCase()}: ${match[2].replace(/<[^>]+>/g, '').trim()}`);
    }
    console.log(`Headers:\n  ${headers.slice(0, 35).join('\n  ')}`);

    // Extract CTAs (links with button-like classes or hrefs)
    const ctas = [];
    const ctaRegex = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = ctaRegex.exec(content)) !== null) {
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      const href = match[1].trim();
      if (text.length > 0) {
        ctas.push(`"${text}" -> ${href}`);
      }
    }
    console.log(`CTAs:\n  ${ctas.slice(0, 20).join('\n  ')}`);
  } else {
    console.log(`(Non-Astro File)`);
  }
});
