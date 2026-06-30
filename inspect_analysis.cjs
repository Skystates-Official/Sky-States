const fs = require('fs');
const path = require('path');

const analysis = JSON.parse(fs.readFileSync('C:\\Users\\DELL\\OneDrive\\Desktop\\sky states advnce\\codebase_analysis.json', 'utf-8'));

const pages = [
  'pages\\about.astro',
  'pages\\admin.astro',
  'pages\\career-hub.astro',
  'pages\\career-roi.astro',
  'pages\\certifications.astro',
  'pages\\checkout.astro',
  'pages\\faq.astro',
  'pages\\live-jobs.astro',
  'pages\\news.astro',
  'pages\\placements.astro'
];

pages.forEach(p => {
  const data = analysis.pages[p];
  if (!data) {
    console.log(`\nPage not found: ${p}`);
    return;
  }
  console.log(`\n========================================`);
  console.log(`PAGE: ${p}`);
  console.log(`========================================`);
  console.log(`Title: ${data.title}`);
  console.log(`Meta Description: ${data.description}`);
  console.log(`Headers:`);
  data.headers.forEach(h => console.log(`  ${h.tag}: ${h.text}`));
  console.log(`CTAs:`);
  data.ctas.forEach(c => console.log(`  "${c.text}" -> ${c.href}`));
});
