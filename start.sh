#!/bin/bash

echo "Starting RAG + SQL Agent System..."

# Kill any existing processes
pkill -f "python.*main" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null

sleep 2

# Start backend
echo "Starting backend on port 8000..."
cd api
python3 main.py &
BACKEND_PID=$!

sleep 5

# Start frontend
echo "Starting frontend on port 3000..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "RAG + SQL Agent System started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "To stop both servers, run: kill $BACKEND_PID $FRONTEND_PID"
echo "Or press Ctrl+C to stop both"

# Wait for both processes
wait