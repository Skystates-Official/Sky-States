const fs = require('fs');
const path = require('path');

const BASE_DIR = 'C:\\Users\\DELL\\OneDrive\\Desktop\\sky states advnce';
const SRC_DIR = path.join(BASE_DIR, 'src');

function getFilesRecursively(dir, filterFn) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, filterFn));
    } else if (filterFn(fullPath)) {
      results.push(fullPath);
    }
  });
  return results;
}

const astroFilter = p => p.endsWith('.astro');
const jsonFilter = p => p.endsWith('.json');
const jsFilter = p => p.endsWith('.js') || p.endsWith('.mjs');

const astroFiles = getFilesRecursively(SRC_DIR, astroFilter);
const jsonFiles = getFilesRecursively(SRC_DIR, jsonFilter);
const jsFiles = getFilesRecursively(SRC_DIR, jsFilter);

const analysis = {
  pages: {},
  components: {},
  layouts: {},
  data: {},
  jobs_content: []
};

// Parse Astro files
astroFiles.forEach(file => {
  const rel = path.relative(SRC_DIR, file);
  const content = fs.readFileSync(file, 'utf-8');
  
  // Extract frontmatter
  const fmMatch = content.match(/^---([\s\S]*?)---/);
  const frontmatter = fmMatch ? fmMatch[1].trim() : '';
  
  // Title & Meta Description
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';
  
  const metaMatch = content.match(/<meta\s+content="([^"]+)"\s+name="description"/i) || content.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const description = metaMatch ? metaMatch[1].trim() : '';
  
  // Headers
  const headers = [];
  const headerRegex = /<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    headers.push({
      tag: match[1].toUpperCase(),
      text: match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    });
  }
  
  // CTAs
  const ctas = [];
  const ctaRegex = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = ctaRegex.exec(content)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) {
      ctas.push({ text, href: match[1] });
    }
  }

  // Check if it's a page, component or layout
  if (rel.startsWith('pages')) {
    analysis.pages[rel] = { title, description, frontmatter, headers, ctas };
  } else if (rel.startsWith('components')) {
    analysis.components[rel] = { frontmatter, headers, ctas, fileLength: content.length };
  } else if (rel.startsWith('layouts')) {
    analysis.layouts[rel] = { title, description, frontmatter, fileLength: content.length };
  }
});

// Parse JSON data files
jsonFiles.forEach(file => {
  const rel = path.relative(SRC_DIR, file);
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(content);
    if (rel.startsWith('content')) {
      analysis.jobs_content.push(parsed);
    } else if (rel.startsWith('data')) {
      analysis.data[rel] = parsed;
    }
  } catch (e) {
    console.error(`Error parsing JSON file: ${rel}`, e.message);
  }
});

fs.writeFileSync(
  path.join(BASE_DIR, 'codebase_analysis.json'), 
  JSON.stringify(analysis, null, 2), 
  'utf-8'
);

console.log('Successfully wrote codebase_analysis.json with all structural and copy data.');
