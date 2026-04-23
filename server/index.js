import express from 'express';
import { db, mapMember, mapProduct, mapSale } from './db.js';

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '127.0.0.1';

app.use(express.json());

const memberFields = `
  id, first_name, last_name, email, phone, city, state, status, rank, join_date,
  sponsor_id, referral_source, personal_volume, group_volume, notes, created_at, updated_at
`;
const productFields = `
  id, sku, name, category, unit_price, commission_rate, stock_on_hand, reorder_level,
  active, notes, created_at, updated_at
`;
const saleFields = `
  sales.id, sales.member_id, sales.product_id, sales.quantity, sales.unit_price,
  sales.commission_rate, sales.sale_date, sales.customer_name, sales.notes, sales.created_at,
  members.first_name || ' ' || members.last_name AS member_name,
  products.name AS product_name,
  products.sku AS sku
`;

function allMembers() {
  return db.prepare(`SELECT ${memberFields} FROM members ORDER BY last_name, first_name`).all().map(mapMember);
}

function getMember(id) {
  return mapMember(db.prepare(`SELECT ${memberFields} FROM members WHERE id = ?`).get(id));
}

function normalizeMember(input) {
  return {
    firstName: String(input.firstName || '').trim(),
    lastName: String(input.lastName || '').trim(),
    email: String(input.email || '').trim(),
    phone: String(input.phone || '').trim(),
    city: String(input.city || '').trim(),
    state: String(input.state || '').trim(),
    status: String(input.status || 'Prospect').trim(),
    rank: String(input.rank || '').trim(),
    joinDate: String(input.joinDate || '').trim(),
    sponsorId: input.sponsorId ? Number(input.sponsorId) : null,
    referralSource: String(input.referralSource || '').trim(),
    personalVolume: Number(input.personalVolume || 0),
    groupVolume: Number(input.groupVolume || 0),
    notes: String(input.notes || '').trim()
  };
}

function validateMember(member, currentId = null) {
  if (!member.firstName || !member.lastName) return 'First and last name are required.';
  if (member.sponsorId && member.sponsorId === Number(currentId)) return 'A member cannot sponsor themselves.';
  if (member.sponsorId && !getMember(member.sponsorId)) return 'Selected sponsor does not exist.';
  if (!['Prospect', 'Active', 'Inactive', 'Paused'].includes(member.status)) return 'Unsupported status.';
  return null;
}

function getProduct(id) {
  return mapProduct(db.prepare(`SELECT ${productFields} FROM products WHERE id = ?`).get(id));
}

function normalizeProduct(input) {
  return {
    sku: String(input.sku || '').trim().toUpperCase(),
    name: String(input.name || '').trim(),
    category: String(input.category || '').trim(),
    unitPrice: Number(input.unitPrice || 0),
    commissionRate: Number(input.commissionRate || 0),
    stockOnHand: Number.parseInt(input.stockOnHand || 0, 10),
    reorderLevel: Number.parseInt(input.reorderLevel || 0, 10),
    active: input.active === false ? 0 : 1,
    notes: String(input.notes || '').trim()
  };
}

function validateProduct(product) {
  if (!product.sku || !product.name) return 'SKU and product name are required.';
  if (product.unitPrice < 0) return 'Unit price cannot be negative.';
  if (product.commissionRate < 0 || product.commissionRate > 1) return 'Commission rate must be between 0 and 1.';
  if (product.stockOnHand < 0 || product.reorderLevel < 0) return 'Inventory counts cannot be negative.';
  return null;
}

function normalizeSale(input) {
  return {
    memberId: Number(input.memberId || 0),
    productId: Number(input.productId || 0),
    quantity: Number.parseInt(input.quantity || 1, 10),
    unitPrice: Number(input.unitPrice || 0),
    commissionRate: Number(input.commissionRate || 0),
    saleDate: String(input.saleDate || '').trim(),
    customerName: String(input.customerName || '').trim(),
    notes: String(input.notes || '').trim()
  };
}

function validateSale(sale) {
  if (!getMember(sale.memberId)) return 'Select a valid selling member.';
  if (!getProduct(sale.productId)) return 'Select a valid product.';
  if (sale.quantity < 1) return 'Quantity must be at least 1.';
  if (sale.unitPrice < 0) return 'Unit price cannot be negative.';
  if (sale.commissionRate < 0 || sale.commissionRate > 1) return 'Commission rate must be between 0 and 1.';
  if (!sale.saleDate) return 'Sale date is required.';
  return null;
}

app.get('/api/members', (_req, res) => {
  res.json({ members: allMembers() });
});

app.get('/api/members/:id', (req, res) => {
  const member = getMember(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found.' });

  const sponsor = member.sponsorId ? getMember(member.sponsorId) : null;
  const directDownline = db
    .prepare(`SELECT ${memberFields} FROM members WHERE sponsor_id = ? ORDER BY last_name, first_name`)
    .all(member.id)
    .map(mapMember);

  res.json({ member, sponsor, directDownline });
});

app.post('/api/members', (req, res) => {
  const member = normalizeMember(req.body);
  const error = validateMember(member);
  if (error) return res.status(400).json({ error });

  const result = db.prepare(`
    INSERT INTO members (
      first_name, last_name, email, phone, city, state, status, rank, join_date,
      sponsor_id, referral_source, personal_volume, group_volume, notes, updated_at
    ) VALUES (
      @firstName, @lastName, @email, @phone, @city, @state, @status, @rank, @joinDate,
      @sponsorId, @referralSource, @personalVolume, @groupVolume, @notes, CURRENT_TIMESTAMP
    )
  `).run(member);

  res.status(201).json({ member: getMember(result.lastInsertRowid) });
});

app.put('/api/members/:id', (req, res) => {
  if (!getMember(req.params.id)) return res.status(404).json({ error: 'Member not found.' });
  const member = normalizeMember(req.body);
  const error = validateMember(member, req.params.id);
  if (error) return res.status(400).json({ error });

  db.prepare(`
    UPDATE members SET
      first_name = @firstName,
      last_name = @lastName,
      email = @email,
      phone = @phone,
      city = @city,
      state = @state,
      status = @status,
      rank = @rank,
      join_date = @joinDate,
      sponsor_id = @sponsorId,
      referral_source = @referralSource,
      personal_volume = @personalVolume,
      group_volume = @groupVolume,
      notes = @notes,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({ ...member, id: Number(req.params.id) });

  res.json({ member: getMember(req.params.id) });
});

app.get('/api/products', (_req, res) => {
  const products = db.prepare(`SELECT ${productFields} FROM products ORDER BY active DESC, name`).all().map(mapProduct);
  res.json({ products });
});

app.post('/api/products', (req, res) => {
  const product = normalizeProduct(req.body);
  const error = validateProduct(product);
  if (error) return res.status(400).json({ error });

  try {
    const result = db.prepare(`
      INSERT INTO products (
        sku, name, category, unit_price, commission_rate, stock_on_hand,
        reorder_level, active, notes, updated_at
      ) VALUES (
        @sku, @name, @category, @unitPrice, @commissionRate, @stockOnHand,
        @reorderLevel, @active, @notes, CURRENT_TIMESTAMP
      )
    `).run(product);
    res.status(201).json({ product: getProduct(result.lastInsertRowid) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'SKU must be unique.' });
    throw error;
  }
});

app.put('/api/products/:id', (req, res) => {
  if (!getProduct(req.params.id)) return res.status(404).json({ error: 'Product not found.' });
  const product = normalizeProduct(req.body);
  const error = validateProduct(product);
  if (error) return res.status(400).json({ error });

  try {
    db.prepare(`
      UPDATE products SET
        sku = @sku,
        name = @name,
        category = @category,
        unit_price = @unitPrice,
        commission_rate = @commissionRate,
        stock_on_hand = @stockOnHand,
        reorder_level = @reorderLevel,
        active = @active,
        notes = @notes,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ ...product, id: Number(req.params.id) });
    res.json({ product: getProduct(req.params.id) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'SKU must be unique.' });
    throw error;
  }
});

app.get('/api/sales', (_req, res) => {
  const sales = db.prepare(`
    SELECT ${saleFields}
    FROM sales
    JOIN members ON members.id = sales.member_id
    JOIN products ON products.id = sales.product_id
    ORDER BY sales.sale_date DESC, sales.id DESC
  `).all().map(mapSale);
  res.json({ sales });
});

app.post('/api/sales', (req, res) => {
  const product = getProduct(req.body.productId);
  const sale = normalizeSale({
    ...req.body,
    unitPrice: req.body.unitPrice === undefined || req.body.unitPrice === '' ? product?.unitPrice : req.body.unitPrice,
    commissionRate:
      req.body.commissionRate === undefined || req.body.commissionRate === '' ? product?.commissionRate : req.body.commissionRate
  });
  const error = validateSale(sale);
  if (error) return res.status(400).json({ error });

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO sales (
        member_id, product_id, quantity, unit_price, commission_rate, sale_date, customer_name, notes
      ) VALUES (
        @memberId, @productId, @quantity, @unitPrice, @commissionRate, @saleDate, @customerName, @notes
      )
    `).run(sale);

    db.prepare(`
      UPDATE products
      SET stock_on_hand = MAX(stock_on_hand - @quantity, 0), updated_at = CURRENT_TIMESTAMP
      WHERE id = @productId
    `).run(sale);

    return result.lastInsertRowid;
  });

  const saleId = transaction();
  const savedSale = db.prepare(`
    SELECT ${saleFields}
    FROM sales
    JOIN members ON members.id = sales.member_id
    JOIN products ON products.id = sales.product_id
    WHERE sales.id = ?
  `).get(saleId);
  res.status(201).json({ sale: mapSale(savedSale) });
});

app.get('/api/inventory-summary', (_req, res) => {
  const summary = db.prepare(`
    SELECT
      COUNT(*) AS product_count,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active_product_count,
      SUM(stock_on_hand * unit_price) AS inventory_value,
      SUM(CASE WHEN stock_on_hand <= reorder_level THEN 1 ELSE 0 END) AS low_stock_count
    FROM products
  `).get();

  const salesSummary = db.prepare(`
    SELECT
      COALESCE(SUM(quantity * unit_price), 0) AS sales_volume,
      COALESCE(SUM(quantity * unit_price * commission_rate), 0) AS commissions
    FROM sales
  `).get();

  const memberCommissions = db.prepare(`
    SELECT
      members.id AS member_id,
      members.first_name || ' ' || members.last_name AS member_name,
      COALESCE(SUM(sales.quantity * sales.unit_price), 0) AS sales_volume,
      COALESCE(SUM(sales.quantity * sales.unit_price * sales.commission_rate), 0) AS commissions
    FROM members
    LEFT JOIN sales ON sales.member_id = members.id
    GROUP BY members.id
    HAVING sales_volume > 0
    ORDER BY commissions DESC
  `).all();

  res.json({
    summary: {
      productCount: summary.product_count || 0,
      activeProductCount: summary.active_product_count || 0,
      inventoryValue: summary.inventory_value || 0,
      lowStockCount: summary.low_stock_count || 0,
      salesVolume: salesSummary.sales_volume || 0,
      commissions: salesSummary.commissions || 0
    },
    memberCommissions
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: 'sqlite' });
});

const server = app.listen(port, host, () => {
  console.log(`Downline Manager API listening on http://${host}:${port}`);
});

server.on('error', (error) => {
  console.error(`Unable to start API server: ${error.message}`);
  process.exit(1);
});
