import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Mail,
  Network,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  ShoppingCart,
  UserPlus,
  UserRound,
  UsersRound
} from 'lucide-react';
import './styles.css';

const blankMember = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  status: 'Prospect',
  rank: '',
  joinDate: '',
  sponsorId: '',
  referralSource: '',
  personalVolume: 0,
  groupVolume: 0,
  notes: ''
};

const blankProduct = {
  sku: '',
  name: '',
  category: '',
  unitPrice: 0,
  commissionRate: 0.1,
  stockOnHand: 0,
  reorderLevel: 0,
  active: true,
  notes: ''
};

const blankSale = {
  memberId: '',
  customerId: '',
  productId: '',
  quantity: 1,
  unitPrice: '',
  commissionRate: '',
  saleDate: new Date().toISOString().slice(0, 10),
  customerName: '',
  notes: ''
};

const blankCustomer = {
  memberId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  status: 'Lead',
  source: '',
  birthday: '',
  lastContactDate: '',
  nextFollowUpDate: '',
  notes: ''
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

function fullName(member) {
  return `${member.firstName} ${member.lastName}`.trim();
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function buildTree(members) {
  const childrenBySponsor = new Map();
  members.forEach((member) => {
    const key = member.sponsorId || 'root';
    if (!childrenBySponsor.has(key)) childrenBySponsor.set(key, []);
    childrenBySponsor.get(key).push(member);
  });
  return { roots: childrenBySponsor.get('root') || [], childrenBySponsor };
}

function memberDepth(member, membersById) {
  let depth = 0;
  let cursor = member;
  const seen = new Set();
  while (cursor?.sponsorId && membersById.has(cursor.sponsorId) && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    depth += 1;
    cursor = membersById.get(cursor.sponsorId);
  }
  return depth;
}

function descendantCount(id, childrenBySponsor) {
  const children = childrenBySponsor.get(id) || [];
  return children.reduce((total, child) => total + 1 + descendantCount(child.id, childrenBySponsor), 0);
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <Icon size={19} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TreeNode({ member, childrenBySponsor, selectedId, onSelect, level = 0 }) {
  const children = childrenBySponsor.get(member.id) || [];
  return (
    <div className="tree-node">
      <button
        className={`tree-row ${selectedId === member.id ? 'selected' : ''}`}
        style={{ '--level': level }}
        onClick={() => onSelect(member.id)}
      >
        <ChevronRight size={16} className={children.length ? 'visible' : 'hidden'} />
        <span className="tree-name">{fullName(member)}</span>
        <span className={`status ${member.status.toLowerCase()}`}>{member.status}</span>
        <span className="tree-volume">{money.format(member.groupVolume)}</span>
      </button>
      {children.map((child) => (
        <TreeNode
          key={child.id}
          member={child}
          childrenBySponsor={childrenBySponsor}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level + 1}
        />
      ))}
    </div>
  );
}

function MemberForm({ members, selectedMember, onSaved, onCancel }) {
  const [form, setForm] = useState(blankMember);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError('');
    setForm(selectedMember ? { ...blankMember, ...selectedMember, sponsorId: selectedMember.sponsorId || '' } : blankMember);
  }, [selectedMember]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const url = selectedMember ? `/api/members/${selectedMember.id}` : '/api/members';
    const method = selectedMember ? 'PUT' : 'POST';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || 'Unable to save member.');
      return;
    }
    onSaved(payload.member);
    if (!selectedMember) setForm(blankMember);
  }

  return (
    <form className="member-form" onSubmit={submit}>
      <div className="section-title">
        <UserRound size={18} />
        <h2>{selectedMember ? 'Member Profile' : 'Add Member'}</h2>
      </div>

      <div className="form-grid">
        <label>
          First name
          <input value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} required />
        </label>
        <label>
          Last name
          <input value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
        </label>
        <label>
          City
          <input value={form.city} onChange={(event) => setField('city', event.target.value)} />
        </label>
        <label>
          State
          <input value={form.state} onChange={(event) => setField('state', event.target.value)} />
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
            <option>Prospect</option>
            <option>Active</option>
            <option>Paused</option>
            <option>Inactive</option>
          </select>
        </label>
        <label>
          Rank
          <input value={form.rank} onChange={(event) => setField('rank', event.target.value)} />
        </label>
        <label>
          Join date
          <input type="date" value={form.joinDate} onChange={(event) => setField('joinDate', event.target.value)} />
        </label>
        <label>
          Sponsor
          <select value={form.sponsorId || ''} onChange={(event) => setField('sponsorId', event.target.value)}>
            <option value="">No sponsor / top level</option>
            {members
              .filter((member) => member.id !== selectedMember?.id)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {fullName(member)}
                </option>
              ))}
          </select>
        </label>
        <label>
          Personal volume
          <input type="number" min="0" step="1" value={form.personalVolume} onChange={(event) => setField('personalVolume', event.target.value)} />
        </label>
        <label>
          Group volume
          <input type="number" min="0" step="1" value={form.groupVolume} onChange={(event) => setField('groupVolume', event.target.value)} />
        </label>
      </div>

      <label>
        Referral source
        <input value={form.referralSource} onChange={(event) => setField('referralSource', event.target.value)} />
      </label>

      <label>
        Notes
        <textarea rows="4" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" className="primary" disabled={saving}>
          <Save size={17} />
          {saving ? 'Saving' : 'Save'}
        </button>
        {selectedMember ? (
          <button type="button" onClick={onCancel}>
            <Plus size={17} />
            New
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ProductForm({ selectedProduct, onSaved, onCancel }) {
  const [form, setForm] = useState(blankProduct);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError('');
    setForm(selectedProduct ? { ...blankProduct, ...selectedProduct } : blankProduct);
  }, [selectedProduct]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const url = selectedProduct ? `/api/products/${selectedProduct.id}` : '/api/products';
    const method = selectedProduct ? 'PUT' : 'POST';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || 'Unable to save product.');
      return;
    }
    onSaved(payload.product);
    if (!selectedProduct) setForm(blankProduct);
  }

  return (
    <form className="member-form" onSubmit={submit}>
      <div className="section-title">
        <Package size={18} />
        <h2>{selectedProduct ? 'Product Detail' : 'Add Product'}</h2>
      </div>
      <div className="form-grid">
        <label>
          SKU
          <input value={form.sku} onChange={(event) => setField('sku', event.target.value)} required />
        </label>
        <label>
          Product name
          <input value={form.name} onChange={(event) => setField('name', event.target.value)} required />
        </label>
        <label>
          Category
          <input value={form.category} onChange={(event) => setField('category', event.target.value)} />
        </label>
        <label>
          Unit price
          <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setField('unitPrice', event.target.value)} />
        </label>
        <label>
          Commission rate
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={form.commissionRate}
            onChange={(event) => setField('commissionRate', event.target.value)}
          />
        </label>
        <label>
          Stock on hand
          <input type="number" min="0" step="1" value={form.stockOnHand} onChange={(event) => setField('stockOnHand', event.target.value)} />
        </label>
        <label>
          Reorder level
          <input type="number" min="0" step="1" value={form.reorderLevel} onChange={(event) => setField('reorderLevel', event.target.value)} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={form.active} onChange={(event) => setField('active', event.target.checked)} />
          Active product
        </label>
      </div>
      <label>
        Notes
        <textarea rows="3" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={saving}>
          <Save size={17} />
          {saving ? 'Saving' : 'Save'}
        </button>
        {selectedProduct ? (
          <button type="button" onClick={onCancel}>
            <Plus size={17} />
            New
          </button>
        ) : null}
      </div>
    </form>
  );
}

function CustomerForm({ members, selectedCustomer, onSaved, onCancel }) {
  const [form, setForm] = useState(blankCustomer);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError('');
    setForm(selectedCustomer ? { ...blankCustomer, ...selectedCustomer } : blankCustomer);
  }, [selectedCustomer]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const url = selectedCustomer ? `/api/customers/${selectedCustomer.id}` : '/api/customers';
    const method = selectedCustomer ? 'PUT' : 'POST';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || 'Unable to save customer.');
      return;
    }
    onSaved(payload.customer);
    if (!selectedCustomer) setForm(blankCustomer);
  }

  return (
    <form className="member-form" onSubmit={submit}>
      <div className="section-title">
        <UserPlus size={18} />
        <h2>{selectedCustomer ? 'Customer Detail' : 'Add Customer'}</h2>
      </div>
      <div className="form-grid">
        <label>
          Owning member
          <select value={form.memberId} onChange={(event) => setField('memberId', event.target.value)} required>
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {fullName(member)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
            <option>Lead</option>
            <option>Prospect</option>
            <option>Customer</option>
            <option>Preferred</option>
            <option>Inactive</option>
          </select>
        </label>
        <label>
          First name
          <input value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} required />
        </label>
        <label>
          Last name
          <input value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
        </label>
        <label>
          City
          <input value={form.city} onChange={(event) => setField('city', event.target.value)} />
        </label>
        <label>
          State
          <input value={form.state} onChange={(event) => setField('state', event.target.value)} />
        </label>
        <label>
          Source
          <input value={form.source} onChange={(event) => setField('source', event.target.value)} />
        </label>
        <label>
          Birthday
          <input type="date" value={form.birthday} onChange={(event) => setField('birthday', event.target.value)} />
        </label>
        <label>
          Last contact
          <input type="date" value={form.lastContactDate} onChange={(event) => setField('lastContactDate', event.target.value)} />
        </label>
        <label>
          Next follow-up
          <input type="date" value={form.nextFollowUpDate} onChange={(event) => setField('nextFollowUpDate', event.target.value)} />
        </label>
      </div>
      <label>
        Notes
        <textarea rows="3" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={saving}>
          <Save size={17} />
          {saving ? 'Saving' : 'Save'}
        </button>
        {selectedCustomer ? (
          <button type="button" onClick={onCancel}>
            <Plus size={17} />
            New
          </button>
        ) : null}
      </div>
    </form>
  );
}

function customerName(customer) {
  return `${customer.firstName} ${customer.lastName}`.trim();
}

function SaleForm({ members, products, customers, onSaved }) {
  const [form, setForm] = useState(blankSale);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((product) => product.id === Number(form.productId));
  const memberCustomers = customers.filter((customer) => customer.memberId === Number(form.memberId));

  function setField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'productId') {
        const product = products.find((item) => item.id === Number(value));
        next.unitPrice = product?.unitPrice ?? '';
        next.commissionRate = product?.commissionRate ?? '';
      }
      if (field === 'memberId') {
        next.customerId = '';
      }
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || 'Unable to record sale.');
      return;
    }
    onSaved(payload.sale);
    setForm(blankSale);
  }

  const projectedTotal = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  const projectedCommission = projectedTotal * Number(form.commissionRate || 0);

  return (
    <form className="member-form" onSubmit={submit}>
      <div className="section-title">
        <ShoppingCart size={18} />
        <h2>Record Sale</h2>
      </div>
      <div className="form-grid">
        <label>
          Selling member
          <select value={form.memberId} onChange={(event) => setField('memberId', event.target.value)} required>
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {fullName(member)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer
          <select value={form.customerId} onChange={(event) => setField('customerId', event.target.value)}>
            <option value="">Unassigned customer</option>
            {memberCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customerName(customer)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Product
          <select value={form.productId} onChange={(event) => setField('productId', event.target.value)} required>
            <option value="">Select product</option>
            {products
              .filter((product) => product.active)
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Sale date
          <input type="date" value={form.saleDate} onChange={(event) => setField('saleDate', event.target.value)} required />
        </label>
        <label>
          Quantity
          <input type="number" min="1" step="1" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} />
        </label>
        <label>
          Unit price
          <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setField('unitPrice', event.target.value)} />
        </label>
        <label>
          Commission rate
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={form.commissionRate}
            onChange={(event) => setField('commissionRate', event.target.value)}
          />
        </label>
      </div>
      <label>
        Customer name override
        <input value={form.customerName} onChange={(event) => setField('customerName', event.target.value)} />
      </label>
      <label>
        Notes
        <textarea rows="3" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
      </label>
      <div className="sale-preview">
        <span>{selectedProduct ? `${selectedProduct.sku} stock: ${selectedProduct.stockOnHand}` : 'Select a product'}</span>
        <strong>{money.format(projectedTotal)} sale / {money.format(projectedCommission)} commission</strong>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={saving}>
          <Save size={17} />
          {saving ? 'Saving' : 'Record sale'}
        </button>
      </div>
    </form>
  );
}

function DownlineTab({ members, selectedId, setSelectedId, loadMembers }) {
  const [query, setQuery] = useState('');
  const { roots, childrenBySponsor } = useMemo(() => buildTree(members), [members]);
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const selectedMember = selectedId ? membersById.get(selectedId) : null;
  const selectedSponsor = selectedMember?.sponsorId ? membersById.get(selectedMember.sponsorId) : null;
  const selectedChildren = selectedMember ? childrenBySponsor.get(selectedMember.id) || [] : [];

  const filteredMembers = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return members;
    return members.filter((member) =>
      [fullName(member), member.email, member.phone, member.city, member.state, member.status, member.rank]
        .join(' ')
        .toLowerCase()
        .includes(text)
    );
  }, [members, query]);

  function handleSaved(member) {
    loadMembers(member.id);
  }

  return (
    <section className="workspace">
      <div className="panel hierarchy-panel">
        <div className="panel-head">
          <div className="section-title">
            <Network size={18} />
            <h2>Hierarchy</h2>
          </div>
          <div className="searchbox">
            <Search size={16} />
            <input placeholder="Search members" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        {query ? (
          <div className="search-results">
            {filteredMembers.map((member) => (
              <button key={member.id} className="result-row" onClick={() => setSelectedId(member.id)}>
                <span>{fullName(member)}</span>
                <small>{member.rank || member.status}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="tree">
            {roots.map((member) => (
              <TreeNode key={member.id} member={member} childrenBySponsor={childrenBySponsor} selectedId={selectedId} onSelect={setSelectedId} />
            ))}
          </div>
        )}
      </div>

      <aside className="panel detail-panel">
        {selectedMember ? (
          <>
            <div className="member-card">
              <div>
                <span className={`status ${selectedMember.status.toLowerCase()}`}>{selectedMember.status}</span>
                <h2>{fullName(selectedMember)}</h2>
                <p>{selectedMember.rank || 'No rank assigned'}</p>
              </div>
              <div className="mini-stats">
                <span>{selectedChildren.length} direct</span>
                <span>{descendantCount(selectedMember.id, childrenBySponsor)} total</span>
              </div>
            </div>
            <div className="contact-grid">
              <a href={`mailto:${selectedMember.email}`}>
                <Mail size={16} />
                {selectedMember.email || 'No email'}
              </a>
              <a href={`tel:${selectedMember.phone}`}>
                <Phone size={16} />
                {selectedMember.phone || 'No phone'}
              </a>
            </div>
            <dl className="facts">
              <div>
                <dt>Sponsor</dt>
                <dd>{selectedSponsor ? fullName(selectedSponsor) : 'Top level'}</dd>
              </div>
              <div>
                <dt>Referral</dt>
                <dd>{selectedMember.referralSource || 'Not recorded'}</dd>
              </div>
              <div>
                <dt>Personal volume</dt>
                <dd>{money.format(selectedMember.personalVolume)}</dd>
              </div>
              <div>
                <dt>Group volume</dt>
                <dd>{money.format(selectedMember.groupVolume)}</dd>
              </div>
            </dl>
            <div className="downline-list">
              <h3>Direct downline</h3>
              {selectedChildren.length ? (
                selectedChildren.map((member) => (
                  <button key={member.id} onClick={() => setSelectedId(member.id)}>
                    <span>{fullName(member)}</span>
                    <small>{money.format(member.groupVolume)}</small>
                  </button>
                ))
              ) : (
                <p>No direct downline yet.</p>
              )}
            </div>
          </>
        ) : (
          <div className="empty-detail">Select a member to view profile details.</div>
        )}
      </aside>

      <div className="panel form-panel">
        <MemberForm members={members} selectedMember={selectedMember} onSaved={handleSaved} onCancel={() => setSelectedId(null)} />
      </div>
    </section>
  );
}

function InventoryTab({ products, selectedProductId, setSelectedProductId, loadInventory }) {
  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;

  return (
    <section className="inventory-grid">
      <div className="panel inventory-table-panel">
        <div className="panel-head">
          <div className="section-title">
            <Package size={18} />
            <h2>Product Inventory</h2>
          </div>
          <button className="primary" onClick={() => setSelectedProductId(null)}>
            <Plus size={17} />
            Add product
          </button>
        </div>
        <div className="data-table">
          <div className="table-row table-head">
            <span>Product</span>
            <span>Price</span>
            <span>Commission</span>
            <span>Stock</span>
          </div>
          {products.map((product) => (
            <button
              key={product.id}
              className={`table-row ${selectedProductId === product.id ? 'selected' : ''}`}
              onClick={() => setSelectedProductId(product.id)}
            >
              <span>
                <strong>{product.name}</strong>
                <small>{product.sku} · {product.category || 'Uncategorized'}</small>
              </span>
              <span>{money.format(product.unitPrice)}</span>
              <span>{percent(product.commissionRate)}</span>
              <span className={product.stockOnHand <= product.reorderLevel ? 'low-stock' : ''}>{product.stockOnHand}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="panel form-panel">
        <ProductForm selectedProduct={selectedProduct} onSaved={(product) => { setSelectedProductId(product.id); loadInventory(); }} onCancel={() => setSelectedProductId(null)} />
      </div>
    </section>
  );
}

function SalesLedger({ members, products, customers, sales, loadCommerce }) {
  return (
    <section className="inventory-grid">
      <div className="panel inventory-table-panel">
        <div className="section-title">
          <ClipboardList size={18} />
          <h2>Sales Ledger</h2>
        </div>
        <div className="data-table spaced-table">
          <div className="table-row sale-row table-head">
            <span>Date</span>
            <span>Member</span>
            <span>Customer / Product</span>
            <span>Total</span>
            <span>Commission</span>
          </div>
          {sales.map((sale) => (
            <div key={sale.id} className="table-row sale-row">
              <span>{sale.saleDate}</span>
              <span>{sale.memberName}</span>
              <span>
                <strong>{sale.customerName || 'Unassigned customer'}</strong>
                <small>{sale.productName} · {sale.quantity} × {money.format(sale.unitPrice)}</small>
              </span>
              <span>{money.format(sale.lineTotal)}</span>
              <span>{money.format(sale.commission)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel form-panel">
        <SaleForm members={members} products={products} customers={customers} onSaved={loadCommerce} />
      </div>
    </section>
  );
}

function CustomersScreen({ members, customers, selectedCustomerId, setSelectedCustomerId, loadCommerce, onOpenReport }) {
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;

  return (
    <section className="inventory-grid">
      <div className="panel inventory-table-panel">
        <div className="panel-head">
          <div className="section-title">
            <UsersRound size={18} />
            <h2>Customer Management</h2>
          </div>
          <button className="primary" onClick={() => setSelectedCustomerId(null)}>
            <Plus size={17} />
            Add customer
          </button>
        </div>
        <div className="data-table">
          <div className="table-row customer-row table-head">
            <span>Customer</span>
            <span>Member</span>
            <span>Follow-up</span>
            <span>Sales</span>
          </div>
          {customers.map((customer) => (
            <button
              key={customer.id}
              className={`table-row customer-row ${selectedCustomerId === customer.id ? 'selected' : ''}`}
              onClick={() => setSelectedCustomerId(customer.id)}
            >
              <span>
                <strong>{customerName(customer)}</strong>
                <small>{customer.status} · {customer.email || customer.phone || 'No contact info'}</small>
              </span>
              <span>{customer.memberName}</span>
              <span>{customer.nextFollowUpDate || 'Not set'}</span>
              <span>{money.format(customer.salesVolume)}</span>
            </button>
          ))}
        </div>
        {selectedCustomer ? (
          <div className="form-actions customer-actions">
            <button type="button" className="primary" onClick={() => onOpenReport(selectedCustomer.id)}>
              <BarChart3 size={17} />
              Customer report
            </button>
          </div>
        ) : null}
      </div>
      <div className="panel form-panel">
        <CustomerForm
          members={members}
          selectedCustomer={selectedCustomer}
          onSaved={(customer) => {
            setSelectedCustomerId(customer.id);
            loadCommerce();
          }}
          onCancel={() => setSelectedCustomerId(null)}
        />
      </div>
    </section>
  );
}

function CustomerReport({ report, onBack }) {
  if (!report) {
    return (
      <section className="panel full-panel">
        <button type="button" className="primary" onClick={onBack}>
          <ChevronRight size={17} />
          Customers
        </button>
      </section>
    );
  }

  return (
    <section className="report-grid">
      <div className="panel">
        <div className="panel-head">
          <div className="section-title">
            <BarChart3 size={18} />
            <h2>{customerName(report.customer)} Report</h2>
          </div>
          <button type="button" onClick={onBack}>
            Customers
          </button>
        </div>
        <dl className="facts">
          <div>
            <dt>Managed by</dt>
            <dd>{report.customer.memberName}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{report.customer.status}</dd>
          </div>
          <div>
            <dt>Lifetime sales</dt>
            <dd>{money.format(report.customer.salesVolume)}</dd>
          </div>
          <div>
            <dt>Orders</dt>
            <dd>{report.customer.orderCount}</dd>
          </div>
          <div>
            <dt>Next follow-up</dt>
            <dd>{report.customer.nextFollowUpDate || 'Not set'}</dd>
          </div>
        </dl>
      </div>
      <div className="panel">
        <div className="section-title">
          <Package size={18} />
          <h2>Product Breakdown</h2>
        </div>
        <div className="data-table spaced-table">
          <div className="table-row commission-row table-head">
            <span>Product</span>
            <span>Units</span>
            <span>Sales</span>
          </div>
          {report.productBreakdown.map((row) => (
            <div key={row.product_id} className="table-row commission-row">
              <span>
                <strong>{row.product_name}</strong>
                <small>{row.sku}</small>
              </span>
              <span>{row.units}</span>
              <span>{money.format(row.sales_volume)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel full-span">
        <div className="section-title">
          <ClipboardList size={18} />
          <h2>Customer Sales</h2>
        </div>
        <div className="data-table spaced-table">
          <div className="table-row sale-row table-head">
            <span>Date</span>
            <span>Member</span>
            <span>Product</span>
            <span>Total</span>
            <span>Commission</span>
          </div>
          {report.sales.map((sale) => (
            <div key={sale.id} className="table-row sale-row">
              <span>{sale.saleDate}</span>
              <span>{sale.memberName}</span>
              <span>
                <strong>{sale.productName}</strong>
                <small>{sale.quantity} × {money.format(sale.unitPrice)}</small>
              </span>
              <span>{money.format(sale.lineTotal)}</span>
              <span>{money.format(sale.commission)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomerSummaryScreen({ customerSummary }) {
  return (
    <section className="panel full-panel">
      <div className="section-title">
        <UsersRound size={18} />
        <h2>Customer Sub Report</h2>
      </div>
      <div className="data-table spaced-table">
        <div className="table-row commission-row table-head">
          <span>Member</span>
          <span>Customers</span>
          <span>Customer sales</span>
        </div>
        {customerSummary.byMember.map((row) => (
          <div key={row.member_id} className="table-row commission-row">
            <span>{row.member_name}</span>
            <span>{row.customer_count}</span>
            <span>{money.format(row.sales_volume)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SalesTab({
  members,
  products,
  customers,
  sales,
  customerSummary,
  customerReport,
  selectedCustomerId,
  setSelectedCustomerId,
  loadCommerce,
  loadCustomerReport
}) {
  const [screen, setScreen] = useState('ledger');

  async function openReport(customerId) {
    await loadCustomerReport(customerId);
    setScreen('report');
  }

  return (
    <>
      <nav className="subtabs" aria-label="Sales sections">
        <button className={screen === 'ledger' ? 'active' : ''} onClick={() => setScreen('ledger')}>
          <ShoppingCart size={16} />
          Ledger
        </button>
        <button className={screen === 'customers' ? 'active' : ''} onClick={() => setScreen('customers')}>
          <UsersRound size={16} />
          Customers
        </button>
        <button className={screen === 'summary' ? 'active' : ''} onClick={() => setScreen('summary')}>
          <BarChart3 size={16} />
          Customer reports
        </button>
      </nav>
      {screen === 'ledger' ? <SalesLedger members={members} products={products} customers={customers} sales={sales} loadCommerce={loadCommerce} /> : null}
      {screen === 'customers' ? (
        <CustomersScreen
          members={members}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          loadCommerce={loadCommerce}
          onOpenReport={openReport}
        />
      ) : null}
      {screen === 'report' ? <CustomerReport report={customerReport} onBack={() => setScreen('customers')} /> : null}
      {screen === 'summary' ? <CustomerSummaryScreen customerSummary={customerSummary} /> : null}
    </>
  );
}

function CommissionsTab({ inventorySummary }) {
  return (
    <section className="panel full-panel">
      <div className="section-title">
        <BarChart3 size={18} />
        <h2>Commission Summary</h2>
      </div>
      <div className="data-table spaced-table">
        <div className="table-row commission-row table-head">
          <span>Member</span>
          <span>Sales volume</span>
          <span>Commission</span>
        </div>
        {inventorySummary.memberCommissions.map((row) => (
          <div key={row.member_id} className="table-row commission-row">
            <span>{row.member_name}</span>
            <span>{money.format(row.sales_volume)}</span>
            <span>{money.format(row.commissions)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({ summary: {}, memberCommissions: [] });
  const [customerSummary, setCustomerSummary] = useState({ summary: {}, byMember: [] });
  const [customerReport, setCustomerReport] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [activeTab, setActiveTab] = useState('downline');
  const [loading, setLoading] = useState(true);

  async function loadMembers(nextSelectedId) {
    const response = await fetch('/api/members');
    const payload = await response.json();
    setMembers(payload.members);
    setSelectedId(nextSelectedId ?? selectedId ?? payload.members[0]?.id ?? null);
  }

  async function loadCommerce() {
    const [productsResponse, customersResponse, salesResponse, summaryResponse, customerSummaryResponse] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/customers'),
      fetch('/api/sales'),
      fetch('/api/inventory-summary'),
      fetch('/api/customer-summary')
    ]);
    const [productsPayload, customersPayload, salesPayload, summaryPayload, customerSummaryPayload] = await Promise.all([
      productsResponse.json(),
      customersResponse.json(),
      salesResponse.json(),
      summaryResponse.json(),
      customerSummaryResponse.json()
    ]);
    setProducts(productsPayload.products);
    setCustomers(customersPayload.customers);
    setSales(salesPayload.sales);
    setInventorySummary(summaryPayload);
    setCustomerSummary(customerSummaryPayload);
  }

  async function loadCustomerReport(customerId) {
    const response = await fetch(`/api/customers/${customerId}/report`);
    const payload = await response.json();
    setCustomerReport(payload);
  }

  useEffect(() => {
    Promise.all([loadMembers(), loadCommerce()]).finally(() => setLoading(false));
  }, []);

  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const activeCount = members.filter((member) => member.status === 'Active').length;
  const totalGroupVolume = members.reduce((total, member) => total + Number(member.groupVolume || 0), 0);
  const maxDepth = members.reduce((max, member) => Math.max(max, memberDepth(member, membersById)), 0);
  const summary = inventorySummary.summary || {};
  const customerStats = customerSummary.summary || {};

  if (loading) return <div className="loading">Loading downline manager...</div>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SQLite relationship tracker</p>
          <h1>Downline Manager</h1>
        </div>
        <div className="top-actions">
          <button className="primary" onClick={() => { setActiveTab('downline'); setSelectedId(null); }}>
            <Plus size={18} />
            Add member
          </button>
          <button className="primary" onClick={() => { setActiveTab('inventory'); setSelectedProductId(null); }}>
            <Package size={18} />
            Add product
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Main sections">
        <button className={activeTab === 'downline' ? 'active' : ''} onClick={() => setActiveTab('downline')}>
          <Network size={17} />
          Downline
        </button>
        <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>
          <Package size={17} />
          Inventory
        </button>
        <button className={activeTab === 'sales' ? 'active' : ''} onClick={() => setActiveTab('sales')}>
          <ShoppingCart size={17} />
          Sales
        </button>
        <button className={activeTab === 'commissions' ? 'active' : ''} onClick={() => setActiveTab('commissions')}>
          <BarChart3 size={17} />
          Commissions
        </button>
      </nav>

      <section className="stats-grid">
        <Stat icon={UsersRound} label="Members" value={members.length} />
        <Stat icon={Activity} label="Active" value={activeCount} />
        <Stat icon={Network} label="Levels" value={maxDepth + 1} />
        <Stat icon={CircleDollarSign} label="Group volume" value={money.format(totalGroupVolume)} />
        <Stat icon={Package} label="Products" value={summary.productCount || 0} />
        <Stat icon={UsersRound} label="Customers" value={customerStats.customerCount || 0} />
        <Stat icon={ClipboardList} label="Inventory value" value={money.format(summary.inventoryValue || 0)} />
        <Stat icon={ShoppingCart} label="Sales volume" value={money.format(summary.salesVolume || 0)} />
        <Stat icon={BarChart3} label="Commissions" value={money.format(summary.commissions || 0)} />
      </section>

      {activeTab === 'downline' ? (
        <DownlineTab members={members} selectedId={selectedId} setSelectedId={setSelectedId} loadMembers={loadMembers} />
      ) : null}
      {activeTab === 'inventory' ? (
        <InventoryTab products={products} selectedProductId={selectedProductId} setSelectedProductId={setSelectedProductId} loadInventory={loadCommerce} />
      ) : null}
      {activeTab === 'sales' ? (
        <SalesTab
          members={members}
          products={products}
          customers={customers}
          sales={sales}
          customerSummary={customerSummary}
          customerReport={customerReport}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          loadCommerce={loadCommerce}
          loadCustomerReport={loadCustomerReport}
        />
      ) : null}
      {activeTab === 'commissions' ? <CommissionsTab inventorySummary={inventorySummary} /> : null}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
