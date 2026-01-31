#!/bin/bash

# Load NVM
source ~/.nvm/nvm.sh

# Start server in background
npm run dev > /tmp/server.log 2>&1 &
SERVER_PID=$!

echo "Server starting (PID: $SERVER_PID)..."
sleep 8

echo -e "\n🧪 Testing /opportunities?mode=live&limit=2 endpoint:\n"
curl -s "http://localhost:4000/opportunities?mode=live&limit=2" | head -100

echo -e "\n\n✅ Test complete"

# Stop server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
