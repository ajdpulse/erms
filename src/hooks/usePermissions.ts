import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface UserPermission {
  application_name: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_admin: boolean;
  role_name: string;
}

export interface UserProfile {
  name: string | null;
  role_name: string | null;
  email: string | null;
  phone_number: string | null;
}
export interface PermissionCheck {
  hasAccess: (app: string, permission?: 'read' | 'write' | 'delete' | 'admin') => boolean;
  permissions: UserPermission[];
  userRole: string | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export const usePermissions = (user: User | null): PermissionCheck => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setUserRole(null);
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabaseUrl = 'https://tvmqkondihsomlebizjj.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bXFrb25kaWhzb21sZWJpempqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTQ0NjcsImV4cCI6MjA2OTI3MDQ2N30.W1fSD_RLJjcsIoJhJDnE6Xri9AIxv5DuAlN65iqI6BE';
        // Check if Supabase is properly configured
        if (!supabaseUrl || !supabaseKey){
          throw new Error('Supabase configuration is missing. Please check your environment variables.');
        }

        // Check if we can reach Supabase
        try {
          const { data: healthCheck, error: healthError } = await supabase.from('user_roles').select('count').limit(1);
          if (healthError && healthError.message.includes('Failed to fetch')) {
            throw new Error('Unable to connect to Supabase. Please check your internet connection and Supabase project status.');
          }
        } catch (networkError) {
          console.error('Network connectivity issue:', networkError);
          if (networkError.message.includes('Failed to fetch')) {
            throw new Error('Unable to connect to Supabase. Please check your internet connection and verify your Supabase project is active.');
          }
          throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
        }

        // Fetch user roles and permissions directly without RPC function
        let userRolesData;
        let userRolesError;
        
        try {
          const result = await supabase
            .from('user_roles')
            .select(`
              name,
              phone_number,
              role_id,
              roles!inner(name)
            `)
            .eq('user_id', user.id);
          
          userRolesData = result.data;
          userRolesError = result.error;
        } catch (fetchError) {
          console.error('Error fetching user roles:', fetchError);
          userRolesError = fetchError;
        }

        if (userRolesError) {
          console.error('Error fetching user roles:', userRolesError);
          // Don't throw immediately, try to provide basic functionality
          console.warn('Continuing with limited functionality due to user roles fetch error');
        }

        // Get role IDs for permission lookup
        const roleIds = userRolesData?.map(ur => ur.role_id) || [];
        const primaryRole = userRolesData?.[0]?.roles?.name || null;
        
        setUserRole(primaryRole);

        // Fetch permissions for user's roles
        let permissionsData: UserPermission[] = [];
        if (roleIds.length > 0) {
          try {
            const { data: permsData, error: permsError } = await supabase
              .from('application_permissions')
              .select(`
                application_name,
                can_read,
                can_write,
                can_delete,
                can_admin,
                roles!inner(name)
              `)
              .in('role_id', roleIds);

            if (permsError) {
              console.error('Error fetching permissions:', permsError);
              // Continue without permissions rather than failing
              permissionsData = [];
            } else {
              permissionsData = permsData?.map(p => ({
                application_name: p.application_name,
                can_read: p.can_read,
                can_write: p.can_write,
                can_delete: p.can_delete,
                can_admin: p.can_admin,
                role_name: p.roles?.name || primaryRole || 'unknown'
              })) || [];
            }
          } catch (permsFetchError) {
            console.error('Error fetching permissions:', permsFetchError);
            permissionsData = [];
          }
        }

        setPermissions(permissionsData);

        // Set user profile from the fetched data
        const primaryUserRole = userRolesData?.[0];
        setUserProfile({
          name: primaryUserRole?.name || null,
          role_name: primaryRole,
          email: user.email || null,
          phone_number: primaryUserRole?.phone_number || null
        });

      } catch (err) {
        console.error('Error fetching permissions:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch permissions. Please check your connection and try again.';
        setError(errorMessage);
        // Set basic profile with email only on error
        setUserProfile({
          name: null,
          role_name: null,
          email: user?.email || null,
          phone_number: null
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasAccess = (app: string, permission: 'read' | 'write' | 'delete' | 'admin' = 'read'): boolean => {
    const appPermission = permissions.find(p => p.application_name === app);
    if (!appPermission) return false;

    switch (permission) {
      case 'read':
        return appPermission.can_read;
      case 'write':
        return appPermission.can_write;
      case 'delete':
        return appPermission.can_delete;
      case 'admin':
        return appPermission.can_admin;
      default:
        return false;
    }
  };

  return {
    hasAccess,
    permissions,
    userRole,
    userProfile,
    isLoading,
    error
  };
};