import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'downline.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    state TEXT,
    status TEXT NOT NULL DEFAULT 'Prospect',
    rank TEXT,
    join_date TEXT,
    sponsor_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    referral_source TEXT,
    personal_volume REAL NOT NULL DEFAULT 0,
    group_volume REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_members_sponsor_id ON members(sponsor_id);
  CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
`);

const count = db.prepare('SELECT COUNT(*) AS total FROM members').get().total;

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO members (
      first_name, last_name, email, phone, city, state, status, rank, join_date,
      sponsor_id, referral_source, personal_volume, group_volume, notes
    ) VALUES (
      @firstName, @lastName, @email, @phone, @city, @state, @status, @rank, @joinDate,
      @sponsorId, @referralSource, @personalVolume, @groupVolume, @notes
    )
  `);

  const add = (member) => insert.run(member).lastInsertRowid;
  const rootId = add({
    firstName: 'Jordan',
    lastName: 'Reed',
    email: 'jordan@example.com',
    phone: '555-0100',
    city: 'Austin',
    state: 'TX',
    status: 'Active',
    rank: 'Executive',
    joinDate: '2025-01-15',
    sponsorId: null,
    referralSource: 'Founder',
    personalVolume: 1800,
    groupVolume: 18450,
    notes: 'Primary account owner.'
  });
  const mayaId = add({
    firstName: 'Maya',
    lastName: 'Chen',
    email: 'maya@example.com',
    phone: '555-0111',
    city: 'Portland',
    state: 'OR',
    status: 'Active',
    rank: 'Leader',
    joinDate: '2025-03-04',
    sponsorId: rootId,
    referralSource: 'Coffee meeting',
    personalVolume: 1220,
    groupVolume: 6420,
    notes: 'Strong onboarding follow-up cadence.'
  });
  const eliId = add({
    firstName: 'Eli',
    lastName: 'Morgan',
    email: 'eli@example.com',
    phone: '555-0122',
    city: 'Denver',
    state: 'CO',
    status: 'Active',
    rank: 'Builder',
    joinDate: '2025-05-21',
    sponsorId: rootId,
    referralSource: 'Webinar',
    personalVolume: 760,
    groupVolume: 3180,
    notes: 'Interested in leadership training.'
  });
  add({
    firstName: 'Nina',
    lastName: 'Patel',
    email: 'nina@example.com',
    phone: '555-0133',
    city: 'Phoenix',
    state: 'AZ',
    status: 'Prospect',
    rank: '',
    joinDate: '',
    sponsorId: mayaId,
    referralSource: 'Maya referral',
    personalVolume: 0,
    groupVolume: 0,
    notes: 'Follow up next week.'
  });
  add({
    firstName: 'Sam',
    lastName: 'Brooks',
    email: 'sam@example.com',
    phone: '555-0144',
    city: 'Boise',
    state: 'ID',
    status: 'Active',
    rank: 'Consultant',
    joinDate: '2025-08-10',
    sponsorId: mayaId,
    referralSource: 'Local event',
    personalVolume: 430,
    groupVolume: 430,
    notes: ''
  });
  add({
    firstName: 'Avery',
    lastName: 'Lopez',
    email: 'avery@example.com',
    phone: '555-0155',
    city: 'Salt Lake City',
    state: 'UT',
    status: 'Inactive',
    rank: 'Consultant',
    joinDate: '2025-06-01',
    sponsorId: eliId,
    referralSource: 'Eli referral',
    personalVolume: 120,
    groupVolume: 120,
    notes: 'Check reactivation interest.'
  });
}

export function mapMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || '',
    phone: row.phone || '',
    city: row.city || '',
    state: row.state || '',
    status: row.status,
    rank: row.rank || '',
    joinDate: row.join_date || '',
    sponsorId: row.sponsor_id,
    referralSource: row.referral_source || '',
    personalVolume: row.personal_volume,
    groupVolume: row.group_volume,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
