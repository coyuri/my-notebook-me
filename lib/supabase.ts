/*
 * Supabase client setup
 *
 * Run the following SQL in your Supabase SQL editor to create the required table:
 *
 * create table generations (
 *   id uuid primary key default gen_random_uuid(),
 *   url text not null,
 *   title text,
 *   category text,
 *   text_content text,
 *   script text,
 *   audio_path text,
 *   slides_path text,
 *   video_path text,
 *   status text default 'pending',
 *   host_speaker_id int default 3,
 *   guest_speaker_id int default 2,
 *   created_at timestamp default now()
 * );
 *
 * Also create a storage bucket named "audio" with public access for audio files.
 */

import { createClient } from '@supabase/supabase-js';

export type Generation = {
  id: string;
  url: string;
  title: string | null;
  category: string | null;
  text_content: string | null;
  script: string | null;
  audio_path: string | null;
  slides_path: string | null;
  video_path: string | null;
  status: string;
  host_speaker_id: number;
  guest_speaker_id: number;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client (safe for browser/server components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client using service role key — server-side only
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
