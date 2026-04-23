import express from 'express';
import { db, mapMember } from './db.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

const memberFields = `
  id, first_name, last_name, email, phone, city, state, status, rank, join_date,
  sponsor_id, referral_source, personal_volume, group_volume, notes, created_at, updated_at
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: 'sqlite' });
});

app.listen(port, () => {
  console.log(`Downline Manager API listening on http://localhost:${port}`);
});
