# Start Development Server

To fix the tRPC connection issues, you need to start both the API server and Expo development server.

## Quick Start

Run this command in your terminal:

```bash
./start-dev.sh
```

This will start:
1. **API Server** on `http://localhost:3000` (using Vercel dev)
2. **Expo Development Server** (with QR code for mobile)

## Manual Start (Alternative)

If the script doesn't work, start them separately:

### Terminal 1 - API Server
```bash
vercel dev --listen 3000
```

### Terminal 2 - Expo Server  
```bash
npx expo start
```

## Verify Connection

1. **Check API Health**: Visit `http://localhost:3000/health` in your browser
   - Should show JSON with `procedures: ["goals.createUltimate", "goals.updateUltimate", "health.ping"]`

2. **Check tRPC**: Visit `http://localhost:3000/api/trpc/health.ping`
   - Should return `"ok"`

3. **In the app**: The "API Debug" button on the home screen will show connection status

## Troubleshooting

- **"Network request failed"**: API server isn't running on port 3000
- **"Got HTML from tRPC endpoint"**: Wrong URL or server not responding with JSON
- **"All tRPC endpoints failed"**: Check that both servers are running

The app will automatically detect your local development server when both are running.