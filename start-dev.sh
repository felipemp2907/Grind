#!/bin/bash

echo "🚀 Starting Grind App Development Environment"
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📡 Starting API server on http://localhost:3000..."
vercel dev --listen 3000 &
API_PID=$!

# Wait a moment for the API to start
sleep 3

echo "📱 Starting Expo development server..."
npx expo start &
EXPO_PID=$!

echo ""
echo "✅ Development servers started!"
echo "📡 API: http://localhost:3000"
echo "📱 Expo: Check terminal for QR code"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $API_PID 2>/dev/null
    kill $EXPO_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait