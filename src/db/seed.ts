import { db } from './schema';
import * as bcrypt from 'bcryptjs';
import { defaultTermsTemplate } from '../pdf/templates/defaultTerms';
import { defaultCoverLetterTemplate } from '../pdf/templates/coverLetter';

// Import data files
import commissionTiersData from '../data/commissionTiers.json';
import residualTablesData from '../data/residualTables.json';

// New Phase: Price List data files
import priceListSeriesData from '../data/priceListSeries.json';
import containerMappingsData from '../data/containerMappings.json';
import telematicsPackagesData from '../data/telematicsPackages.json';

/**
 * Check if the database has been fully seeded by verifying
 * that all critical tables contain data.
 */
async function isDatabaseFullySeeded(): Promise<boolean> {
  try {
    const [
      residualCount,
      userCount,
      settingsCount,
      priceListCount,
      telematicsCount,
      containerMapCount,
    ] = await Promise.all([
      db.residualCurves.count(),
      db.users.count(),
      db.settings.count(),
      db.priceListSeries.count(),
      db.telematicsPackages.count(),
      db.containerMappings.count(),
    ]);

    return (
      residualCount > 0 &&
      userCount > 0 &&
      settingsCount > 0 &&
      priceListCount > 0 &&
      telematicsCount > 0 &&
      containerMapCount > 0
    );
  } catch {
    // If we cannot read counts, assume not seeded so we attempt
    // an idempotent seed pass using bulkPut.
    return false;
  }
}

/**
 * Seed the database with initial data.
 *
 * This function is idempotent: it uses bulkPut() (upsert) instead of
 * bulkAdd() so that re-running it when records already exist does not
 * throw ConstraintError. It also checks every table individually so
 * a partially-seeded database is completed rather than skipped or
 * errored.
 */
export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    // Fast path: if everything is already populated, skip entirely.
    const fullySeeded = await isDatabaseFullySeeded();
    if (fullySeeded) {
      console.log('Database already seeded, skipping...');
      return;
    }

    console.log('Seeding database with initial data...');

    // Seed commission tiers
    const commissionCount = await db.commissionTiers.count();
    if (commissionCount === 0) {
      console.log('Seeding commission tiers...');
      const commissionTiers = commissionTiersData.map((tier) => ({
        minMargin: tier.minMargin,
        maxMargin: tier.maxMargin,
        commissionRate: tier.commissionPct,
      }));
      await db.commissionTiers.bulkPut(commissionTiers);
    } else {
      console.log(`Commission tiers already present (${commissionCount}), skipping...`);
    }

    // Seed residual curves (upsert by id primary key)
    const residualCount = await db.residualCurves.count();
    if (residualCount === 0) {
      console.log('Seeding residual curves...');
      const residualCurves = [
        {
          id: 'lead-acid',
          chemistry: 'lead-acid',
          term36: residualTablesData['lead-acid']['36'],
          term48: residualTablesData['lead-acid']['48'],
          term60: residualTablesData['lead-acid']['60'],
          term72: residualTablesData['lead-acid']['72'],
          term84: residualTablesData['lead-acid']['84'],
        },
        {
          id: 'lithium-ion',
          chemistry: 'lithium-ion',
          term36: residualTablesData['lithium-ion']['36'],
          term48: residualTablesData['lithium-ion']['48'],
          term60: residualTablesData['lithium-ion']['60'],
          term72: residualTablesData['lithium-ion']['72'],
          term84: residualTablesData['lithium-ion']['84'],
        },
      ];
      await db.residualCurves.bulkPut(residualCurves);
    } else {
      console.log(`Residual curves already present (${residualCount}), skipping...`);
    }

    // Create default admin user only if no users exist
    const userCount = await db.users.count();
    if (userCount === 0) {
      console.log('Creating default admin user...');
      const defaultPw = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD;
      let adminPassword: string;
      if (defaultPw && typeof defaultPw === 'string' && defaultPw.length >= 8) {
        adminPassword = defaultPw;
      } else {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        adminPassword = Array.from(array, b => chars[b % chars.length]).join('');
        console.warn('%c⚠ Generated random admin password (save this!):\n%c' + adminPassword,
          'color:orange;font-weight:bold', 'color:white;font-weight:bold;background:#333;padding:4px 8px');
      }
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.users.put({
        id: 'default-admin',
        username: 'admin',
        passwordHash,
        role: 'system_admin',
        fullName: 'System Administrator',
        email: 'admin@bisedge.com',
        isActive: true,
        createdAt: new Date().toISOString(),
        permissionOverrides: '{}',
      });
    } else {
      console.log(`Users already present (${userCount}), skipping admin creation...`);
    }

    // Create default templates only if none exist
    const templateCount = await db.templates.count();
    if (templateCount === 0) {
      console.log('Creating default templates...');
      const now = new Date().toISOString();
      await db.templates.bulkPut([
        {
          id: 'default-terms-and-conditions',
          type: 'terms-and-conditions',
          name: 'Standard Rental Agreement T&Cs',
          content: defaultTermsTemplate,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'default-cover-letter',
          type: 'cover-letter',
          name: 'Standard Cover Letter',
          content: defaultCoverLetterTemplate,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    } else {
      console.log(`Templates already present (${templateCount}), skipping...`);
    }

    // Set system initialized flag and default values only if settings are empty
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      console.log('Seeding default settings...');
      await db.settings.bulkPut([
        { key: 'system_initialized', value: new Date().toISOString() },
        { key: 'defaultROE', value: '20.60' },
        { key: 'defaultInterestRate', value: '9.5' },
        { key: 'defaultCPIRate', value: '5.5' },
        { key: 'defaultOperatingHours', value: '180' },
        { key: 'defaultLeaseTerm', value: '60' },
        { key: 'defaultTelematicsCost', value: '250' },
      ]);
    } else {
      console.log(`Settings already present (${settingsCount}), skipping...`);
    }

    // Seed Price List Series (new v3 tables)
    const priceListCount = await db.priceListSeries.count();
    if (priceListCount === 0) {
      console.log('Seeding price list series...');
      const storedSeries = (priceListSeriesData as any[]).map((s: any) => ({
        seriesCode: s.seriesCode,
        seriesName: s.seriesName,
        models: JSON.stringify(s.models),
        options: JSON.stringify(s.options),
      }));
      await db.priceListSeries.bulkPut(storedSeries);
      console.log(`  Seeded ${storedSeries.length} price list series`);
    } else {
      console.log(`Price list series already present (${priceListCount}), skipping...`);
    }

    // Seed Telematics Packages
    const telematicsCount = await db.telematicsPackages.count();
    if (telematicsCount === 0) {
      console.log('Seeding telematics packages...');
      await db.telematicsPackages.bulkPut(telematicsPackagesData as any);
      console.log(`  Seeded ${telematicsPackagesData.length} telematics packages`);
    } else {
      console.log(`Telematics packages already present (${telematicsCount}), skipping...`);
    }

    // Seed Container Mappings
    const containerMapCount = await db.containerMappings.count();
    if (containerMapCount === 0) {
      console.log('Seeding container mappings...');
      await db.containerMappings.bulkPut(containerMappingsData as any);
      console.log(`  Seeded ${containerMappingsData.length} container mappings`);
    } else {
      console.log(`Container mappings already present (${containerMapCount}), skipping...`);
    }

    // Build summary
    console.log('Database seeding completed successfully!');
    console.log(`- Commission tiers: ${commissionTiersData.length}`);
    console.log(`- Residual curves: 2`);
    console.log('- Default admin user ensured');
    console.log('- Default templates ensured');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Reset database - clear all data and reseed
 */
export async function resetDatabase(): Promise<void> {
  console.log('Resetting database...');

  // Clear all tables
  await db.quotes.clear();
  await db.customers.clear();
  await db.companies.clear();
  await db.contacts.clear();
  await db.activities.clear();
  await db.auditLog.clear();
  await db.templates.clear();
  await db.settings.clear();
  await db.approvalTiers.clear();
  await db.commissionTiers.clear();
  await db.residualCurves.clear();
  await db.configurationMatrices.clear();
  await db.users.clear();
  await db.priceListSeries.clear();
  await db.telematicsPackages.clear();
  await db.containerMappings.clear();

  console.log('Database cleared, reseeding...');

  // Reseed
  await seedDatabaseIfEmpty();

  console.log('Database reset complete!');
}
