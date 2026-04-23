import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ChevronRight,
  CircleDollarSign,
  Mail,
  Network,
  Phone,
  Plus,
  Save,
  Search,
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

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function fullName(member) {
  return `${member.firstName} ${member.lastName}`.trim();
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
          <input
            type="number"
            min="0"
            step="1"
            value={form.personalVolume}
            onChange={(event) => setField('personalVolume', event.target.value)}
          />
        </label>
        <label>
          Group volume
          <input
            type="number"
            min="0"
            step="1"
            value={form.groupVolume}
            onChange={(event) => setField('groupVolume', event.target.value)}
          />
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

function App() {
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadMembers(nextSelectedId) {
    const response = await fetch('/api/members');
    const payload = await response.json();
    setMembers(payload.members);
    setSelectedId(nextSelectedId ?? selectedId ?? payload.members[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

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

  const activeCount = members.filter((member) => member.status === 'Active').length;
  const totalGroupVolume = members.reduce((total, member) => total + Number(member.groupVolume || 0), 0);
  const maxDepth = members.reduce((max, member) => Math.max(max, memberDepth(member, membersById)), 0);

  function handleSaved(member) {
    loadMembers(member.id);
  }

  if (loading) return <div className="loading">Loading downline manager...</div>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SQLite relationship tracker</p>
          <h1>Downline Manager</h1>
        </div>
        <button className="primary" onClick={() => setSelectedId(null)}>
          <Plus size={18} />
          Add member
        </button>
      </header>

      <section className="stats-grid">
        <Stat icon={UsersRound} label="Total members" value={members.length} />
        <Stat icon={Activity} label="Active" value={activeCount} />
        <Stat icon={Network} label="Levels" value={maxDepth + 1} />
        <Stat icon={CircleDollarSign} label="Group volume" value={money.format(totalGroupVolume)} />
      </section>

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
                <TreeNode
                  key={member.id}
                  member={member}
                  childrenBySponsor={childrenBySponsor}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
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
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
