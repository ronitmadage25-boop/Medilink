import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';
import { logger } from './logger';

/**
 * Ensures that a required User record exists in the database before creating
 * child records (Appointments, Prescriptions, DiagnosticReports, Notifications).
 * If the ID doesn't exist, it either maps to an existing matching user or creates
 * a placeholder with that ID so foreign key constraints in PostgreSQL never fail.
 */
export async function ensureUserExists(
  id: string,
  role: UserRole,
  name?: string,
  email?: string
): Promise<string> {
  if (!id) return id;

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (existing) return existing.id;

    // Check if a demo user with matching role or email exists
    const candidateEmail = email || `${id.toLowerCase().replace(/[^a-z0-9]/g, '')}@medilink.health`;
    const byEmail = await prisma.user.findUnique({ where: { email: candidateEmail } });
    if (byEmail) return byEmail.id;

    // Create record with the exact requested ID so relations succeed
    const created = await prisma.user.create({
      data: {
        id,
        email: candidateEmail,
        name: name || (role === 'DOCTOR' ? 'Dr. Healthcare Specialist' : role === 'DIAGNOSTIC_CENTRE' ? 'MediLink Diagnostic Lab' : 'Patient Member'),
        password: '$2a$10$wT8fH2p0wL8u8L5y0u8L5uW6y9Xz5X4h9Z6w3Y7b4V1q0m8n9o0p1', // Dummy hash
        role,
        isActive: true,
        isVerified: true,
      },
    });
    logger.info(`Auto-provisioned referenced healthcare record for relational integrity: ${id} (${role})`);
    return created.id;
  } catch (err) {
    logger.warn(`Could not ensure user ${id} in DB:`, err);
    return id;
  }
}
