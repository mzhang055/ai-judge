/**
 * Service for managing AI Judge CRUD operations in Supabase
 */

import { supabase } from '../lib/supabase';
import { createError } from '../lib/errors';
import type { Judge } from '../types';

/**
 * Input type for creating a new judge (omits generated fields)
 * Note: Always uses GPT-5-mini model
 */
export interface CreateJudgeInput {
  name: string;
  system_prompt: string;
  is_active?: boolean;
}

/**
 * Input type for updating an existing judge
 */
export interface UpdateJudgeInput {
  name?: string;
  system_prompt?: string;
  is_active?: boolean;
}

/**
 * Create a new judge in Supabase
 */
export async function createJudge(input: CreateJudgeInput): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .insert({
      name: input.name,
      system_prompt: input.system_prompt,
      model_name: 'gpt-5o-mini', // All judges use GPT-5o-mini model
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw createError(`Failed to create judge: ${error.message}`, error);
  }

  return data;
}

/**
 * Get a single judge by ID
 */
export async function getJudge(id: string): Promise<Judge | null> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw createError(`Failed to fetch judge: ${error.message}`, error);
  }

  return data;
}

/**
 * List all judges, optionally filtered by active status
 */
export async function listJudges(
  activeOnly: boolean = false
): Promise<Judge[]> {
  let query = supabase
    .from('judges')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw createError(`Failed to list judges: ${error.message}`, error);
  }

  return data || [];
}

/**
 * Update an existing judge
 */
export async function updateJudge(
  id: string,
  input: UpdateJudgeInput
): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError(`Failed to update judge: ${error.message}`, error);
  }

  return data;
}

/**
 * Delete a judge by ID
 */
export async function deleteJudge(id: string): Promise<void> {
  const { error } = await supabase.from('judges').delete().eq('id', id);

  if (error) {
    throw createError(`Failed to delete judge: ${error.message}`, error);
  }
}
