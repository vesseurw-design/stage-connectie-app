// Supabase client integration for Stage Connect
// This file handles all communication with the Supabase backend

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types
export interface SupabaseEmployer {
  id: string;
  company_name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEmployerContact {
  id: string;
  employer_id: string;
  name: string;
  email: string;
  access_code: string;
  assigned_internships: string[];
  created_at: string;
  updated_at: string;
}

export interface SupabaseSupervisorContact {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  access_code: string;
  assigned_students: string[];
  created_at: string;
  updated_at: string;
}

// Fetch all employers from Supabase
export const fetchEmployers = async (): Promise<SupabaseEmployer[]> => {
  try {
    const { data, error } = await supabase
      .from('employers')
      .select('*');
    
    if (error) {
      console.error('Error fetching employers:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching employers:', err);
    return [];
  }
};

// Fetch all employer contacts from Supabase
export const fetchEmployerContacts = async (): Promise<SupabaseEmployerContact[]> => {
  try {
    const { data, error } = await supabase
      .from('employer_contacts')
      .select('*');
    
    if (error) {
      console.error('Error fetching employer contacts:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching employer contacts:', err);
    return [];
  }
};

// Fetch all supervisor contacts from Supabase
export const fetchSupervisorContacts = async (): Promise<SupabaseSupervisorContact[]> => {
  try {
    const { data, error } = await supabase
      .from('supervisor_contacts')
      .select('*');
    
    if (error) {
      console.error('Error fetching supervisor contacts:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching supervisor contacts:', err);
    return [];
  }
};

// Fetch a single employer contact by email for login
export const fetchEmployerContactByEmail = async (email: string): Promise<SupabaseEmployerContact | null> => {
  try {
    const { data, error } = await supabase
      .from('employer_contacts')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.debug('Employer contact not found:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error fetching employer contact:', err);
    return null;
  }
};

// Fetch a single supervisor contact by email for login
export const fetchSupervisorContactByEmail = async (email: string): Promise<SupabaseSupervisorContact | null> => {
  try {
    const { data, error } = await supabase
      .from('supervisor_contacts')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.debug('Supervisor contact not found:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error fetching supervisor contact:', err);
    return null;
  }
};

// Health check - verify Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('employers')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return false;
  }
};
