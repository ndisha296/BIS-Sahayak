import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as localLogin, register as localRegister, getMyProfile, updateBusinessProfile } from '../api/client';
import { supabase, isSupabaseConfigured } from '../api/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [authProviderType, setAuthProviderType] = useState(localStorage.getItem('auth_provider') || 'supabase');

  // Supabase Auth Listener
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const mappedUser = mapSupabaseUserToAppUser(session.user);
        setUser(mappedUser);
        setToken(session.access_token);
        localStorage.setItem('token', session.access_token);
        localStorage.setItem('auth_provider', 'supabase');
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const mappedUser = mapSupabaseUserToAppUser(session.user);
        setUser(mappedUser);
        setToken(session.access_token);
        localStorage.setItem('token', session.access_token);
        localStorage.setItem('auth_provider', 'supabase');
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('auth_provider');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Helper to map Supabase User Object to consistent app structure
  const mapSupabaseUserToAppUser = (sbUser) => {
    if (!sbUser) return null;
    const meta = sbUser.user_metadata || {};
    return {
      id: sbUser.id,
      email: sbUser.email,
      name: meta.full_name || meta.name || sbUser.email.split('@')[0],
      phone: meta.phone || sbUser.phone || '',
      provider: 'supabase',
      business: {
        company_name: meta.company_name || 'Enterprise Client',
        company_type: meta.company_type || 'Private Limited',
        primary_product: meta.primary_product || 'Electronic / Consumer Goods',
        udyam_registered: meta.udyam_registered ?? true,
        journey_stage: meta.journey_stage || 'planning',
      },
    };
  };

  // Login with Email & Password
  const loginUser = async (email, password, forceLocal = false) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // If Supabase is available and not forced to local
    if (supabase && !forceLocal) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          setSupabaseUser(data.user);
          const mapped = mapSupabaseUserToAppUser(data.user);
          setUser(mapped);
          setToken(data.session?.access_token || 'supabase_token');
          setAuthProviderType('supabase');
          localStorage.setItem('auth_provider', 'supabase');
          if (data.session?.access_token) {
            localStorage.setItem('token', data.session.access_token);
          }
          return mapped;
        }
      } catch (sbErr) {
        // If Supabase returns invalid login, throw clear message unless local fallback desired
        if (!forceLocal && sbErr.message && !sbErr.message.includes('fetch')) {
          throw new Error(sbErr.message);
        }
        console.warn('Supabase sign-in fallback to local backend:', sbErr.message);
      }
    }

    // Fallback or Local FastAPI Backend Login
    try {
      const data = await localLogin(cleanEmail, password);
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('auth_provider', 'local');
        setToken(data.access_token);
        setAuthProviderType('local');
        const profile = await getMyProfile();
        setUser(profile);
        return profile;
      }
      throw new Error('Authentication failed: No access token received.');
    } finally {
      setLoading(false);
    }
  };

  // Register with Email, Password & User Details
  const registerUser = async ({ name, email, password, companyName, companyType, primaryProduct, isUdyam, forceLocal = false }) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (supabase && !forceLocal) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              company_name: companyName || cleanName + ' Enterprises',
              company_type: companyType || 'Private Limited',
              primary_product: primaryProduct || 'General Goods',
              udyam_registered: Boolean(isUdyam),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          setSupabaseUser(data.user);
          const mapped = mapSupabaseUserToAppUser(data.user);
          setUser(mapped);
          if (data.session?.access_token) {
            setToken(data.session.access_token);
            localStorage.setItem('token', data.session.access_token);
          }
          setAuthProviderType('supabase');
          localStorage.setItem('auth_provider', 'supabase');
          return mapped;
        }
      } catch (sbErr) {
        if (!forceLocal && sbErr.message && !sbErr.message.includes('fetch')) {
          throw new Error(sbErr.message);
        }
        console.warn('Supabase sign up fallback to local:', sbErr);
      }
    }

    // Local backend registration
    try {
      const data = await localRegister({ name: cleanName, email: cleanEmail, password });
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('auth_provider', 'local');
        setToken(data.access_token);
        setAuthProviderType('local');
        const profile = await getMyProfile();
        setUser(profile);
        return profile;
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Send Password Reset Email via Supabase
  const resetPassword = async (email) => {
    if (!supabase) {
      throw new Error('Supabase client is not configured for password reset.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login?reset=true`,
    });
    if (error) throw error;
    return true;
  };

  // Logout User
  const logoutUser = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('auth_provider');
    setToken(null);
    setUser(null);
    setSupabaseUser(null);
  };

  const refreshProfile = async () => {
    if (authProviderType === 'supabase' && supabaseUser) {
      const mapped = mapSupabaseUserToAppUser(supabaseUser);
      setUser(mapped);
      return mapped;
    }
    if (token) {
      try {
        const profile = await getMyProfile();
        setUser(profile);
        return profile;
      } catch (err) {
        console.error('Failed to refresh profile:', err);
      }
    }
    return null;
  };

  const saveBusinessProfile = async (profileData) => {
    if (supabase && supabaseUser) {
      try {
        await supabase.auth.updateUser({
          data: {
            company_name: profileData.company_name,
            company_type: profileData.company_type,
            primary_product: profileData.primary_product,
            udyam_registered: profileData.udyam_registered,
          }
        });
      } catch (e) {
        console.warn('Supabase metadata update:', e);
      }
    }
    try {
      const updated = await updateBusinessProfile(profileData);
      await refreshProfile();
      return updated;
    } catch {
      // Local fallback
      setUser(prev => ({
        ...prev,
        business: { ...prev?.business, ...profileData }
      }));
      return profileData;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        token,
        loading,
        authProviderType,
        isSupabaseEnabled: isSupabaseConfigured(),
        isAuthenticated: !!(user || token),
        loginUser,
        registerUser,
        resetPassword,
        logoutUser,
        refreshProfile,
        saveBusinessProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
