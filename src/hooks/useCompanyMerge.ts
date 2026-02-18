import { useCallback } from 'react';
import { db } from '../db/schema';
import type { StoredCompany } from '../db/interfaces';

/**
 * Describes which company's value to keep for a given field.
 * 'primary' = keep the survivor's value; 'secondary' = take the value from the company being absorbed.
 */
export type FieldSelection = 'primary' | 'secondary';

/**
 * A keyed map of every mergeable field to its selection source.
 */
export type MergeFieldSelections = Record<string, FieldSelection>;

/**
 * Summary counts of related records that will be reassigned during the merge.
 */
export interface MergeRelatedCounts {
  contacts: number;
  activities: number;
  quotes: number;
}

/**
 * Full result returned by `fetchMergePreview`.
 */
export interface MergePreview {
  primary: StoredCompany;
  secondary: StoredCompany;
  relatedCounts: MergeRelatedCounts;
}

/**
 * The fields that are exposed in the field-by-field comparison UI.
 * Only fields that carry meaningful, user-visible data are listed —
 * metadata (id, createdAt, updatedAt) is always taken from primary.
 */
export const MERGEABLE_FIELDS: ReadonlyArray<{
  key: keyof StoredCompany;
  label: string;
  group: string;
}> = [
  // Identity
  { key: 'name',               label: 'Company Name',       group: 'Identity' },
  { key: 'tradingName',        label: 'Trading Name',       group: 'Identity' },
  { key: 'registrationNumber', label: 'Reg. Number',        group: 'Identity' },
  { key: 'vatNumber',          label: 'VAT Number',         group: 'Identity' },
  { key: 'industry',           label: 'Industry',           group: 'Identity' },
  { key: 'website',            label: 'Website',            group: 'Identity' },
  // Contact Details
  { key: 'phone',              label: 'Phone',              group: 'Contact' },
  { key: 'email',              label: 'Email',              group: 'Contact' },
  // Address
  { key: 'address',            label: 'Street Address',     group: 'Address' },
  { key: 'city',               label: 'City',               group: 'Address' },
  { key: 'province',           label: 'Province',           group: 'Address' },
  { key: 'postalCode',         label: 'Postal Code',        group: 'Address' },
  { key: 'country',            label: 'Country',            group: 'Address' },
  // Commercial
  { key: 'pipelineStage',      label: 'Pipeline Stage',     group: 'Commercial' },
  { key: 'estimatedValue',     label: 'Estimated Value',    group: 'Commercial' },
  { key: 'creditLimit',        label: 'Credit Limit',       group: 'Commercial' },
  { key: 'paymentTerms',       label: 'Payment Terms',      group: 'Commercial' },
  // Other
  { key: 'tags',               label: 'Tags',               group: 'Other' },
  { key: 'notes',              label: 'Notes',              group: 'Other' },
  { key: 'assignedTo',         label: 'Assigned To',        group: 'Other' },
] as const;

/**
 * Build the default selection map — every field starts by keeping the primary's value.
 */
export function buildDefaultSelections(): MergeFieldSelections {
  return Object.fromEntries(
    MERGEABLE_FIELDS.map(({ key }) => [key, 'primary' as FieldSelection])
  );
}

/**
 * Apply the user's field selections to produce the final company record.
 * Metadata fields (id, createdAt, updatedAt) are always taken from the primary.
 */
function applySelections(
  primary: StoredCompany,
  secondary: StoredCompany,
  selections: MergeFieldSelections
): StoredCompany {
  const merged: StoredCompany = { ...primary, updatedAt: new Date().toISOString() };

  for (const { key } of MERGEABLE_FIELDS) {
    const source = selections[key] ?? 'primary';
    if (source === 'secondary') {
      // `key` is a keyof StoredCompany so the assignment is always safe.
      (merged as Record<string, unknown>)[key] = secondary[key];
    }
  }

  return merged;
}

/**
 * `useCompanyMerge` — a hook that encapsulates all merge logic.
 *
 * Provides:
 *  - `fetchMergePreview(primaryId, secondaryId)` — load both companies and
 *    count related records without modifying anything.
 *  - `mergeCompanies(primaryId, secondaryId, selections)` — run the atomic
 *    Dexie transaction that writes the merged company, reassigns all related
 *    records from secondary → primary, and deletes the secondary company.
 */
export function useCompanyMerge() {
  /**
   * Load both company records and pre-count related records.
   * Returns null if either company does not exist.
   */
  const fetchMergePreview = useCallback(
    async (
      primaryId: string,
      secondaryId: string
    ): Promise<MergePreview | null> => {
      try {
        const [primary, secondary] = await Promise.all([
          db.companies.get(primaryId),
          db.companies.get(secondaryId),
        ]);

        if (!primary || !secondary) {
          console.error(
            'fetchMergePreview: one or both companies not found',
            { primaryId, secondaryId }
          );
          return null;
        }

        const [contacts, activities, quotes] = await Promise.all([
          db.contacts.where('companyId').equals(secondaryId).count(),
          db.activities.where('companyId').equals(secondaryId).count(),
          db.quotes.where('companyId').equals(secondaryId).count(),
        ]);

        return {
          primary,
          secondary,
          relatedCounts: { contacts, activities, quotes },
        };
      } catch (error) {
        console.error('fetchMergePreview failed:', error);
        return null;
      }
    },
    []
  );

  /**
   * Execute the merge atomically inside a Dexie read-write transaction.
   *
   * Steps (all-or-nothing):
   *  1. Re-fetch both companies inside the transaction to ensure consistency.
   *  2. Compute the merged company record from field selections.
   *  3. Write the merged record to the primary company's row.
   *  4. Reassign every Contact  whose companyId === secondaryId → primaryId.
   *  5. Reassign every Activity whose companyId === secondaryId → primaryId.
   *  6. Reassign every Quote    whose companyId === secondaryId → primaryId
   *     and update clientName to match the (possibly changed) primary name.
   *  7. Delete the secondary company record.
   *
   * Returns `true` on success, `false` on any error.
   */
  const mergeCompanies = useCallback(
    async (
      primaryId: string,
      secondaryId: string,
      selections: MergeFieldSelections
    ): Promise<boolean> => {
      try {
        await db.transaction(
          'rw',
          [db.companies, db.contacts, db.activities, db.quotes],
          async () => {
            // ── 1. Re-fetch inside transaction ──────────────────────────
            const primary = await db.companies.get(primaryId);
            const secondary = await db.companies.get(secondaryId);

            if (!primary || !secondary) {
              throw new Error(
                `Merge aborted: company not found (primary=${primaryId}, secondary=${secondaryId})`
              );
            }

            // ── 2. Compute merged record ─────────────────────────────────
            const mergedCompany = applySelections(primary, secondary, selections);

            // ── 3. Update primary company row ────────────────────────────
            await db.companies.put(mergedCompany);

            // The final name used for quote clientName updates:
            const survivingName = mergedCompany.name;

            // ── 4. Reassign Contacts ─────────────────────────────────────
            const contactsToMove = await db.contacts
              .where('companyId')
              .equals(secondaryId)
              .toArray();

            const now = new Date().toISOString();
            await Promise.all(
              contactsToMove.map((contact) =>
                db.contacts.update(contact.id, {
                  companyId: primaryId,
                  updatedAt: now,
                })
              )
            );

            // ── 5. Reassign Activities ───────────────────────────────────
            const activitiesToMove = await db.activities
              .where('companyId')
              .equals(secondaryId)
              .toArray();

            await Promise.all(
              activitiesToMove.map((activity) =>
                db.activities.update(activity.id, { companyId: primaryId })
              )
            );

            // ── 6. Reassign Quotes ───────────────────────────────────────
            const quotesToMove = await db.quotes
              .where('companyId')
              .equals(secondaryId)
              .toArray();

            await Promise.all(
              quotesToMove.map((quote) =>
                db.quotes.update(quote.id, {
                  companyId: primaryId,
                  clientName: survivingName,
                  updatedAt: now,
                })
              )
            );

            // ── 7. Delete secondary company ──────────────────────────────
            await db.companies.delete(secondaryId);
          }
        );

        return true;
      } catch (error) {
        console.error('mergeCompanies failed:', error);
        return false;
      }
    },
    []
  );

  return { fetchMergePreview, mergeCompanies };
}
