/**
 * Database Connection Pool Configuration
 * PostgreSQL for Replit
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// طريقة connect متوافقة مع الكود
pool.connect = () => {
  return pool.connect();
};

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database pool test successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database pool test failed:', error.message);
    return false;
  }
};

export default pool;