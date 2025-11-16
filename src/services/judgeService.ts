/**
 * Service for managing AI Judge CRUD operations in Supabase
 */

import { supabase } from '../lib/supabase';
import type { Judge } from '../types';

/**
 * Input type for creating a new judge (omits generated fields)
 */
export interface CreateJudgeInput {
  name: string;
  system_prompt: string;
  model_name: string;
  is_active?: boolean;
}

/**
 * Input type for updating an existing judge
 */
export interface UpdateJudgeInput {
  name?: string;
  system_prompt?: string;
  model_name?: string;
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
      model_name: input.model_name,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create judge: ${error.message}`);
  }

  return data as Judge;
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
    throw new Error(`Failed to fetch judge: ${error.message}`);
  }

  return data as Judge;
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
    throw new Error(`Failed to list judges: ${error.message}`);
  }

  return (data as Judge[]) || [];
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
    throw new Error(`Failed to update judge: ${error.message}`);
  }

  return data as Judge;
}

/**
 * Delete a judge by ID
 */
export async function deleteJudge(id: string): Promise<void> {
  const { error } = await supabase.from('judges').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete judge: ${error.message}`);
  }
}
