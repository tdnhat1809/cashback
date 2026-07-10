import { loadConfig } from '../config.js';
import { openDatabase } from '../db/database.js';

const config = loadConfig();
const database = openDatabase(config.DATABASE_PATH);
const migrations = database.prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version').all();
console.log(JSON.stringify({ database: config.DATABASE_PATH, migrations }, null, 2));
database.close();
