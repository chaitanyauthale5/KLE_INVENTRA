
const STORAGE_KEY = 'ayursutra_local_db_v1';

function readDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { collections: {}, meta: { lastId: 0 } };
    return JSON.parse(raw);
  } catch (e) {
    // Fallback to in-memory if localStorage is not available
    if (!window.__AYURSUTRA_DB__) {
      window.__AYURSUTRA_DB__ = { collections: {}, meta: { lastId: 0 } };
    }
    return window.__AYURSUTRA_DB__;
  }
}

function writeDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    window.__AYURSUTRA_DB__ = db; // in-memory fallback
  }
}

function ensureCollection(name) {
  const db = readDB();
  if (!db.collections[name]) db.collections[name] = [];
  writeDB(db);
}

function generateId() {
  const db = readDB();
  db.meta.lastId = (db.meta.lastId || 0) + 1;
  writeDB(db);
  return String(db.meta.lastId);
}

function nowIso() {
  return new Date().toISOString();
}

export const localDB = {
  list(collection) {
    ensureCollection(collection);
    const db = readDB();
    return [...db.collections[collection]];
  },
  get(collection, id) {
    ensureCollection(collection);
    const db = readDB();
    return db.collections[collection].find((i) => i.id === id) || null;
  },
  create(collection, data) {
    ensureCollection(collection);
    const db = readDB();
    const item = {
      id: data.id || generateId(),
      created_date: data.created_date || nowIso(),
      updated_date: nowIso(),
      ...data,
    };
    db.collections[collection].push(item);
    writeDB(db);
    return item;
  },
  update(collection, id, data) {
    ensureCollection(collection);
    const db = readDB();
    const idx = db.collections[collection].findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated = { ...db.collections[collection][idx], ...data, updated_date: nowIso() };
    db.collections[collection][idx] = updated;
    writeDB(db);
    return updated;
  },
  delete(collection, id) {
    ensureCollection(collection);
    const db = readDB();
    db.collections[collection] = db.collections[collection].filter((i) => i.id !== id);
    writeDB(db);
    return true;
  },
  filter(collection, predicate) {
    ensureCollection(collection);
    const db = readDB();
    return db.collections[collection].filter(predicate);
  },
  upsert(collection, data, key = 'id') {
    ensureCollection(collection);
    const db = readDB();
    const idx = db.collections[collection].findIndex((i) => i[key] === data[key]);
    if (idx === -1) {
      return this.create(collection, data);
    }
    const updated = { ...db.collections[collection][idx], ...data, updated_date: nowIso() };
    db.collections[collection][idx] = updated;
    writeDB(db);
    return updated;
  }
};

// Simple seed to ensure app has a default user and some demo data on first run
function seedIfEmpty() {
  const users = localDB.list('users');
  if (users.length === 0) {
    const admin = localDB.create('users', {
      full_name: 'Local Super Admin',
      email: 'admin@local.dev',
      role: 'super_admin',
      has_selected_role: true
    });
    // Create a sample hospital
    const hospital = localDB.create('hospitals', {
      name: 'AyurSutra Wellness Center',
      address: 'Localhost Lane',
    });
    // Create few sample patients
    for (let i = 1; i <= 6; i++) {
      localDB.create('patients', {
        full_name: `Patient ${i}`,
        age: 20 + i,
        patient_id: `P-${1000 + i}`,
        hospital_id: hospital.id,
        status: ['active','recovering','critical','inactive'][i % 4],
        current_conditions: ['Vata imbalance','Digestive issues','Stress'].slice(0, (i % 3) + 1),
        assigned_doctor: 'Dr. Local Vaidya',
        phone: `99999${1000 + i}`,
        progress_score: Math.min(95, 10 * i)
      });
    }
    // Set current session user id
    try { localStorage.setItem('ayursutra_current_user_id', admin.id); } catch {}
  }
}

seedIfEmpty();

