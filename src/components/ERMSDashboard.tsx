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
import { SessionTimeoutModal } from './SessionTimeoutModal';
import { SessionTimeoutManager, SESSION_CONFIG } from '../utils/security';

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

  const [sessionManager] = useState(() => new SessionTimeoutManager(
    () => handleSessionTimeout(),
    () => setShowTimeoutWarning(true)
  ));
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(SESSION_CONFIG.WARNING_DURATION);

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

  const handleSessionTimeout = async () => {
    setShowTimeoutWarning(false);
    sessionManager.stop();
    await handleSignOut();
  };

  const handleExtendSession = () => {
    sessionManager.extendSession();
    setShowTimeoutWarning(false);
  };

  const modules = [
    {
      id: 'employee-dashboard',
      name: t('erms.employeeDashboard'),
      description: t('erms.employeeDashboardDesc'),
      icon: Users,
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
      requiredPermission: 'read'
    },
    {
      id: 'organization-setup',
      name: t('erms.organizationSetup'),
      description: t('erms.organizationSetupDesc'),
      icon: Settings,
      color: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      requiredPermission: 'admin'
    },
    {
      id: 'retirement-dashboard',
      name: t('erms.retirementDashboard'),
      description: t('erms.retirementDashboardDesc'),
      icon: Calendar,
      color: 'bg-yellow-600',
      hoverColor: 'hover:bg-yellow-700',
      requiredPermission: 'read'
    },
    {
      id: 'retirement-tracker',
      name: t('erms.retirementTracker'),
      description: t('erms.retirementTrackerDesc'),
      icon: TrendingUp,
      color: 'bg-purple-600',
      hoverColor: 'hover:bg-purple-700',
      requiredPermission: 'write'
    },
    // {
    //   id: 'retirement-file-tracker',
    //   name: t('erms.retirementFileTracker'),
    //   description: t('erms.retirementFileTrackerDesc'),
    //   icon: FolderOpen,
    //   color: 'bg-indigo-600',
    //   hoverColor: 'hover:bg-indigo-700',
    //   requiredPermission: 'read'
    // },
    {
      id: 'custom-reports',
      name: t('erms.customReports'),
      description: t('erms.customReportsDesc'),
      icon: BarChart3,
      color: 'bg-teal-600',
      hoverColor: 'hover:bg-teal-700',
      requiredPermission: 'read'
    },
    {
      id: 'instructions',
      name: t('erms.instructions'),
      description: t('erms.instructionsDesc'),
      icon: BookOpen,
      color: 'bg-gray-600',
      hoverColor: 'hover:bg-gray-700',
      requiredPermission: 'read'
    }
  ];
 // End of New changes to deploy

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

  useEffect(() => {
    if (user) {
      sessionManager.start();

      let interval: NodeJS.Timeout;
      if (showTimeoutWarning) {
        interval = setInterval(() => {
          setRemainingTime(sessionManager.getRemainingTime());
        }, 1000);
      }

      return () => {
        if (interval) clearInterval(interval);
        sessionManager.stop();
      };
    } else {
      sessionManager.stop();
    }
    return () => {
      sessionManager.stop();
    };
  }, [user, sessionManager, showTimeoutWarning]);

  return (
    // Start of New changes to deploy
    <div className="min-h-screen bg-gradient-to-tr from-gray-100 via-gray-50 to-blue-100 flex">
      {/* Left Sidebar */}
      <div
        className="w-80 bg-gradient-to-b from-white via-blue-50 to-blue-100 shadow-xl border-r border-blue-200 flex flex-col fixed top-0 left-0 h-screen z-30"
        style={{ height: '100vh' }}
      >
        {/* Header with back button */}
        <div className="p-6 border-b border-blue-200 flex items-center justify-between bg-white">
          <button
            onClick={handleBackToMain}
            className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-blue-700" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-200 p-2 rounded-lg shadow">
              <Users className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-blue-900">ERMS</h1>
              <p className="text-sm text-blue-600">Employee Retirement Management</p>
            </div>
          </div>
        </div>
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-6">
          <nav className="space-y-3">
            {accessibleModules.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                <p className="text-blue-600 text-sm">
                  {t('permissions.noAccess', { permission: 'any', system: 'ERMS' })}
                </p>
                <p className="text-blue-400 text-xs mt-2">
                  {t('permissions.contactAdmin')}
                </p>
              </div>
            ) : (
              accessibleModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => handleModuleChange(module.id)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-300 group flex items-center gap-4
                    ${
                      activeModule === module.id
                      ? 'bg-blue-100 border border-blue-400 shadow-md'
                      : 'bg-transparent hover:bg-blue-50 border border-transparent hover:border-blue-200'
                    }
                  `}
                  style={{
                    boxShadow: activeModule === module.id ? '0 3px 12px rgba(66, 153, 225, 0.5)' : '',
                  }}
                >
                  <div className={`${module.color} ${module.hoverColor} p-3 rounded-md shadow-sm transition-colors duration-300`}>
                    <module.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold transition-colors duration-300 ${
                      activeModule === module.id ? 'text-blue-900' : 'text-blue-800 group-hover:text-blue-700'
                      }`}>
                      {module.name}
                    </h3>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${
                      activeModule === module.id ? 'text-blue-600' : 'text-blue-500 group-hover:text-blue-500'
                      }`}>
                      {module.description}
                    </p>
                  </div>
                </button>
              ))
            )}
          </nav>
        </div>
        {/* Logout Button */}
        <div className="p-4 border-t border-blue-200 bg-white">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center p-3 rounded-lg bg-red-100 hover:bg-red-200 transition-colors text-red-700 shadow"
          >
            <LogOut className="h-5 w-5 mr-2" />
            {t('common.logout', 'Logout')}
          </button>
        </div>
      </div>

      {/* End of New changes to deploy */}
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto ml-80">
        {renderModuleContent()}
      </div>

      <SessionTimeoutModal
        isVisible={showTimeoutWarning}
        remainingTime={remainingTime}
        onExtendSession={handleExtendSession}
        onSignOut={handleSessionTimeout}
      />
    </div>
  );
};