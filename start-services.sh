#!/bin/bash
# Start script for UMPI dev server + chat service
# Kills existing processes and starts fresh

pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "bun.*dev" 2>/dev/null
pkill -f "chat-service" 2>/dev/null
sleep 2

cd /home/z/my-project

# Start dev server with setsid to create new session (immune to SIGHUP)
setsid nohup bun run dev > /home/z/my-project/dev.log 2>&1 &
DEV_PID=$!
echo "Dev server PID: $DEV_PID"

# Start chat service
cd /home/z/my-project/mini-services/chat-service
setsid nohup bun run dev > /home/z/my-project/chat-service.log 2>&1 &
CHAT_PID=$!
echo "Chat service PID: $CHAT_PID"

cd /home/z/my-project

# Wait for dev server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "✓ Dev server ready after ${i}s"
    break
  fi
  sleep 1
done

# Wait for chat service
for i in $(seq 1 10); do
  if curl -s -o /dev/null http://localhost:3003/health 2>/dev/null; then
    echo "✓ Chat service ready after ${i}s"
    break
  fi
  sleep 1
done

# Save PIDs
echo "$DEV_PID" > /home/z/my-project/.dev-pid
echo "$CHAT_PID" > /home/z/my-project/.chat-pid

echo "Both services running."
