import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let db: Database | null = null;

export async function connectDatabase(): Promise<void> {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'gridhealth.db');
    
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    // Create tables if they don't exist
    await createTables();
    
    console.log('✅ Connected to SQLite database');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not connected');
  
  // Organizations table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Devices table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      device_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id)
    )
  `);
  
  // Health metrics table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS health_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      metric_type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices (id)
    )
  `);
  
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id)
    )
  `);
  
  console.log('✅ Database tables created/verified');
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  if (!db) throw new Error('Database not connected');
  
  const start = Date.now();
  try {
    const result = await db.all(sql, params);
    const duration = Date.now() - start;
    console.log('Executed query', { sql, duration, rows: result.length });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function run(sql: string, params: any[] = []): Promise<any> {
  if (!db) throw new Error('Database not connected');
  
  const start = Date.now();
  try {
    const result = await db.run(sql, params);
    const duration = Date.now() - start;
    console.log('Executed query', { sql, duration, changes: result.changes });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function get(sql: string, params: any[] = []): Promise<any> {
  if (!db) throw new Error('Database not connected');
  
  const start = Date.now();
  try {
    const result = await db.get(sql, params);
    const duration = Date.now() - start;
    console.log('Executed query', { sql, duration, found: !!result });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}

export default db; 