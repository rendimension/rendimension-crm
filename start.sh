#!/bin/sh
# Initialize DB only if it doesn't exist (first deploy)
if [ ! -f /app/data/crm.db ]; then
  echo "First deploy: initializing database..."
  npx tsx scripts/init.ts
fi
exec npm start
