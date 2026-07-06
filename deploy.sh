#!/bin/bash

# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting Production Deployment Pipeline..."

# 1. Load database credentials from your local environment configuration (.env)
if [ -f .env ]; then
  echo "📝 Loading environment configurations from .env file..."
  export $(echo $(grep -v '^#' .env | xargs) | envsubst)
fi

# 2. Fetch latest changes from your repository
echo "📥 Pulling latest codebase from main branch..."
git pull origin main

# 3. Install pristine production dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# 4. AUTOMATIC DATABASE BACKUP (Task 2)
echo "💾 Initiating automatic pre-migration database snapshot..."

# Ensure a dedicated backups directory exists
mkdir -p ./backups

# Create a clean, timestamped filename (YYYY-MM-DD_HH-MM-SS)
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="./backups/pre_migration_${TIMESTAMP}.sql"

# Run pg_dump using your environment variables
# Note: set -e ensures that if pg_dump fails, the script aborts IMMEDIATELY here.
export PGPASSWORD=$DB_PASSWORD
pg_dump -h "${DB_HOST:-localhost}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USERNAME:-postgres}" \
        -d "${DB_DATABASE:-postgres}" \
        -F p -v -f "$BACKUP_FILE"

echo "✅ Backup successfully created and verified: $BACKUP_FILE"

# 5. Build the NestJS application
echo "🛠️ Compiling NestJS TypeScript files..."
npm run build

# 6. Execute the automated migration pipeline
echo "🗄️ Running database migrations..."
npm run deploy:prod

echo "🎉 Deployment successfully verified and live!"