'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { ensureDefaultUtilityTypes } from '@/lib/utility-types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
      return;
    }

    const meta = authUser.user_metadata ?? {};
    const role =
      meta.role === 'owner' || meta.role === 'tenant' || meta.role === 'manager'
        ? meta.role
        : 'tenant';
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      authUser.email?.split('@')[0] ||
      'User';

    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        full_name: fullName,
        role,
      })
      .select()
      .single();

    if (!insertError && created) {
      setProfile(created as Profile);
      if (role === 'owner') {
        await ensureDefaultUtilityTypes(supabase, authUser.id);
      }
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      }
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        void fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'owner' | 'tenant') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return { user, profile, loading, signIn, signUp, signOut };
}
