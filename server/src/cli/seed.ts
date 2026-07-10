import { loadConfig } from '../config.js';
import { openDatabase } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';

const config = loadConfig();
const database = openDatabase(config.DATABASE_PATH);
console.log(JSON.stringify(seedDatabase(database), null, 2));
database.close();
