import { NextRequest } from 'next/server';

/**
 * Validates the administrative password from request headers.
 * Defaults to 'tcetadmin123' if the ADMIN_PASSWORD environment variable is not defined.
 */
export function verifyAdminPassword(req: Request | NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'tcetadmin123';
  const headerPassword = req.headers.get('x-admin-password');
  return headerPassword === adminPassword;
}
