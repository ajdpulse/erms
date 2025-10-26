import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft,
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
  ClipboardList
} from 'lucide-react';
import { OrganizationSetup } from './OrganizationSetup';
import { EmployeeDashboard } from './EmployeeDashboard';
import { RetirementDashboard } from './RetirementDashboard';
import { RetirementTracker } from './RetirementTracker';
import { InstructionsDashboard } from './InstructionsDashboard';
import { CustomReports } from './CustomReports';
import { usePermissions } from '../hooks/usePermissions';
import { Shield } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
interface ERMSDashboardProps {
  user: SupabaseUser;
  onBack: () => void;
}
export const ERMSDashboard: React.FC<ERMSDashboardProps> = ({ user, onBack }) => {
  const { t } = useTranslation();
  const { hasAccess } = usePermissions(user);
  // Enhanced module state management with better persistence
  const getInitialModule = () => {
    try {
      const savedModule = localStorage.getItem('erms-active-module');
      // Validate that the saved module exists in our modules list
      const validModules = [
        'employee-dashboard',
        'organization-setup', 
        'retirement-dashboard',
        'retirement-tracker',
        'retirement-file-tracker',
        'custom-reports',
        'instructions'
      ];
      if (savedModule && validModules.includes(savedModule)) {
        return savedModule;
      }
    } catch (error) {
      console.warn('Failed to load saved module from localStorage:', error);
    }
    // Always default to employee-dashboard as the landing page
    return 'employee-dashboard';
  };
  const [activeModule, setActiveModule] = useState(getInitialModule);
  const [isInitialized, setIsInitialized] = useState(false);
  // Enhanced module change handler with better error handling
  const handleModuleChange = (moduleId: string) => {
    try {
      // Validate module ID before setting
      const validModules = [
        'employee-dashboard',
        'organization-setup',
        'retirement-dashboard', 
        'retirement-tracker',
        'retirement-file-tracker',
        'custom-reports',
        'instructions'
      ];
      
      if (!validModules.includes(moduleId)) {
        console.warn('Invalid module ID:', moduleId);
        return;
      }
      
      // Update localStorage first
      localStorage.setItem('erms-active-module', moduleId);
      // Then update state
      setActiveModule(moduleId);
      
      // Broadcast change to other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'erms-active-module',
        newValue: moduleId,
        storageArea: localStorage
      }));
      
    } catch (error) {
      console.warn('Failed to save module to localStorage:', error);
      // Still update state even if localStorage fails
      setActiveModule(moduleId);
    }
  };
  // Enhanced tab synchronization and state management
  useEffect(() => {
    // Mark as initialized after first render
    setIsInitialized(true);
    
    // Ensure default module is properly set on initialization
    const currentModule = localStorage.getItem('erms-active-module');
    if (!currentModule) {
      localStorage.setItem('erms-active-module', 'employee-dashboard');
    }
    
    // Handle storage events from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'erms-active-module' && event.newValue) {
        const validModules = [
          'employee-dashboard',
          'organization-setup',
          'retirement-dashboard',
          'retirement-tracker', 
          'retirement-file-tracker',
          'custom-reports',
          'instructions'
        ];
        
        if (validModules.includes(event.newValue)) {
          setActiveModule(event.newValue);
        }
      }
    };
    
    // Handle browser tab visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible - sync module state from localStorage
        try {
          const savedModule = localStorage.getItem('erms-active-module');
          const validModules = [
            'employee-dashboard',
            'organization-setup',
            'retirement-dashboard',
            'retirement-tracker',
            'retirement-file-tracker', 
            'custom-reports',
            'instructions'
          ];
          
          if (savedModule && validModules.includes(savedModule) && savedModule !== activeModule) {
            setActiveModule(savedModule);
          }
        } catch (error) {
          console.warn('Failed to sync module state on visibility change:', error);
        }
      }
    };
    
    // Handle window focus events for better cross-browser support
    const handleWindowFocus = () => {
      if (!document.hidden) {
        handleVisibilityChange();
      }
    };
    
    // Handle page unload to ensure state is saved
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem('erms-active-module', activeModule);
      } catch (error) {
        console.warn('Failed to save module state on unload:', error);
      }
    };
    
    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeModule]);
  // Enhanced back handler that maintains current module context
  const handleBackToMain = () => {
    // This function is called when navigating back within modules
    // We maintain the current module state to prevent unwanted redirects
    try {
      localStorage.setItem('erms-active-module', activeModule);
    } catch (error) {
      console.warn('Failed to persist module state on back navigation:', error);
    }
    // Don't change activeModule - this prevents unwanted redirects
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
    {
      id: 'retirement-file-tracker',
      name: t('erms.retirementFileTracker'),
      description: t('erms.retirementFileTrackerDesc'),
      icon: FolderOpen,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
      requiredPermission: 'read'
    },
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
  // Filter modules based on user permissions
  const getAccessibleModules = () => {
    return modules.filter(module => {
      return hasAccess('erms', module.requiredPermission);
    });
  };
  const accessibleModules = getAccessibleModules();
  const renderModuleContent = () => {
    // Ensure we don't render content until properly initialized
    if (!isInitialized) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    // Check if user has access to the active module
    const activeModuleConfig = modules.find(m => m.id === activeModule);
    if (activeModuleConfig && !hasAccess('erms', activeModuleConfig.requiredPermission)) {
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
    
    switch (activeModule) {
      case 'employee-dashboard':
        return <EmployeeDashboard onBack={handleBackToMain} />;
      case 'organization-setup':
        return <OrganizationSetup onBack={handleBackToMain} />;
      case 'retirement-dashboard':
        return <RetirementDashboard user={user} onBack={handleBackToMain} />;
      case 'retirement-tracker':
        return <RetirementTracker user={user} onBack={handleBackToMain} />;
      case 'retirement-file-tracker':
        return (
          <div className="p-8 text-center">
            <FolderOpen className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Retirement File Tracker</h3>
            <p className="text-gray-600">File tracking features coming soon...</p>
          </div>
        );
      case 'custom-reports':
        return <CustomReports user={user} onBack={handleBackToMain} />;
      case 'instructions':
        return <InstructionsDashboard user={user} onBack={handleBackToMain} />;
      default:
        // Fallback to employee dashboard for any invalid module
        return <EmployeeDashboard onBack={handleBackToMain} />;
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
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
      </div>
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderModuleContent()}
      </div>
    </div>
  );
};