#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if required variables are set
if [ -z "$SUPABASE_URL" ]; then
  echo "Error: SUPABASE_URL not found in environment"
  exit 1
fi

# Extract database connection details from SUPABASE_URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | cut -d'.' -f1)
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "Running migration: create_motions_table.sql"
echo "Database: ${DB_HOST}"
echo ""
echo "Please run the following SQL in Supabase Dashboard SQL Editor:"
echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo ""
cat migrations/create_motions_table.sql
