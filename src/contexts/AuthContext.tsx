import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/database.types';

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { full_name?: string; username?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If user doesn't exist, it might not have been created by trigger yet
        // Wait a moment and try again
        if (error.code === 'PGRST116') {
          console.log('User profile not found, waiting for trigger...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (retryError) {
            console.error('Error fetching user profile after retry:', retryError);
            // Don't throw - user might still be able to use the app
            return;
          }
          
          setProfile(retryData);
          return;
        }
        throw error;
      }
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't block auth if profile fetch fails
    }
  };

  // Update last_login_at when user signs in
  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check if user is verified before allowing access
      if (session?.user && !session.user.email_confirmed_at) {
        console.log('User email not verified, signing out');
        // Sign out unverified users
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      // Check if user is verified before allowing access
      if (session?.user && !session.user.email_confirmed_at) {
        console.log('User email not verified, signing out');
        // Sign out unverified users
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Update session and user immediately (don't wait for profile)
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Set loading to false immediately so user can navigate

      // Fetch profile in background (non-blocking)
      if (session?.user) {
        // Don't await - let it run in background
        fetchUserProfile(session.user.id).catch(err => {
          console.error('Failed to fetch user profile:', err);
        });
        
        // Update last login on sign in (also non-blocking)
        if (event === 'SIGNED_IN') {
          updateLastLogin(session.user.id).catch(err => {
            console.error('Failed to update last login:', err);
          });
        }
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string; username?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) return { error };

      // User profile is automatically created by the database trigger (handle_new_user)
      // No need to manually insert into users table

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Check if email is verified
      if (data?.user && !data.user.email_confirmed_at) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        return { 
          error: { 
            message: 'Please verify your email before signing in. Check your inbox for the verification link.' 
          } 
        };
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }

      // Update local profile state immediately
      if (data) {
        setProfile(data);
      }

      // Also refresh from database to ensure we have latest
      await fetchUserProfile(user.id);

      return { error: null };
    } catch (error) {
      console.error('Exception updating profile:', error);
      return { error };
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
