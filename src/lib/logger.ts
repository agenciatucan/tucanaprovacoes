// Logs only go to the server terminal (these are all server-side actions).
// In production, we suppress info/debug to reduce noise; errors always surface.
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  error(context: string, message: unknown): void {
    console.error(`[${context}]`, message);
  },
  warn(context: string, message: unknown): void {
    if (isDev) console.warn(`[${context}]`, message);
  },
  info(context: string, message: unknown): void {
    if (isDev) console.log(`[${context}]`, message);
  },
};
