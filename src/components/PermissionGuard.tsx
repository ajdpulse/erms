import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import type { User } from '@supabase/supabase-js';

interface PermissionGuardProps {
  user: User | null;
  application: string;
  permission?: 'read' | 'write' | 'delete' | 'admin';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  user,
  application,
  permission = 'read',
  children,
  fallback
}) => {
  const { t } = useTranslation();
  const { hasAccess, isLoading, error } = usePermissions(user);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">{t('permissions.permissionError')}</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess(application, permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 m-4 text-center">
        <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('permissions.accessRestricted')}</h3>
        <p className="text-gray-600 mb-4">
          {t('permissions.noAccess', { permission, system: application.toUpperCase() })}
        </p>
        <p className="text-sm text-gray-500">
          {t('permissions.contactAdmin')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
};