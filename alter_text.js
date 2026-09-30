import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function alterTables() {
    let pool;
    try {
        console.log('Connecting to MySQL...');
        pool = mysql.createPool(process.env.DATABASE_URL || "mysql://u571325480_skyadmin:e48mQzH*Pe_$F2G@82.197.82.172:3306/u571325480_skyblogs");

        await pool.query("ALTER TABLE blogs MODIFY content LONGTEXT NOT NULL");
        console.log('blogs table altered successfully.');
        
        await pool.query("ALTER TABLE blog_versions MODIFY content LONGTEXT NOT NULL");
        console.log('blog_versions table altered successfully.');
        
    } catch (err) {
        console.error('Error altering table:', err.message);
    } finally {
        if (pool) await pool.end();
    }
}

alterTables();
