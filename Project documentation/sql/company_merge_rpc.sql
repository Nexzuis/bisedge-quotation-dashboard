-- Company Merge RPC Function
-- Provides atomic company merge: reassigns all child entities and deletes secondary company
-- Required by: src/hooks/useCompanyMerge.ts
-- Deploy to Supabase before running Phase 4A of the migration plan.

CREATE OR REPLACE FUNCTION merge_companies(
  p_primary_id UUID,
  p_secondary_id UUID,
  p_merged_data JSONB
) RETURNS VOID AS $$
BEGIN
  -- Update primary company with merged data
  UPDATE companies
  SET name = COALESCE(p_merged_data->>'name', name),
      trading_name = COALESCE(p_merged_data->>'trading_name', trading_name),
      industry = COALESCE(p_merged_data->>'industry', industry),
      website = COALESCE(p_merged_data->>'website', website),
      notes = COALESCE(p_merged_data->>'notes', notes),
      phone = COALESCE(p_merged_data->>'phone', phone),
      email = COALESCE(p_merged_data->>'email', email),
      registration_number = COALESCE(p_merged_data->>'registration_number', registration_number),
      vat_number = COALESCE(p_merged_data->>'vat_number', vat_number),
      address = COALESCE(p_merged_data->'address', address),
      city = COALESCE(p_merged_data->>'city', city),
      province = COALESCE(p_merged_data->>'province', province),
      postal_code = COALESCE(p_merged_data->>'postal_code', postal_code),
      country = COALESCE(p_merged_data->>'country', country),
      pipeline_stage = COALESCE(p_merged_data->>'pipeline_stage', pipeline_stage),
      assigned_to = COALESCE(NULLIF(p_merged_data->>'assigned_to','')::UUID, assigned_to),
      estimated_value = COALESCE(NULLIF(p_merged_data->>'estimated_value','')::NUMERIC, estimated_value),
      credit_limit = COALESCE(NULLIF(p_merged_data->>'credit_limit','')::NUMERIC, credit_limit),
      payment_terms = COALESCE(NULLIF(p_merged_data->>'payment_terms','')::INTEGER, payment_terms),
      tags = COALESCE(p_merged_data->'tags', tags),
      updated_at = NOW()
  WHERE id = p_primary_id;

  -- Reassign contacts from secondary to primary
  UPDATE contacts
  SET company_id = p_primary_id,
      updated_at = NOW()
  WHERE company_id = p_secondary_id;

  -- Reassign activities from secondary to primary
  UPDATE activities
  SET company_id = p_primary_id
  WHERE company_id = p_secondary_id;

  -- Reassign quotes from secondary to primary
  UPDATE quotes
  SET company_id = p_primary_id,
      client_name = COALESCE(p_merged_data->>'name', client_name),
      updated_at = NOW()
  WHERE company_id = p_secondary_id;

  -- Delete secondary company
  DELETE FROM companies WHERE id = p_secondary_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION merge_companies(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_companies(UUID, UUID, JSONB) TO service_role;
