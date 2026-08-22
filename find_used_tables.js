import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('./src');

const tables = [
    'users', 'pages', 'media', 'file_versions', 'blogs', 
    'blog_comments', 'notifications', 'blog_versions', 
    'blog_attachments', 'redirect_rules', 'analytics_cache', 
    'jobs', 'settings', 'forms', 'audit_logs', 'coupons', 
    'orders', 'order_payments', 'email_log', 'reviews', 
    'linkedin_reviews'
];

function scanDirectory(dir, results) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            scanDirectory(fullPath, results);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.astro')) {
            const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
            
            for (const table of tables) {
                if (file === 'sqlite.js') continue;
                
                // Check simple string includes
                if (
                    content.includes('from ' + table) || 
                    content.includes('into ' + table) || 
                    content.includes('update ' + table) ||
                    content.includes('join ' + table)
                ) {
                    results[table] = (results[table] || 0) + 1;
                }
            }
        }
    }
}

const usageResults = {};
scanDirectory(SRC_DIR, usageResults);

console.log('--- DATABASE TABLES USAGE REPORT ---');
for (const table of tables) {
    if (usageResults[table]) {
        console.log(`✅ USED: '${table}' (Found in ${usageResults[table]} files)`);
    } else {
        console.log(`❌ UNUSED: '${table}' (No SQL queries found)`);
    }
}
