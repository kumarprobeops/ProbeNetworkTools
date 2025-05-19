#!/bin/bash
# Auto-run setup for Codespaces

# Install backend dependencies
cd backend || exit
pip install -r requirements.txt

# Setup frontend (non-containerized)
cd ../frontend || exit
npm install

# Print instructions
cat <<EOF
✅ Setup complete!
To run the backend:
  docker-compose up backend
To run the frontend:
  cd frontend && npm run dev
EOF
