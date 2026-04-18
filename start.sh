#!/bin/sh
# Initialize DB only if it doesn't exist (first deploy)
if [ ! -f /app/data/crm.db ]; then
  echo "First deploy: initializing database..."
  npx tsx scripts/init.ts
fi

# Run migrations to add any missing columns (safe - only adds if not exists)
echo "Running schema migrations..."
node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/crm.db');
const migrations = [
  \"ALTER TABLE contacts ADD COLUMN temperature TEXT NOT NULL DEFAULT 'cold'\",
  \"ALTER TABLE contacts ADD COLUMN last_contacted_at INTEGER\",
  \"ALTER TABLE contacts ADD COLUMN next_followup_at INTEGER\",
  \"ALTER TABLE contacts ADD COLUMN followup_notes TEXT\",
];
migrations.forEach(sql => {
  try { db.prepare(sql).run(); console.log('Applied:', sql.split(' ').slice(0,5).join(' ')); }
  catch(e) { if (!e.message.includes('duplicate column')) console.log('Skip:', e.message.split(':')[0]); }
});
db.close();
console.log('Migrations done.');
"

exec npm start
