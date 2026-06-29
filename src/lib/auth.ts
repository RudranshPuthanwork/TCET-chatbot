import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Validates the administrative password from request headers in a timing-safe manner.
 * Defaults to 'tcetadmin123' if the ADMIN_PASSWORD environment variable is not defined.
 */
export function verifyAdminPassword(req: Request | NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'tcetadmin123';
  const headerPassword = req.headers.get('x-admin-password') || '';

  // Hash both values first with SHA-256 to ensure they have the same byte length
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest();
  const actualHash = crypto.createHash('sha256').update(headerPassword).digest();

  // Compare buffers securely to prevent timing attacks
  return crypto.timingSafeEqual(expectedHash, actualHash);
}
