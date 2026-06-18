
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

let supabase: SupabaseClient | null = null;
let currentConfig: SupabaseConfig | null = null;

export const initSupabase = (config: SupabaseConfig) => {
  if (!config.url || !config.anonKey) {
    supabase = null;
    return;
  }
  supabase = createClient(config.url, config.anonKey);
  currentConfig = config;
};

export const saveToCloud = async (data: any): Promise<boolean> => {
  if (!supabase || !currentConfig) return false;

  try {
    const { error } = await supabase
      .from('workspaces')
      .upsert({
        id: currentConfig.workspaceId,
        data: data,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Supabase] Sync Error:', error.message, 'Code:', error.code, 'Details:', error.details);
      return false;
    }
    return true;
  } catch (err: any) {
    if (!window.navigator.onLine) {
      console.error('[Supabase] Sync Exception: Browser is OFFLINE');
    } else {
      console.error('[Supabase] Sync Exception:', err.message || err);
    }
    return false;
  }
};

export const loadFromCloud = async (): Promise<any | null> => {
  if (!supabase || !currentConfig) {
    console.warn('[Supabase] Load attempted before initialization');
    return null;
  }

  try {
    console.log('[Supabase] Loading workspace:', currentConfig.workspaceId);
    const { data, error } = await supabase
      .from('workspaces')
      .select('data')
      .eq('id', currentConfig.workspaceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[Supabase] No cloud workspace found for this ID. Starting fresh.');
        return null;
      }
      console.error('[Supabase] Load Error:', error.message, 'Code:', error.code);
      return null;
    }
    return data.data;
  } catch (err) {
    console.error('[Supabase] Load Exception:', err);
    return null;
  }
};

export const checkCloudConnectivity = async (config: SupabaseConfig): Promise<boolean> => {
  try {
    const tempClient = createClient(config.url, config.anonKey);
    const { error } = await tempClient.from('workspaces').select('id').limit(1);
    // If table doesn't exist, it's an error, but connectivity to Supabase might be okay.
    // However, for our app's purposes, we want the table ready.
    if (error) {
      console.warn("Cloud connection established but table 'workspaces' might be missing:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};
