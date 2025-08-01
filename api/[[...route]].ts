import { handle } from 'hono/vercel';
import app from '../backend/hono';

console.log('API route loaded');

// Handle all HTTP methods
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);

// Default export for compatibility
export default handle(app);