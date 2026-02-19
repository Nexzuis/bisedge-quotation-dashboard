import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
 *    Supabase RPC call that writes the merged company, reassigns all related
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
        const [primaryRes, secondaryRes] = await Promise.all([
          supabase.from('companies').select('*').eq('id', primaryId).single(),
          supabase.from('companies').select('*').eq('id', secondaryId).single(),
        ]);

        const primary = primaryRes.data as StoredCompany | null;
        const secondary = secondaryRes.data as StoredCompany | null;

        if (!primary || !secondary) {
          console.error(
            'fetchMergePreview: one or both companies not found',
            { primaryId, secondaryId }
          );
          return null;
        }

        const [contactsRes, activitiesRes, quotesRes] = await Promise.all([
          supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', secondaryId),
          supabase.from('activities').select('id', { count: 'exact', head: true }).eq('company_id', secondaryId),
          supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('company_id', secondaryId),
        ]);

        return {
          primary,
          secondary,
          relatedCounts: {
            contacts: contactsRes.count ?? 0,
            activities: activitiesRes.count ?? 0,
            quotes: quotesRes.count ?? 0,
          },
        };
      } catch (error) {
        console.error('fetchMergePreview failed:', error);
        return null;
      }
    },
    []
  );

  /**
   * Execute the merge atomically via a Supabase RPC call (`merge_companies`).
   *
   * Steps (all-or-nothing inside the database function):
   *  1. Re-fetch both companies to build the merged payload.
   *  2. Compute the merged company record from field selections.
   *  3. Call `supabase.rpc('merge_companies')` which atomically:
   *     - Writes the merged record to the primary company's row.
   *     - Reassigns contacts, activities, and quotes from secondary → primary.
   *     - Deletes the secondary company record.
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
        // Re-fetch both companies to build the merged payload
        const [primaryRes, secondaryRes] = await Promise.all([
          supabase.from('companies').select('*').eq('id', primaryId).single(),
          supabase.from('companies').select('*').eq('id', secondaryId).single(),
        ]);

        const primary = primaryRes.data as StoredCompany | null;
        const secondary = secondaryRes.data as StoredCompany | null;

        if (!primary || !secondary) {
          throw new Error(
            `Merge aborted: company not found (primary=${primaryId}, secondary=${secondaryId})`
          );
        }

        const mergedCompany = applySelections(primary, secondary, selections);

        // Build snake_case payload for the RPC
        const mergedData = {
          name: mergedCompany.name,
          trading_name: mergedCompany.tradingName,
          registration_number: mergedCompany.registrationNumber,
          vat_number: mergedCompany.vatNumber,
          industry: mergedCompany.industry,
          website: mergedCompany.website,
          address: mergedCompany.address,
          city: mergedCompany.city,
          province: mergedCompany.province,
          postal_code: mergedCompany.postalCode,
          country: mergedCompany.country,
          phone: mergedCompany.phone,
          email: mergedCompany.email,
          pipeline_stage: mergedCompany.pipelineStage,
          assigned_to: mergedCompany.assignedTo,
          estimated_value: mergedCompany.estimatedValue,
          credit_limit: mergedCompany.creditLimit,
          payment_terms: mergedCompany.paymentTerms,
          tags: mergedCompany.tags,
          notes: mergedCompany.notes,
        };

        const { error } = await supabase.rpc('merge_companies', {
          p_primary_id: primaryId,
          p_secondary_id: secondaryId,
          p_merged_data: mergedData,
        });

        if (error) throw error;

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
