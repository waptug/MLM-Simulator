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

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    unit_price REAL NOT NULL DEFAULT 0,
    commission_rate REAL NOT NULL DEFAULT 0,
    stock_on_hand INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    commission_rate REAL NOT NULL DEFAULT 0,
    sale_date TEXT NOT NULL,
    customer_name TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
  CREATE INDEX IF NOT EXISTS idx_sales_member_id ON sales(member_id);
  CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
  CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
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

const productCount = db.prepare('SELECT COUNT(*) AS total FROM products').get().total;

if (productCount === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (
      sku, name, category, unit_price, commission_rate, stock_on_hand, reorder_level, active, notes
    ) VALUES (
      @sku, @name, @category, @unitPrice, @commissionRate, @stockOnHand, @reorderLevel, @active, @notes
    )
  `);
  const addProduct = (product) => insertProduct.run(product).lastInsertRowid;

  const starterKitId = addProduct({
    sku: 'KIT-STARTER',
    name: 'Starter Wellness Kit',
    category: 'Kits',
    unitPrice: 129,
    commissionRate: 0.18,
    stockOnHand: 42,
    reorderLevel: 10,
    active: 1,
    notes: 'Common first purchase bundle.'
  });
  const shakeId = addProduct({
    sku: 'NUTR-SHAKE',
    name: 'Daily Nutrition Shake',
    category: 'Nutrition',
    unitPrice: 64,
    commissionRate: 0.12,
    stockOnHand: 86,
    reorderLevel: 20,
    active: 1,
    notes: 'Monthly reorder product.'
  });
  const guideId = addProduct({
    sku: 'GUIDE-DIGITAL',
    name: 'Digital Coaching Guide',
    category: 'Digital',
    unitPrice: 39,
    commissionRate: 0.3,
    stockOnHand: 999,
    reorderLevel: 0,
    active: 1,
    notes: 'Digital delivery.'
  });

  const memberRows = db.prepare('SELECT id FROM members ORDER BY id LIMIT 3').all();
  const insertSale = db.prepare(`
    INSERT INTO sales (
      member_id, product_id, quantity, unit_price, commission_rate, sale_date, customer_name, notes
    ) VALUES (
      @memberId, @productId, @quantity, @unitPrice, @commissionRate, @saleDate, @customerName, @notes
    )
  `);

  if (memberRows.length) {
    insertSale.run({
      memberId: memberRows[0].id,
      productId: starterKitId,
      quantity: 2,
      unitPrice: 129,
      commissionRate: 0.18,
      saleDate: '2026-04-01',
      customerName: 'Retail Customer',
      notes: 'Launch event sale.'
    });
    insertSale.run({
      memberId: memberRows[1]?.id || memberRows[0].id,
      productId: shakeId,
      quantity: 4,
      unitPrice: 64,
      commissionRate: 0.12,
      saleDate: '2026-04-12',
      customerName: 'Monthly autoship',
      notes: ''
    });
    insertSale.run({
      memberId: memberRows[2]?.id || memberRows[0].id,
      productId: guideId,
      quantity: 1,
      unitPrice: 39,
      commissionRate: 0.3,
      saleDate: '2026-04-18',
      customerName: 'Online buyer',
      notes: ''
    });
  }
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

export function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category || '',
    unitPrice: row.unit_price,
    commissionRate: row.commission_rate,
    stockOnHand: row.stock_on_hand,
    reorderLevel: row.reorder_level,
    active: Boolean(row.active),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapSale(row) {
  if (!row) return null;
  const lineTotal = row.quantity * row.unit_price;
  const commission = lineTotal * row.commission_rate;
  return {
    id: row.id,
    memberId: row.member_id,
    productId: row.product_id,
    memberName: row.member_name || '',
    productName: row.product_name || '',
    sku: row.sku || '',
    quantity: row.quantity,
    unitPrice: row.unit_price,
    commissionRate: row.commission_rate,
    lineTotal,
    commission,
    saleDate: row.sale_date,
    customerName: row.customer_name || '',
    notes: row.notes || '',
    createdAt: row.created_at
  };
}
