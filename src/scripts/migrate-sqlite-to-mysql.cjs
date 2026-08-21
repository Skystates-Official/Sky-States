require("dotenv").config();
const Database = require("better-sqlite3");
const mysql = require("mysql2/promise");
const path = require("path");

// ============================================================
// CONFIGURATION
// ============================================================

// SQLite database
const SQLITE_FILE = path.join(__dirname, "../../data.db");

// Hostinger MySQL database
const MYSQL_CONFIG = {
  host:"skystates.us",
  port: 3306,
  user: "skyadmin",
  password: "e48mQzH*Pe_$F2G",
  database: "skyblogs",
  
};

// Number of rows inserted at a time
const BATCH_SIZE = 500;

// ============================================================
// HELPERS
// ============================================================

function quoteIdentifier(name) {
  return "`" + String(name).replace(/`/g, "``") + "`";
}

function mapSQLiteTypeToMySQL(sqliteType, column) {
  const type = String(sqliteType || "").toUpperCase();

  if (type === "INTEGER" && column.pk === 1) {
    return "BIGINT";
  }

  if (type.includes("INT")) {
    return "BIGINT";
  }

  if (
    type.includes("CHAR") ||
    type.includes("CLOB") ||
    type.includes("TEXT")
  ) {
    return "LONGTEXT";
  }

  if (
    type.includes("REAL") ||
    type.includes("FLOA") ||
    type.includes("DOUB")
  ) {
    return "DOUBLE";
  }

  if (
    type.includes("NUMERIC") ||
    type.includes("DECIMAL")
  ) {
    return "DECIMAL(65,30)";
  }

  if (type.includes("BOOL")) {
    return "TINYINT(1)";
  }

  if (
    type.includes("DATE") ||
    type.includes("TIME")
  ) {
    return "DATETIME";
  }

  if (type.includes("BLOB")) {
    return "LONGBLOB";
  }

  // Safe fallback for SQLite's flexible typing
  return "LONGTEXT";
}

function normalizeValue(value) {
  if (value === undefined) {
    return null;
  }

  return value;
}

// ============================================================
// MIGRATE ONE TABLE
// ============================================================

async function migrateTable(
  sqlite,
  mysqlConnection,
  tableName
) {
  console.log("");
  console.log("----------------------------------------------");
  console.log(`Table: ${tableName}`);
  console.log("----------------------------------------------");

  const quotedTable = quoteIdentifier(tableName);

  // ----------------------------------------------------------
  // Get SQLite columns
  // ----------------------------------------------------------

  const columns = sqlite
    .prepare(
      `PRAGMA table_info(${quoteIdentifier(tableName)})`
    )
    .all();

  if (!columns.length) {
    console.log("No columns found. Skipping.");
    return;
  }

  // ----------------------------------------------------------
  // Create MySQL column definitions
  // ----------------------------------------------------------

  const columnDefinitions = [];

  for (const column of columns) {
    let definition = `
      ${quoteIdentifier(column.name)}
      ${mapSQLiteTypeToMySQL(column.type, column)}
    `;

    // NOT NULL
    if (column.notnull === 1) {
      definition += " NOT NULL";
    }

    // PRIMARY KEY
    if (column.pk > 0) {
      definition += " PRIMARY KEY";
    }

    columnDefinitions.push(definition.trim());
  }

  // ----------------------------------------------------------
  // Drop existing MySQL table
  // ----------------------------------------------------------

  console.log("Removing existing MySQL table if it exists...");

  await mysqlConnection.query(
    `DROP TABLE IF EXISTS ${quotedTable}`
  );

  // ----------------------------------------------------------
  // Create MySQL table
  // ----------------------------------------------------------

  const createSQL = `
    CREATE TABLE ${quotedTable} (
      ${columnDefinitions.join(",\n      ")}
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `;

  console.log("Creating MySQL table...");

  await mysqlConnection.query(createSQL);

  console.log("✓ Table created");

  // ----------------------------------------------------------
  // Get SQLite rows
  // ----------------------------------------------------------

  const rows = sqlite
    .prepare(
      `SELECT * FROM ${quotedTable}`
    )
    .all();

  console.log(`Found ${rows.length} row(s)`);

  if (rows.length === 0) {
    console.log("✓ Empty table");
    return;
  }

  // ----------------------------------------------------------
  // Column names
  // ----------------------------------------------------------

  const columnNames = columns.map(
    (column) => quoteIdentifier(column.name)
  );

  // ----------------------------------------------------------
  // Insert rows in batches
  // ----------------------------------------------------------

  let inserted = 0;

  for (
    let start = 0;
    start < rows.length;
    start += BATCH_SIZE
  ) {
    const batch = rows.slice(
      start,
      start + BATCH_SIZE
    );

    const batchPlaceholders = batch
      .map(
        () =>
          `(${columns
            .map(() => "?")
            .join(", ")})`
      )
      .join(", ");

    const values = [];

    for (const row of batch) {
      for (const column of columns) {
        values.push(
          normalizeValue(row[column.name])
        );
      }
    }

    const insertSQL = `
      INSERT INTO ${quotedTable}
      (${columnNames.join(", ")})
      VALUES ${batchPlaceholders}
    `;

    await mysqlConnection.query(
      insertSQL,
      values
    );

    inserted += batch.length;

    console.log(
      `  Inserted ${inserted}/${rows.length}`
    );
  }

  console.log(
    `✓ ${tableName}: ${rows.length} row(s) migrated`
  );
}

// ============================================================
// MAIN MIGRATION
// ============================================================

async function migrate() {
  let sqlite = null;
  let mysqlConnection = null;

  try {
    console.log("");
    console.log("==============================================");
    console.log(" SQLite → Hostinger MySQL Migration");
    console.log("==============================================");
    console.log("");

    // --------------------------------------------------------
    // Open SQLite
    // --------------------------------------------------------

    console.log(
      `SQLite database: ${SQLITE_FILE}`
    );

    sqlite = new Database(
      SQLITE_FILE,
      {
        readonly: true,
      }
    );

    console.log(
      "✓ SQLite database opened"
    );

    // --------------------------------------------------------
    // Connect to Hostinger MySQL
    // --------------------------------------------------------

    console.log(
      `Connecting to MySQL: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}`
    );

    mysqlConnection =
      await mysql.createConnection(
        MYSQL_CONFIG
      );

    console.log(
      "✓ MySQL connection established"
    );

    // --------------------------------------------------------
    // Get SQLite tables
    // --------------------------------------------------------

    const tables = sqlite
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)
      .all();

    console.log("");
    console.log(
      `Found ${tables.length} SQLite table(s):`
    );

    for (const table of tables) {
      console.log(
        `  - ${table.name}`
      );
    }

    // --------------------------------------------------------
    // Disable foreign key checks
    // --------------------------------------------------------

    await mysqlConnection.query(
      "SET FOREIGN_KEY_CHECKS = 0"
    );

    // --------------------------------------------------------
    // Migrate every table
    // --------------------------------------------------------

    for (const table of tables) {
      await migrateTable(
        sqlite,
        mysqlConnection,
        table.name
      );
    }

    // --------------------------------------------------------
    // Re-enable foreign keys
    // --------------------------------------------------------

    await mysqlConnection.query(
      "SET FOREIGN_KEY_CHECKS = 1"
    );

    console.log("");
    console.log("==============================================");
    console.log(" Migration completed successfully!");
    console.log("==============================================");
    console.log("");

  } catch (error) {
    console.error("");
    console.error("==============================================");
    console.error(" MIGRATION FAILED");
    console.error("==============================================");
    console.error("");

    console.error(error);

    console.error("");

    // Try to restore foreign key checks
    if (mysqlConnection) {
      try {
        await mysqlConnection.query(
          "SET FOREIGN_KEY_CHECKS = 1"
        );
      } catch {}
    }

    process.exitCode = 1;

  } finally {
    // Close SQLite
    if (sqlite) {
      sqlite.close();
    }

    // Close MySQL
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

// ============================================================
// START
// ============================================================

migrate();
