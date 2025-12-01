import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PayCommission } from './PayCommission';
import { GroupInsurance } from './GroupInsurance';
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  BarChart3,
  User,
  X,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ermsClient, supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface RetirementTrackerProps {
  user: SupabaseUser;
  onBack: () => void;
}

interface RetirementProgress {
  id: string;
  emp_id: string;
  employee_name: string;
  age: number | null;
  assigned_clerk: string | null;
  department: string | null;
  status: string | null;
  date_of_birth_verification: string | null;
  medical_certificate: string | null;
  nomination: string | null;
  permanent_registration: string | null;
  computer_exam_passed: string | null;
  marathi_hindi_exam_exemption: string | null;
  post_service_exam: string | null;
  appointed_employee: string | null;
  validity_certificate: string | null;
  verification_completed: string | null;
  has_undertaking_been_taken_on_21_12_2021: string | null;
  no_objection_no_inquiry_certificate: string | null;
  retirement_order: string | null;
  birth_certificate_doc_submitted: string | null;
  common_progress_comment: string | null;
  common_progress_date: string | null;
  government_decision_march_31_2023: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClerkData {
  user_id: string;
  name: string;
  role_name: string;
}

interface Department {
  dept_id: string;
  department: string;
}

interface RetirementProgressRecord {
  id: string;
  emp_id: string;
  employee_name: string;
  age: number | null;
  department: string | null;
  designation: string | null;
  assigned_clerk: string | null;
  birth_certificate: string | null;
  birth_doc_submitted: string | null;
  medical_certificate: string | null;
  nomination: string | null;
  permanent_registration: string | null;
  computer_exam: string | null;
  language_exam: string | null;
  post_service_exam: string | null;
  verification: string | null;
  date_of_birth_verification: string | null;
  computer_exam_passed: string | null;
  marathi_hindi_exam_exemption: string | null;
  validity_certificate: string | null;
  appointed_employee: string | null;
  verification_completed: string | null;
  undertaking_taken: string | null;
  no_objection_certificate: string | null;
  retirement_order: string | null;
  common_progress_comment: string | null;
  common_progress_date: string | null;
  government_decision_march_31_2023: string | null;
  in_file_tracking?: boolean;
  file_tracking_status?: string | null;
}

export const RetirementTracker: React.FC<RetirementTrackerProps> = ({ user, onBack }) => {
  const { t } = useTranslation();
  const { userRole, userProfile } = usePermissions(user);

  // Comprehensive state persistence system
  const STORAGE_KEYS = {
    ACTIVE_MAIN_TAB: 'retirement-tracker-active-main-tab',
    ACTIVE_TAB: 'retirement-tracker-active-tab',
    FILTERS: 'retirement-tracker-filters',
    MODAL_STATE: 'retirement-tracker-modal-state'
  };

  // Get initial main tab state
  const getInitialActiveMainTab = () => {
    try {
      const savedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_MAIN_TAB);
      if (savedTab && ['retirement', 'payCommission', 'groupInsurance'].includes(savedTab)) {
        return savedTab as 'retirement' | 'payCommission' | 'groupInsurance';
      }
    } catch (error) {
      console.warn('Failed to load active main tab from localStorage:', error);
    }
    return 'retirement';
  };

  // Get initial filter state
  const getInitialFilters = () => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return {
          searchTerm: parsed.searchTerm || '',
          selectedDepartment: parsed.selectedDepartment || '',
          selectedClerk: parsed.selectedClerk || '',
          selectedStatus: parsed.selectedStatus || '',
          activeTab: parsed.activeTab || 'inProgress',
          currentPage: parsed.currentPage || 1
        };
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
    return {
      searchTerm: '',
      selectedDepartment: '',
      selectedClerk: '',
      selectedStatus: '',
      activeTab: 'inProgress',
      currentPage: 1
    };
  };

  // Get initial modal state
  const getInitialModalState = () => {
    try {
      const savedModalState = localStorage.getItem(STORAGE_KEYS.MODAL_STATE);
      if (savedModalState) {
        const parsed = JSON.parse(savedModalState);
        return {
          showEditModal: parsed.showEditModal || false,
          showViewModal: parsed.showViewModal || false,
          editingEmployee: parsed.editingEmployee || null
        };
      }
    } catch (error) {
      console.warn('Failed to load modal state from localStorage:', error);
    }
    return {
      showEditModal: false,
      showViewModal: false,
      editingEmployee: null
    };
  };

  const initialFilters = getInitialFilters();
  const initialModalState = getInitialModalState();
  const [activeMainTab, setActiveMainTab] = useState(getInitialActiveMainTab);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClerk, setSelectedClerk] = useState(initialFilters.selectedClerk);
  const [selectedDepartment, setSelectedDepartment] = useState(initialFilters.selectedDepartment);
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.selectedStatus);
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm);
  const [showEditModal, setShowEditModal] = useState(initialModalState.showEditModal);
  const [showViewModal, setShowViewModal] = useState(initialModalState.showViewModal);
  const [editingEmployee, setEditingEmployee] = useState<RetirementProgress | null>(initialModalState.editingEmployee);
  const [viewingRecord, setViewingRecord] = useState<RetirementProgressRecord | null>(null);
  const [activeTab, setActiveTab] = useState(initialFilters.activeTab as 'inProgress' | 'pending' | 'completed');
  const [currentPage, setCurrentPage] = useState(initialFilters.currentPage);
  const recordsPerPage = 20;

  // Data states
  const [retirementProgress, setRetirementProgress] = useState<RetirementProgress[]>([]);
  const [clerks, setClerks] = useState<ClerkData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<RetirementProgress[]>([]);

  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save filters
  const saveFilters = () => {
    try {
      const filterState = {
        searchTerm,
        selectedDepartment,
        selectedClerk,
        selectedStatus,
        activeTab,
        currentPage,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filterState));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  };

  // Save active main tab
  const saveActiveMainTab = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_MAIN_TAB, activeMainTab);
    } catch (error) {
      console.warn('Failed to save active main tab to localStorage:', error);
    }
  };

  // Save modal state
  const saveModalState = (modalState: {
    showEditModal: boolean;
    showViewModal: boolean;
    editingEmployee: RetirementProgress | null;
  }) => {
    try {
      const stateWithTimestamp = {
        ...modalState,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.MODAL_STATE, JSON.stringify(stateWithTimestamp));

      // Broadcast to other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.MODAL_STATE,
        newValue: JSON.stringify(stateWithTimestamp),
        storageArea: localStorage
      }));
    } catch (error) {
      console.warn('Failed to save modal state to localStorage:', error);
    }
  };

  useEffect(() => {
    fetchAllData();

    setTimeout(() => {
      setPersistenceEnabled(true);
      setIsInitialized(true);
    }, 100);

    const handleBeforeUnload = () => {
      if (persistenceEnabled) {
        saveFilters();
        saveActiveMainTab();
        saveModalState({
          showEditModal,
          showViewModal,
          editingEmployee
        });
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.MODAL_STATE && persistenceEnabled) {
        // Only load if we're not currently in a modal to prevent resets
        if (!showEditModal && !showViewModal && !editingEmployee) {
          try {
            const saved = e.newValue;
            if (saved) {
              const state = JSON.parse(saved);
              const isRecent = Date.now() - state.timestamp < 24 * 60 * 60 * 1000; // 24 hours

              if (isRecent && (state.showEditModal || state.showViewModal || state.editingEmployee)) {
                setShowEditModal(state.showEditModal);
                setShowViewModal(state.showViewModal);
                setEditingEmployee(state.editingEmployee);
              }
            }
          } catch (error) {
            console.warn('Failed to load modal state from storage event:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveFilters();
    }
  }, [searchTerm, selectedDepartment, selectedClerk, selectedStatus, activeTab, currentPage, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveActiveMainTab();
    }
  }, [activeMainTab, isInitialized]);

  // Auto-save modal state when it changes
  useEffect(() => {
    if (isInitialized) {
      saveModalState({
        showEditModal,
        showViewModal,
        editingEmployee
      });
    }
  }, [showEditModal, showViewModal, editingEmployee, isInitialized]);

  useEffect(() => {
    filterEmployees();
  }, [retirementProgress, selectedClerk, selectedDepartment, selectedStatus, searchTerm, userRole, userProfile]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRetirementProgress(),
        fetchClerks(),
        fetchDepartments()
      ]);
    } catch (error) {
      console.error('Error fetching retirement tracker data:', error);
    } finally {
      setIsLoading(false);
    }
  };

const fetchRetirementProgress = async () => {
  try {
    const { data, error } = await ermsClient
      .from('retirement_progress')
      .select(`
        id,
        emp_id,
        employee_name,
        age,
        assigned_clerk,
        officer_assigned,
        department,
        status,
        date_of_birth_verification,
        medical_certificate,
        nomination,
        permanent_registration,
        computer_exam_passed,
        marathi_hindi_exam_exemption,
        post_service_exam,
        appointed_employee,
        validity_certificate,
        verification_completed,
        has_undertaking_been_taken_on_21_12_2021,
        no_objection_no_inquiry_certificate,
        retirement_order,
        birth_certificate_doc_submitted,
        common_progress_comment,
        common_progress_date,
        government_decision_march_31_2023,
        overall_comment,
        created_at,
        updated_at
      `)
      .order('age', { ascending: false });

    if (error) throw error;

    // 🔹 Fetch Panchayatraj Sevarth ID & Shalarth ID
    const employeeIds = data?.map(x => x.emp_id) || [];

    const { data: employeeData } = await ermsClient
      .from('employee')
      .select(`
        emp_id,
        panchayatrajsevarth_id,
        Shalarth_Id
      `)
      .in('emp_id', employeeIds);

    const employeeMap = new Map(
      (employeeData || []).map(e => [
        e.emp_id,
        {
          panchayatrajsevarth_id: e.panchayatrajsevarth_id,
          Shalarth_Id: e.Shalarth_Id
        }
      ])
    );

    // 🔥 NEW IMPORTANT FIX: Fetch correct retirement IDs from employee_retirement
    const { data: retirementLookup } = await ermsClient
      .from('employee_retirement')
      .select('emp_id, id');

    const retirementIdMap = new Map(
      (retirementLookup || []).map(r => [r.emp_id, r.id])
    );

    // 🔥 Use correct retirement IDs for tracking
    const correctRetirementIds = data?.map(emp => retirementIdMap.get(emp.emp_id)) || [];

    // Fetch file tracking status
    const { data: trackingData } = await ermsClient
      .from('retirement_file_tracking')
      .select('retirement_id, status')
      .in('retirement_id', correctRetirementIds)
      .in('status', ['assigned', 'completed']);

    const trackingMap = new Map(trackingData?.map(t => [t.retirement_id, t.status]) || []);

     // 3️⃣ Fetch officer_assigned from retirement_progress table
          const { data: progressData, error: progressError } = await ermsClient
            .from('retirement_progress')
            .select('emp_id, officer_assigned')
            .in('emp_id', employeeIds);
    
          if (progressError) throw progressError;

    // 🔥 Merge data
    const employeesWithUpdatedStatus = await Promise.all(
      (data || []).map(async (employee) => {
        const calculatedStatus = getProgressStatus(employee);

        // update status (unchanged)
        if (employee.status !== calculatedStatus) {
          try {
            const { error: updateError } = await ermsClient
              .from('retirement_progress')
              .update({ status: calculatedStatus })
              .eq('id', employee.id);

            if (updateError) {
              console.error('Error updating status for employee:', employee.emp_id, updateError);
            }
          } catch (updateError) {
            console.error('Error updating employee status:', updateError);
          }
        }

        const extraFields = employeeMap.get(employee.emp_id) || {
          panchayatrajsevarth_id: null,
          Shalarth_Id: null
        };

        // map correct retirement ID
        const retirementId = retirementIdMap.get(employee.emp_id);

        return {
          ...employee,
          status: calculatedStatus,
          in_file_tracking: trackingMap.has(retirementId),
          file_tracking_status: trackingMap.get(retirementId) || null,

          // extra IDs
          panchayatrajsevarth_id: extraFields.panchayatrajsevarth_id,
          Shalarth_Id: extraFields.Shalarth_Id
        };
      })
    );

    setRetirementProgress(employeesWithUpdatedStatus);
  } catch (error) {
    console.error('Error fetching retirement progress:', error);
  }
};

  const fetchClerks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          name,
          roles!inner(name)
        `)
        .eq('roles.name', 'clerk')
        .not('name', 'is', null);

      if (error) throw error;

      const clerksData = data?.map(clerk => ({
        user_id: clerk.user_id,
        name: clerk.name,
        role_name: clerk.roles?.name || 'clerk'
      })) || [];

      setClerks(clerksData);
    } catch (error) {
      console.error('Error fetching clerks:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await ermsClient
        .from('department')
        .select('dept_id, department')
        .order('department');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const filterEmployees = () => {debugger
    let filtered = retirementProgress;

    // Role-based filtering
    if (userRole === 'clerk' && userProfile?.name) {
      // Clerk can only see their assigned employees
      filtered = filtered.filter(emp => emp.assigned_clerk === userProfile.name);
    }

     if (userRole === 'officer') {
      filtered = filtered.filter(emp => emp.officer_assigned === user.id);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        String(emp.emp_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.panchayatrajsevarth_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.Shalarth_Id || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Clerk filter (for non-clerk users)
    if (selectedClerk && userRole !== 'clerk') {
      const selectedClerkName = clerks.find(c => c.user_id === selectedClerk)?.name;
      if (selectedClerkName) {
        filtered = filtered.filter(emp => emp.assigned_clerk === selectedClerkName);
      }
    }

    // Department filter
    if (selectedDepartment) {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(emp => getProgressStatus(emp) === selectedStatus);
    }

    setFilteredEmployees(filtered);
  };

  const getTabFilteredEmployees = () => {
    let filtered = filteredEmployees;
    if (activeTab === 'completed') {
      filtered = filtered.filter(emp => getProgressStatus(emp) === 'completed');
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(emp => getProgressStatus(emp) === 'pending');
    } else if (activeTab === 'inProgress') {
      filtered = filtered.filter(emp => getProgressStatus(emp) === 'processing');
    }

    return filtered;
  };

  const getPaginatedEmployees = () => {
    const tabFiltered = getTabFilteredEmployees();

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const ReturnedData = tabFiltered.slice(startIndex, endIndex).length != 0 ? tabFiltered.slice(startIndex, endIndex) : tabFiltered;
    return ReturnedData
  };

  const getTotalPages = () => {
    const tabFiltered = getTabFilteredEmployees();
    return Math.ceil(tabFiltered.length / recordsPerPage);
  };

  // Main tab content renderer
  const renderMainTabContent = () => {
    if (activeMainTab === 'payCommission') {
      return <PayCommission user={user} />;
    } else if (activeMainTab === 'groupInsurance') {
      return <GroupInsurance user={user} />;
    }

    // Default: Retirement Progress content
    return renderRetirementProgressContent();
  };

  const renderRetirementProgressContent = () => {
    const statusCounts = getStatusCounts();
    const paginatedEmployees = getPaginatedEmployees();
    const totalPages = getTotalPages();

    return (
      <div className="space-y-6">
        {/* Start of New changes to deploy */}
        {/* <div className="bg-white shadow-lg border-b border-gray-300 rounded-b-xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-blue-700">{t('erms.retirementDashboard')}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {userRole === 'clerk'
                    ? `${t('erms.interactiveClerkView')} - ${userProfile?.name || t('erms.unknownClerk')}`
                    : t('erms.globalAdministrativeView')}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {userRole !== 'clerk' && (
                  <select
                    value={selectedClerk}
                    onChange={(e) => setSelectedClerk(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.allClerksGlobalView')}</option>
                    {clerks.map((clerk) => (
                      <option key={clerk.user_id} value={clerk.user_id}>
                        {clerk.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={fetchAllData}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-semibold">{t('erms.refresh')}</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-sm font-semibold">{t('common.export')}</span>
                </button>
              </div>
            </div>
          </div>
        </div> */}

        <div className="rounded-b-xl shadow-inner">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md border border-indigo-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-700 font-semibold tracking-wide mb-1 uppercase">{t('retirementTracker.totalCases')}</p>
                  <p className="text-2xl font-extrabold text-indigo-900">{statusCounts.total}</p>
                </div>
                <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-orange-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-semibold tracking-wide mb-1 uppercase">{t('retirementTracker.processing')}</p>
                  <p className="text-2xl font-extrabold text-orange-800">{statusCounts.processing}</p>
                </div>
                <div className="bg-gradient-to-tr from-orange-500 to-yellow-500 p-3 rounded-2xl shadow-md">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-green-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-semibold tracking-wide mb-1 uppercase">{t('retirementTracker.completed')}</p>
                  <p className="text-2xl font-extrabold text-green-900">{statusCounts.completed}</p>
                </div>
                <div className="bg-gradient-to-tr from-green-500 to-teal-500 p-3 rounded-2xl shadow-md">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-purple-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-semibold tracking-wide mb-1 uppercase">{t('retirementTracker.pending')}</p>
                  <p className="text-2xl font-extrabold text-purple-600">{statusCounts.pending}</p>
                </div>
                <div className="bg-gradient-to-tr from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-md">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Records Table */}
          <div className="bg-white rounded-lg shadow-md border border-gray-300">
            <div className="px-6 py-4 border-b border-gray-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('retirementTracker.progressRecords')}</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchAllData}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-sm font-semibold">{t('erms.refresh')}</span>
                  </button>
                  <button
  onClick={() => {
    const data = getTabFilteredEmployees(); // 👈 export filtered table data (UI only)

    if (!data || data.length === 0) {
      alert("No data available to export");
      return;
    }

    // Export ONLY UI-side table columns
    const uiColumns = [
      "Shalarth_Id",
      "panchayatrajsevarth_id",
      "emp_id",
      "employee_name",
      "status",
      "date_of_birth_verification",
      "birth_certificate_doc_submitted",
      "medical_certificate",
      "nomination",
      "permanent_registration",
      "computer_exam_passed",
      "marathi_hindi_exam_exemption",
      "post_service_exam",
      "appointed_employee",
      "validity_certificate",
      "verification_completed",
      "has_undertaking_been_taken_on_21_12_2021",
      "no_objection_no_inquiry_certificate",
      "retirement_order",
    ];

    const headers = uiColumns.join(",");

    const rows = data.map(row =>
      uiColumns
        .map(key => {
          let value = row[key];

          // Format date same as UI
          if (key === "retirement_date" && value) {
            value = new Date(value).toLocaleDateString();
          }

          return `"${value !== null && value !== undefined ? value : ''}"`;
        })
        .join(",")
    );

    const csvContent = [headers, ...rows].join("\n");

    // Download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "retirement_progress_ui_table.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }}
  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
>
  <Download className="h-4 w-4" />
  <span className="text-sm font-semibold">{t('common.export')}</span>
</button>

                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('retirementTracker.searchEmployees')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('retirementTracker.allDepartments')}</option>
                  {departments.map((dept) => (
                    <option key={dept.dept_id} value={dept.department}>
                      {dept.department}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('retirementTracker.allStatus')}</option>
                  <option value="pending">{t('retirementTracker.pending')}</option>
                  <option value="processing">{t('retirementTracker.inProgress')}</option>
                  <option value="completed">{t('retirementTracker.completed')}</option>
                </select>

                {userRole !== 'clerk' && (
                  <select
                    value={selectedClerk}
                    onChange={(e) => setSelectedClerk(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('retirementTracker.allClerks')}</option>
                    {clerks.map((clerk) => (
                      <option key={clerk.user_id} value={clerk.user_id}>
                        {clerk.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                >
                  <X className="h-4 w-4" />
                  <span className="text-sm font-semibold">{t('retirementTracker.clearFilters')}</span>
                </button>
              </div>

              {/* Sub Tabs for Retirement Progress */}
              <div className="mt-4">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('inProgress')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'inProgress'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {t('retirementTracker.inProgress')} ({statusCounts.processing})
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {t('retirementTracker.pending')} ({statusCounts.pending})
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'completed'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {t('retirementTracker.completed')} ({statusCounts.completed})
                  </button>
                </nav>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50 border-b border-blue-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.shalarthId')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.sevarthId')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.employee')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.dateOfBirthVerification')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.birthDocumentSubmitted')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.medicalCertificate')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.nomination')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.permanentRegistration')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.computerExamPassed')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.marathiHindiExamExemption')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.postServiceExam')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.appointedEmployee')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.validityCertificate')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.verificationCompleted')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.undertakingTaken')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.noObjectionCertificate')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.retirementOrder')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('retirementTracker.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-6 py-8 text-center text-gray-500">
                        {isLoading ? t('retirementTracker.loadingData') : t('retirementTracker.noRecordsFound')}
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((employee) => {
                      const status = getProgressStatus(employee);
                      return (
                        <tr
                          key={employee.id}
                          className={`hover:bg-blue-50 ${employee.file_tracking_status === 'completed'
                            ? 'bg-green-50 border-l-4 border-green-400'
                            : employee.in_file_tracking
                              ? 'bg-yellow-50 border-l-4 border-yellow-400'
                              : ''
                            }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-500">{employee.Shalarth_Id || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-500">{employee.panchayatrajsevarth_id || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                              <div className="text-sm text-gray-500">{employee.emp_id}</div>
                              <div className="text-xs text-gray-400">{t('retirementTracker.age')}: {employee.age || '-'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : status === 'processing'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {getStatusIcon(status)}
                              <span className="ml-1">{t(`retirementTracker.${status}`)}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.date_of_birth_verification || ''}>{getStatusIcon(employee.date_of_birth_verification)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.birth_certificate_doc_submitted || ''}>{getStatusIcon(employee.birth_certificate_doc_submitted)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.medical_certificate || ''}>{getStatusIcon(employee.medical_certificate)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.nomination || ''}>{getStatusIcon(employee.nomination)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.permanent_registration || ''}>{getStatusIcon(employee.permanent_registration)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.computer_exam_passed || ''}>{getStatusIcon(employee.computer_exam_passed)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.marathi_hindi_exam_exemption || ''}>{getStatusIcon(employee.marathi_hindi_exam_exemption)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.post_service_exam || ''}>{getStatusIcon(employee.post_service_exam)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.appointed_employee || ''}>{getStatusIcon(employee.appointed_employee)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.validity_certificate || ''}>{getStatusIcon(employee.validity_certificate)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.verification_completed || ''}>{getStatusIcon(employee.verification_completed)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.has_undertaking_been_taken_on_21_12_2021 || ''}>{getStatusIcon(employee.has_undertaking_been_taken_on_21_12_2021)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.no_objection_no_inquiry_certificate || ''}>{getStatusIcon(employee.no_objection_no_inquiry_certificate)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" title={employee.retirement_order || ''}>{getStatusIcon(employee.retirement_order)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditEmployee(employee)}
                                className="text-green-600 hover:text-green-900 p-1 rounded"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* End of New changes to deploy */}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {t('retirementTracker.showingPage', {
                    start: (currentPage - 1) * recordsPerPage + 1,
                    end: Math.min(currentPage * recordsPerPage, getTabFilteredEmployees().length),
                    total: getTabFilteredEmployees().length
                  })}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md ${currentPage === pageNum
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && editingEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{t('retirementTracker.editProgressDetails')}</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Basic Employee Info (Read-only) */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">{t('retirementTracker.basicEmployeeInfo')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.employeeId')}</label>
                      <input
                        type="text"
                        value={editingEmployee.emp_id}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.employeeName')}</label>
                      <input
                        type="text"
                        value={editingEmployee.employee_name}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.age')}</label>
                      <input
                        type="text"
                        value={editingEmployee.age || '-'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Progress Fields */}
                <div className="space-y-6">
                  <h4 className="text-md font-semibold text-gray-800">{t('retirementTracker.progressFields')}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.dateOfBirthVerification')}</label>
                      <select
                        value={editingEmployee.date_of_birth_verification || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_birth_verification: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.birthDocumentSubmitted')}</label>
                      <select
                        value={editingEmployee.birth_certificate_doc_submitted || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, birth_certificate_doc_submitted: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="Birth Certificate">Birth Certificate</option>
                        <option value="Passport">Passport</option>
                        <option value="Transfer Certificate">Transfer Certificate</option>
                        <option value="Leaving Certificate">Leaving Certificate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.medicalCertificate')}</label>
                      <select
                        value={editingEmployee.medical_certificate || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, medical_certificate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.nomination')}</label>
                      <select
                        value={editingEmployee.nomination || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, nomination: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.permanentRegistration')}</label>
                      <select
                        value={editingEmployee.permanent_registration || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, permanent_registration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.computerExamPassed')}</label>
                      <select
                        value={editingEmployee.computer_exam_passed || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, computer_exam_passed: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.marathiHindiExamExemption')}</label>
                      <select
                        value={editingEmployee.marathi_hindi_exam_exemption || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, marathi_hindi_exam_exemption: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.postServiceExam')}</label>
                      <select
                        value={editingEmployee.post_service_exam || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, post_service_exam: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.validityCertificate')}</label>
                      <select
                        value={editingEmployee.validity_certificate || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, validity_certificate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>


                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.appointedEmployee')}</label>
                      <select
                        value={editingEmployee.appointed_employee || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, appointed_employee: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.verificationCompleted')}</label>
                      <select
                        value={editingEmployee.verification_completed || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, verification_completed: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.undertakingTaken')}</label>
                      <select
                        value={editingEmployee.has_undertaking_been_taken_on_21_12_2021 || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, has_undertaking_been_taken_on_21_12_2021: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.noObjectionCertificate')}</label>
                      <select
                        value={editingEmployee.no_objection_no_inquiry_certificate || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, no_objection_no_inquiry_certificate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.retirementOrder')}</label>
                      <select
                        value={editingEmployee.retirement_order || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, retirement_order: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      >
                        <option value="">{t('retirementTracker.selectStatus')}</option>
                        <option value="आहे (Available)">आहे (Available)</option>
                        <option value="नाही (Not Available)">नाही (Not Available)</option>
                        <option value="लागू नाही (Not Applicable)">लागू नाही (Not Applicable)</option>
                        <option value="सुट आहे (Exempted)">सुट आहे (Exempted)</option>
                        <option value="इतर (Other)">इतर (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.date')}</label>
                      <input
                        type="date"
                        value={editingEmployee.common_progress_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, common_progress_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.comment')}</label>
                      <textarea
                        value={editingEmployee.common_progress_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, common_progress_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={1}
                        placeholder={t('common.comment')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.governmentDecisionMarch2023')}</label>
                      <div className="space-y-2">
                        <p className="text-sm text-blue-600 font-medium">
                          {t('erms.governmentDecisionCompliance')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {t('erms.employeesHiredAfterNov2005')}
                        </p>
                        <select
                          value={editingEmployee.government_decision_march_31_2023 || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, government_decision_march_31_2023: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{t('erms.selectStatus')}</option>
                          <option value="Available">{t('erms.available')}</option>
                          <option value="Not Available">{t('erms.notAvailable')}</option>
                          <option value="Exempted">{t('erms.exempted')}</option>
                          <option value="Not Applicable">{t('erms.notApplicable')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleUpdateEmployee}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  {isLoading ? t('common.saving') : t('common.update')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && viewingRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">View Retirement Progress Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Employee Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-blue-800 mb-3">{t('retirementTracker.basicEmployeeInfo')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">{t('retirementTracker.employeeId')}</label>
                      <div className="text-sm text-gray-900">{viewingRecord.emp_id}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">{t('retirementTracker.employeeName')}</label>
                      <div className="text-sm text-gray-900">{viewingRecord.employee_name}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">{t('retirementTracker.age')}</label>
                      <div className="text-sm text-gray-900">{viewingRecord.age || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">{t('retirementTracker.department')}</label>
                      <div className="text-sm text-gray-900">{viewingRecord.department || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">{t('retirementTracker.designation')}</label>
                      <div className="text-sm text-gray-900">{viewingRecord.designation || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">{t('retirementTracker.assignedClerk')}</label>
                      <div className="text-sm text-gray-900">{viewingRecord.assigned_clerk || t('erms.unassigned')}</div>
                    </div>
                  </div>
                </div>

                {/* Progress Fields */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-green-800 mb-3">{t('retirementTracker.progressFields')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.birth_certificate_submitted ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.birth_certificate_submitted ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.birthCertificateSubmitted')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.birth_doc_submitted ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.birth_doc_submitted ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.birthDocumentSubmitted')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.medical_certificate ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.medical_certificate ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.medicalCertificate')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.nomination ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.nomination ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.nomination')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.permanent_registration ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.permanent_registration ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.permanentRegistration')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.computer_exam_passed ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.computer_exam_passed ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.computerExamPassed')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.marathi_hindi_exam_exemption ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.marathi_hindi_exam_exemption ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.marathiHindiExamExemption')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.date_of_birth_verification ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.date_of_birth_verification ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.dateOfBirthVerification')}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.validity_certificate ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.validity_certificate ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.validityCertificate')}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.appointed_employee ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.appointed_employee ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.appointedEmployee')}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.verification_completed ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.verification_completed ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.verificationCompleted')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.undertaking_taken ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.undertaking_taken ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.undertakingTaken')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.no_objection_certificate ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.no_objection_certificate ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.noObjectionCertificate')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${viewingRecord.retirement_order ? 'text-green-600' : 'text-gray-400'}`}>
                        {viewingRecord.retirement_order ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-gray-700">{t('retirementTracker.retirementOrder')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-yellow-800 mb-3">{t('retirementTracker.commonProgress')}</h4>
                  {viewingRecord.common_progress_date && (
                    <div className="text-sm text-yellow-900 mb-1">
                      <strong>{t('retirementTracker.date')}:</strong> {viewingRecord.common_progress_date}
                    </div>
                  )}
                  {viewingRecord.common_progress_comment && (
                    <div className="text-sm text-yellow-900 whitespace-pre-wrap">
                      <strong>{t('retirementTracker.comment')}:</strong> {viewingRecord.common_progress_comment}
                    </div>
                  )}
                </div>

                {/* Government Decision */}
                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                  <h4 className="text-md font-semibold text-purple-800 mb-3">{t('erms.governmentDecisionMarch2023')}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.governmentDecisionCompliance')}</label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                        {viewingRecord.government_decision_march_31_2023 || '-'}
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
                      {t('erms.employeesHiredAfterNov2005')}
                    </div>
                  </div>
                </div>

                {/* Progress Summary */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-purple-800 mb-3">Progress Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">Completion Percentage</label>
                      <div className="text-lg font-semibold text-purple-900">
                        {(() => {
                          const fields = [
                            viewingRecord.birth_certificate_submitted,
                            viewingRecord.birth_doc_submitted,
                            viewingRecord.medical_certificate,
                            viewingRecord.nomination,
                            viewingRecord.permanent_registration,
                            viewingRecord.computer_exam_passed,
                            viewingRecord.marathi_hindi_exam_exemption,
                            viewingRecord.date_of_birth_verification,
                            viewingRecord.appointed_employee,
                            viewingRecord.validity_certificate,
                            viewingRecord.verification_completed,
                            viewingRecord.undertaking_taken,
                            viewingRecord.no_objection_certificate,
                            viewingRecord.retirement_order
                          ];
                          const completed = fields.filter(field => field === 'आहे' || field === 'होय' || field === 'Yes').length;
                          return Math.round((completed / fields.length) * 100);
                        })()}%
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">Current Status</label>
                      <div className="text-sm text-purple-900">
                        {(() => {
                          const fields = [
                            viewingRecord.birth_certificate_submitted,
                            viewingRecord.birth_doc_submitted,
                            viewingRecord.medical_certificate,
                            viewingRecord.nomination,
                            viewingRecord.permanent_registration,
                            viewingRecord.computer_exam_passed,
                            viewingRecord.marathi_hindi_exam_exemption,
                            viewingRecord.date_of_birth_verification,
                            viewingRecord.appointed_employee,
                            viewingRecord.validity_certificate,
                            viewingRecord.verification_completed,
                            viewingRecord.undertaking_taken,
                            viewingRecord.no_objection_certificate,
                            viewingRecord.retirement_order,
                            viewingRecord.government_decision_march_31_2023
                          ];
                          const completed = fields.filter(field => field === 'आहे' || field === 'होय' || field === 'Yes').length;
                          if (completed === 0) return t('retirementTracker.pending');
                          if (completed === fields.length) return t('retirementTracker.completed');
                          return t('retirementTracker.inProgress');
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">Fields Completed</label>
                      <div className="text-sm text-purple-900">
                        {(() => {
                          const fields = [
                            viewingRecord.birth_certificate_submitted,
                            viewingRecord.birth_doc_submitted,
                            viewingRecord.medical_certificate,
                            viewingRecord.nomination,
                            viewingRecord.permanent_registration,
                            viewingRecord.computer_exam_passed,
                            viewingRecord.marathi_hindi_exam_exemption,
                            viewingRecord.date_of_birth_verification,
                            viewingRecord.appointed_employee,
                            viewingRecord.validity_certificate,
                            viewingRecord.verification_completed,
                            viewingRecord.undertaking_taken,
                            viewingRecord.no_objection_certificate,
                            viewingRecord.retirement_order,
                            viewingRecord.government_decision_march_31_2023
                          ];
                          const completed = fields.filter(field => field === 'आहे' || field === 'होय' || field === 'Yes').length;
                          return `${completed} / ${fields.length}`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setEditingRecord(viewingRecord);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
                >
                  <Edit className="h-4 w-4 inline mr-2" />
                  Edit Record
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getProgressStatus = (employee: RetirementProgress) => {
    const progressFields = [
      employee.date_of_birth_verification,
      employee.medical_certificate,
      employee.nomination,
      employee.permanent_registration,
      employee.computer_exam_passed,
      employee.marathi_hindi_exam_exemption,
      employee.post_service_exam,
      employee.appointed_employee,
      employee.validity_certificate,
      employee.verification_completed,
      employee.has_undertaking_been_taken_on_21_12_2021,
      employee.no_objection_no_inquiry_certificate,
      employee.retirement_order
    ];

    const selectedFields = progressFields.filter(field => field && field.trim() !== '');
    if (selectedFields.length === 0) return 'pending';

    const hasNotAvailableWithEmptyDoc =
      employee.date_of_birth_verification === 'नाही (Not Available)' &&
      (!employee.birth_certificate_doc_submitted || employee.birth_certificate_doc_submitted.trim() === '');

    if (hasNotAvailableWithEmptyDoc) return 'processing';

    const allSelectedHaveOtherValue = selectedFields.every(field => field !== 'नाही (Not Available)');
    if (allSelectedHaveOtherValue) return 'completed';

    return 'processing';
  };

  const getStatusCounts = () => {
    const total = filteredEmployees.length;
    const processing = filteredEmployees.filter(emp => getProgressStatus(emp) === 'processing').length;
    const completed = filteredEmployees.filter(emp => getProgressStatus(emp) === 'completed').length;
    const pending = filteredEmployees.filter(emp => getProgressStatus(emp) === 'pending').length;

    return { total, processing, completed, pending };
  };

  const handleEditEmployee = async (employee: RetirementProgress) => {
    // Check if file is in tracking
    if (employee.in_file_tracking) {
      const { data: trackingData } = await ermsClient
        .from('retirement_file_tracking')
        .select('assigned_to_user_id')
        .eq('retirement_id', employee.id)
        .eq('status', 'assigned')
        .maybeSingle();

      if (trackingData && trackingData.assigned_to_user_id !== user.id) {
        alert('This file is in tracking and can only be edited by the assigned person.');
        return;
      }
    }

    setEditingEmployee(employee);
    setShowEditModal(true);
  };

  const handleViewRecord = (record: RetirementProgressRecord) => {
    setViewingRecord(record);
    setShowViewModal(true);
  };

  const handleEditRecord = async (record: RetirementProgressRecord) => {
    // Check if file is in tracking
    if (record.in_file_tracking) {
      const { data: trackingData } = await ermsClient
        .from('retirement_file_tracking')
        .select('assigned_to_user_id')
        .eq('retirement_id', record.id)
        .eq('status', 'assigned')
        .maybeSingle();

      if (trackingData && trackingData.assigned_to_user_id !== user.id) {
        alert('This file is in tracking and can only be edited by the assigned person.');
        return;
      }
    }

    // Convert Record to Employee for editing
    // Convert RetirementProgressRecord to RetirementProgress for editing
    const employee: RetirementProgress = {
      id: record.id,
      emp_id: record.emp_id,
      employee_name: record.employee_name,
      age: record.age,
      assigned_clerk: record.assigned_clerk,
      department: record.department,
      status: null,
      date_of_birth_verification: record.date_of_birth_verification,
      medical_certificate: record.medical_certificate,
      nomination: record.nomination,
      permanent_registration: record.permanent_registration,
      computer_exam_passed: record.computer_exam_passed,
      marathi_hindi_exam_exemption: record.marathi_hindi_exam_exemption,
      post_service_exam: record.post_service_exam,
      appointed_employee: record.appointed_employee,
      validity_certificate: record.validity_certificate,
      verification_completed: record.verification_completed,
      has_undertaking_been_taken_on_21_12_2021: record.undertaking_taken,
      no_objection_no_inquiry_certificate: record.no_objection_certificate,
      retirement_order: record.retirement_order,
      birth_certificate_doc_submitted: record.birth_doc_submitted,
      common_progress_comment: record.common_progress_comment,
      common_progress_date: record.common_progress_date,
      government_decision_march_31_2023: record.government_decision_march_31_2023,
    };

    setEditingEmployee(employee);
    setShowEditModal(true);
    setShowViewModal(false);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    setIsLoading(true);
    try {
      // Calculate the new status based on the updated data
      const newStatus = getProgressStatus(editingEmployee);

      const { error: progressError } = await ermsClient
        .from('retirement_progress')
        .update({
          assigned_clerk: editingEmployee.assigned_clerk,
          department: editingEmployee.department,
          status: newStatus,
          date_of_birth_verification: editingEmployee.date_of_birth_verification,
          medical_certificate: editingEmployee.medical_certificate,
          nomination: editingEmployee.nomination,
          permanent_registration: editingEmployee.permanent_registration,
          computer_exam_passed: editingEmployee.computer_exam_passed,
          marathi_hindi_exam_exemption: editingEmployee.marathi_hindi_exam_exemption,
          post_service_exam: editingEmployee.post_service_exam,
          appointed_employee: editingEmployee.appointed_employee,
          validity_certificate: editingEmployee.validity_certificate,
          verification_completed: editingEmployee.verification_completed,
          has_undertaking_been_taken_on_21_12_2021: editingEmployee.has_undertaking_been_taken_on_21_12_2021,
          no_objection_no_inquiry_certificate: editingEmployee.no_objection_no_inquiry_certificate,
          retirement_order: editingEmployee.retirement_order,
          birth_certificate_doc_submitted: editingEmployee.birth_certificate_doc_submitted,
          common_progress_comment: editingEmployee.common_progress_comment,
          common_progress_date: editingEmployee.common_progress_date,
          government_decision_march_31_2023: editingEmployee.government_decision_march_31_2023,
        })
        .eq('id', editingEmployee.id);

      const { error: employeeError } = await ermsClient
        .from('employee_retirement')
        .update({
          retirement_progress_status: newStatus,
        })
        .eq('emp_id', editingEmployee.emp_id);

      // Handle errors from any call
      if (progressError || employeeError) throw progressError || employeeError;

      await fetchRetirementProgress();
      setShowEditModal(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(t('common.error') + ': ' + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    if (!status || status.trim() === '') {
      return <span className="text-gray-400 text-lg">○</span>;
    }

    if (status === 'आहे (Available)' || status === 'होय (Yes)' || status === 'पूर्ण (Complete)') {
      return <span className="text-green-600 text-lg">✓</span>;
    }

    if (status === 'नाही (Not Available)') {
      return <span className="text-red-600 text-lg">✗</span>;
    }

    if (status === 'लागू नाही (Not Applicable)') {
      return <span className="text-blue-600 text-lg">△</span>;
    }

    if (status === 'सुट आहे (Exempted)') {
      return <span className="text-purple-600 text-lg">◊</span>;
    }

    if (status === 'इतर (Other)') {
      return <span className="text-orange-600 text-lg">◈</span>;
    }

    return <span className="text-orange-500 text-lg">◐</span>;
  };

  const getFieldIcon = (field: string | null) => {
    if (!field || field.trim() === '') return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getVerificationOptions = () => [
    { value: 'आहे (Available)', label: 'आहे (Available)' },
    { value: 'नाही (Not Available)', label: 'नाही (Not Available)' },
    { value: 'लागू नाही (Not Applicable)', label: 'लागू नाही (Not Applicable)' },
    { value: 'सुट आहे (Exempted)', label: 'सुट आहे (Exempted)' }
  ];

  const getProgressPercentage = (record: RetirementProgressRecord) => {
    const fields = [
      record.birth_certificate,
      record.birth_doc_submitted,
      record.medical_certificate,
      record.nomination,
      record.permanent_registration,
      record.computer_exam,
      record.language_exam,
      record.post_service_exam,
      record.verification,
      record.date_of_birth_verification,
      record.computer_exam_passed,
      record.marathi_hindi_exam_exemption,
      record.appointed_employee,
      record.verification_completed,
      record.undertaking_taken,
      record.no_objection_certificate,
      record.retirement_order,
      record.validity_certificate
    ];

    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const getCompletedFieldsCount = (record: RetirementProgressRecord) => {
    const fields = [
      record.birth_certificate,
      record.birth_doc_submitted,
      record.medical_certificate,
      record.nomination,
      record.permanent_registration,
      record.computer_exam,
      record.language_exam,
      record.post_service_exam,
      record.verification,
      record.date_of_birth_verification,
      record.computer_exam_passed,
      record.marathi_hindi_exam_exemption,
      record.appointed_employee,
      record.verification_completed,
      record.undertaking_taken,
      record.no_objection_certificate,
      record.retirement_order,
      record.validity_certificate
    ];

    return fields.filter(field => field && field.trim() !== '').length;
  };

  const getTotalFieldsCount = () => {
    return 16; // Total number of progress fields
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClerk('');
    setSelectedDepartment('');
    setSelectedStatus('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-300 rounded-b-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-blue-700 tracking-wide">{t('retirementTracker.title')}</h1>
              <p className="text-sm text-gray-600 mt-1 font-medium tracking-wide">{t('retirementTracker.subtitle')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchAllData}
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg shadow-md border border-transparent hover:border-indigo-300 transition-all duration-300"
              >
                <RefreshCw className="h-5 w-5" />
                <span className="text-sm font-semibold">{t('erms.refresh')}</span>
              </button>
            </div>
          </div>

          {/* Start of New changes to deploy */}
          {/* Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-10 max-w-max">
              <button
                onClick={() => setActiveMainTab('retirement')}
                className={`relative py-2 px-4 font-semibold text-base transition-colors duration-300 rounded-t-md ${activeMainTab === 'retirement'
                  ? 'text-blue-700 border-b-4 border-blue-700 bg-indigo-50 shadow-sm'
                  : 'text-gray-500 hover:text-blue-700'
                  }`}
                style={{ borderTop: 'none' }}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>{t('retirementTracker.retirementProgress')}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveMainTab('payCommission')}
                className={`relative py-2 px-4 font-semibold text-base transition-colors duration-300 rounded-t-md ${activeMainTab === 'payCommission'
                  ? 'text-indigo-700 border-b-4 border-blue-700 bg-indigo-50 shadow-sm'
                  : 'text-gray-500 hover:text-indigo-700'
                  }`}
                style={{ borderTop: 'none' }}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>{t('retirementTracker.payCommission')}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveMainTab('groupInsurance')}
                className={`relative py-2 px-4 font-semibold text-base transition-colors duration-300 rounded-t-md ${activeMainTab === 'groupInsurance'
                  ? 'text-blue-700 border-b-4 border-blue-700 bg-indigo-50 shadow-sm'
                  : 'text-gray-500 hover:text-blue-700'
                  }`}
                style={{ borderTop: 'none' }}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{t('retirementTracker.groupInsurance')}</span>
                </div>
              </button>
            </nav>
          </div>
        </div>
      </div>
      {/* End of New changes to deploy */}

      {/* Main Tabs with bottom border only */}
      <div className="p-6 mb-6">

        {/* Tab Content */}
        {renderMainTabContent()}

        {/* View Modal */}
        {showViewModal && viewingRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('retirementTracker.viewProgressDetails', 'View Progress Details')}
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEditRecord(viewingRecord);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Employee Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-blue-800 mb-3">{t('retirementTracker.basicEmployeeInfo')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.employeeId')}</label>
                      <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded border">{viewingRecord.emp_id}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.employeeName')}</label>
                      <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded border">{viewingRecord.employee_name}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.age')}</label>
                      <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded border">{viewingRecord.age || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.department')}</label>
                      <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded border">{viewingRecord.department || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.designation')}</label>
                      <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded border">{viewingRecord.designation || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.assignedClerk')}</label>
                      <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded border">{viewingRecord.assigned_clerk || t('erms.unassigned')}</div>
                    </div>
                  </div>
                </div>

                {/* Progress Fields */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-green-800 mb-3">{t('retirementTracker.progressFields')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.birthCertificate')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.birth_certificate ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.birth_certificate ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.birth_certificate || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.birthDocSubmitted')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.birth_doc_submitted ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.birth_doc_submitted ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.birth_doc_submitted || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.medicalCertificate')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.medical_certificate ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.medical_certificate ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.medical_certificate || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.nomination')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.nomination ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.nomination ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.nomination || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.permanentRegistration')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.permanent_registration ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.permanent_registration ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.permanent_registration || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.computerExam')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.computer_exam ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.computer_exam ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.computer_exam || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.languageExam')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.language_exam ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.language_exam ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.language_exam || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.postServiceExam')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.post_service_exam ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.post_service_exam ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.post_service_exam || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.verification')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.verification ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.verification ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.verification || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.dateOfBirthVerification')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.date_of_birth_verification ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.date_of_birth_verification ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.date_of_birth_verification || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.computerExamPassed')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.computer_exam_passed ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.computer_exam_passed ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.computer_exam_passed || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.marathiHindiExamExemption')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.marathi_hindi_exam_exemption ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.marathi_hindi_exam_exemption ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.marathi_hindi_exam_exemption || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.validityCertificate')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.validity_certificate ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.validity_certificate ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.validity_certificate || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.appointedEmployee')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.appointed_employee ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.appointed_employee ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.appointed_employee || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.verificationCompleted')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.verification_completed ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.verification_completed ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.verification_completed || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.undertakingTaken')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.undertaking_taken ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.undertaking_taken ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.undertaking_taken || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.noObjectionCertificate')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.no_objection_certificate ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.no_objection_certificate ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.no_objection_certificate || 'Not completed'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.retirementOrder')}</label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${viewingRecord.retirement_order ? 'text-green-600' : 'text-gray-400'}`}>
                          {viewingRecord.retirement_order ? '✓' : '○'}
                        </span>
                        <span className="text-sm text-gray-900">{viewingRecord.retirement_order || 'Not completed'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Summary */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-purple-800 mb-3">Progress Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Completion Percentage</label>
                      <div className="text-lg font-bold text-purple-600">{getProgressPercentage(viewingRecord)}%</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProgressStatus(viewingRecord) === 'completed' ? 'bg-green-100 text-green-800' :
                        getProgressStatus(viewingRecord) === 'processing' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {getProgressStatus(viewingRecord) === 'completed' ? t('retirementTracker.completed') :
                          getProgressStatus(viewingRecord) === 'processing' ? t('retirementTracker.inProgress') :
                            t('retirementTracker.pending')}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fields Completed</label>
                      <div className="text-lg font-bold text-purple-600">
                        {getCompletedFieldsCount(viewingRecord)} / {getTotalFieldsCount()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};