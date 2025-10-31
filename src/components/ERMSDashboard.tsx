import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Settings,
  BarChart3,
  FolderOpen,
  BookOpen,
  Building2,
  MapPin,
  UserCheck,
  ClipboardList,
  Shield,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrganizationSetup } from './OrganizationSetup';
import { EmployeeDashboard } from './EmployeeDashboard';
import { RetirementDashboard } from './RetirementDashboard';
import { RetirementTracker } from './RetirementTracker';
import { InstructionsDashboard } from './InstructionsDashboard';
import { CustomReports } from './CustomReports';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from "../lib/supabase"; // adjust import path if needed
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ERMSDashboardProps {
  user: SupabaseUser;
}

export const ERMSDashboard: React.FC<ERMSDashboardProps> = ({ user }) => {
  const { t } = useTranslation();
  const { hasAccess } = usePermissions(user);

  const navigate = useNavigate();
  const defaultModule = 'employee-dashboard';

  const [activeModule, setActiveModule] = useState(() => {
    return localStorage.getItem('ermsActiveModule') || defaultModule;
  });

  useEffect(() => {
    localStorage.setItem('ermsActiveModule', activeModule);
  }, [activeModule]);

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
  };

  const handleBackToMain = () => {
     if (window && window.location) {
      localStorage.removeItem('ermsActiveModule');
      window.location.reload(); // or redirect to login
    }
  };

  // Logout: Supabase sign out and reload
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ermsActiveModule');
    window.location.href = '/';
  };

  const modules = [
    {
      id: 'employee-dashboard',
      name: t('erms.employeeDashboard'),
      description: t('erms.employeeDashboardDesc'),
      icon: Users,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      requiredPermission: 'read'
    },
    {
      id: 'organization-setup',
      name: t('erms.organizationSetup'),
      description: t('erms.organizationSetupDesc'),
      icon: Settings,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      requiredPermission: 'admin'
    },
    {
      id: 'retirement-dashboard',
      name: t('erms.retirementDashboard'),
      description: t('erms.retirementDashboardDesc'),
      icon: Calendar,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      requiredPermission: 'read'
    },
    {
      id: 'retirement-tracker',
      name: t('erms.retirementTracker'),
      description: t('erms.retirementTrackerDesc'),
      icon: TrendingUp,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      requiredPermission: 'write'
    },
    // {
    //   id: 'retirement-file-tracker',
    //   name: t('erms.retirementFileTracker'),
    //   description: t('erms.retirementFileTrackerDesc'),
    //   icon: FolderOpen,
    //   color: 'bg-indigo-500',
    //   hoverColor: 'hover:bg-indigo-600',
    //   requiredPermission: 'read'
    // },
    {
      id: 'custom-reports',
      name: t('erms.customReports'),
      description: t('erms.customReportsDesc'),
      icon: BarChart3,
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
      requiredPermission: 'read'
    },
    {
      id: 'instructions',
      name: t('erms.instructions'),
      description: t('erms.instructionsDesc'),
      icon: BookOpen,
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600',
      requiredPermission: 'read'
    }
  ];

  const getAccessibleModules = () => {
    return modules.filter(module => {
      return hasAccess('erms', module.requiredPermission);
    });
  };

  const accessibleModules = getAccessibleModules();

  const renderModuleContent = () => {
    const activeModuleConfig = modules.find(m => m.id === activeModule);
    const hasModuleAccess = activeModuleConfig && hasAccess('erms', activeModuleConfig.requiredPermission);

    if (!hasModuleAccess && activeModuleConfig) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('permissions.accessRestricted')}
            </h3>
            <p className="text-gray-600">
              {t('permissions.noAccess', {
                permission: activeModuleConfig.requiredPermission,
                system: 'ERMS'
              })}
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div style={{ display: activeModule === 'employee-dashboard' ? 'block' : 'none' }}>
          <EmployeeDashboard onBack={handleBackToMain} />
        </div>
        <div style={{ display: activeModule === 'organization-setup' ? 'block' : 'none' }}>
          <OrganizationSetup onBack={handleBackToMain} />
        </div>
        <div style={{ display: activeModule === 'retirement-dashboard' ? 'block' : 'none' }}>
          <RetirementDashboard user={user} onBack={handleBackToMain} />
        </div>
        <div style={{ display: activeModule === 'retirement-tracker' ? 'block' : 'none' }}>
          <RetirementTracker user={user} onBack={handleBackToMain} />
        </div>
        <div style={{ display: activeModule === 'retirement-file-tracker' ? 'block' : 'none' }}>
          <div className="p-8 text-center">
            <FolderOpen className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Retirement File Tracker</h3>
            <p className="text-gray-600">File tracking features coming soon...</p>
          </div>
        </div>
        <div style={{ display: activeModule === 'custom-reports' ? 'block' : 'none' }}>
          <CustomReports user={user} onBack={handleBackToMain} />
        </div>
        <div style={{ display: activeModule === 'instructions' ? 'block' : 'none' }}>
          <InstructionsDashboard user={user} onBack={handleBackToMain} />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div 
        className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col fixed top-0 left-0 h-screen z-30"
        style={{ height: '100vh' }}
      >
        {/* Header with back button */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBackToMain}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">ERMS</h1>
              <p className="text-sm text-gray-500">Employee Retirement Management</p>
            </div>
          </div>
        </div>
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-2">
            {accessibleModules.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm">
                  {t('permissions.noAccess', { permission: 'any', system: 'ERMS' })}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  {t('permissions.contactAdmin')}
                </p>
              </div>
            ) : (
              accessibleModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => handleModuleChange(module.id)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 group ${
                    activeModule === module.id
                      ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`${module.color} ${module.hoverColor} p-2 rounded-lg transition-colors duration-200`}>
                      <module.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium transition-colors duration-200 ${
                        activeModule === module.id ? 'text-blue-900' : 'text-gray-900 group-hover:text-gray-700'
                      }`}>
                        {module.name}
                      </h3>
                      <p className={`text-sm mt-1 transition-colors duration-200 ${
                        activeModule === module.id ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-600'
                      }`}>
                        {module.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </nav>
        </div>
        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center p-3 rounded-lg bg-red-100 hover:bg-red-200 transition-colors text-red-700"
          >
            <LogOut className="h-5 w-5 mr-2" />
            {t('common.logout', 'Logout')}
          </button>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto ml-80">
        {renderModuleContent()}
      </div>
    </div>
  );
};
