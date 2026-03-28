# Grind App - Development Setup

## Quick Start

### Option 1: Automatic Setup (Recommended)
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Option 2: Manual Setup
1. **Start the API server:**
   ```bash
   npx vercel dev --listen 3000
   ```

2. **In a new terminal, start Expo:**
   ```bash
   npx expo start
   ```

## Environment Configuration

The app will automatically detect your API URL. For manual configuration, edit `.env`:

```env
# For local development
EXPO_PUBLIC_API_URL=http://localhost:3000

# For physical device on same network
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000

# For Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

## Testing the Connection

1. **Check API Health:**
   Visit http://localhost:3000/health in your browser
   
   You should see JSON with procedures like:
   ```json
   {
     "trpcEndpoint": "/trpc",
     "procedures": ["goals.createUltimate", "goals.updateUltimate", "health.ping"],
     "supabaseUrlPresent": true
   }
   ```

2. **Test in App:**
   - Open the app via QR code or simulator
   - Go to "Create your Ultimate Goal"
   - Enter a goal and save
   - Tasks should appear immediately on Home and Calendar

## Troubleshooting

### "Network request failed" errors:
1. Make sure the API server is running on port 3000
2. Check that http://localhost:3000/health returns JSON
3. For physical devices, use your computer's IP address instead of localhost
4. The app will show a connectivity banner if it can't reach the API

### No tasks appear after creating a goal:
1. Check the API logs for "BATCH PLAN SEEDED" messages
2. Verify the database has the required tables and columns
3. Check that the Supabase credentials are correct

### Database Issues:
The app uses Supabase with the following credentials:
- URL: https://ovvihfhkhqigzahlttyf.supabase.co
- Anon Key: (configured in .env)
- Service Role Key: (configured in .env)

## Features

- ✅ Automatic API URL detection
- ✅ Batch task planning on goal creation
- ✅ Real-time connectivity monitoring
- ✅ Cross-platform support (iOS, Android, Web)
- ✅ Automatic task seeding (no "Generate Tasks" button needed)

## Architecture

- **Frontend:** React Native with Expo
- **Backend:** Hono.js with tRPC (serverless on Vercel)
- **Database:** Supabase (PostgreSQL)
- **AI Planning:** External AI service for task generation