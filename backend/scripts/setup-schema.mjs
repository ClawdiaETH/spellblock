#!/usr/bin/env node
import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = join(__dirname, '../../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const [, key, value] = match
    process.env[key] = value.replace(/^["']|["']$/g, '')
  }
})

const schemaPath = join(__dirname, '../../database/schema.sql')
const sql = readFileSync(schemaPath, 'utf-8')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('🔧 Setting up database schema...')
  console.log('Connection string:', process.env.POSTGRES_URL ? '✓ Found' : '✗ Missing')
  await pool.query(sql)
  console.log('✅ Schema created successfully')
} catch (error) {
  console.error('❌ Error:', error.message)
  console.error('Full error:', error)
  process.exit(1)
} finally {
  await pool.end()
}
