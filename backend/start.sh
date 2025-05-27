#!/bin/bash
set -e
alembic upgrade head

export PGPASSWORD='postgres'  # Only if needed

#echo "=== Available tables in DB ==="
#psql -h db -U postgres -d probeops -c "\dt"

# python seed_user.py  # Optional

exec uvicorn main:app --host 0.0.0.0 --port 8000
