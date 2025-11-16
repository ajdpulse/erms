import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

interface GroupInsuranceProps {
  user: SupabaseUser;
}

interface GroupInsuranceRecord {
  id: string;
  emp_id: string;
  employee_name: string;
  retirement_date: string | null;
  assigned_clerk: string | null;
  department: string | null;
  age: number | null;
  year_1990: string | null;
  year_2003: string | null;
  year_2010: string | null;
  year_2020: string | null;
  overall_comments: string | null;
  last_updated: string | null;
  created_at?: string;
  updated_at?: string;
  year_1990_comment: string | null;
  year_2003_comment: string | null;
  year_2010_comment: string | null;
  year_2020_comment: string | null;
  year_1990_date: string | null;
  year_2003_date: string | null;
  year_2010_date: string | null;
  year_2020_date: string | null;
  status?: string; // Added for potential status field, though not in original select
}

interface ClerkData {
  user_id: string;
  name: string;
  role_name: string;
}

export const GroupInsurance: React.FC<GroupInsuranceProps> = ({ user }) => {
  const { t } = useTranslation();
  const { userRole, userProfile } = usePermissions(user);

  // Comprehensive state persistence system
  const STORAGE_KEYS = {
    FILTERS: 'group-insurance-filters',
    ACTIVE_TAB: 'group-insurance-active-tab',
    MODAL_STATE: 'group-insurance-modal-state',
    PAGINATION: 'group-insurance-pagination'
  };

  // Get initial state from localStorage
  const getInitialState = () => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      const savedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
      const savedPagination = localStorage.getItem(STORAGE_KEYS.PAGINATION);

      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return {
          searchTerm: parsed.searchTerm || '',
          selectedDepartment: parsed.selectedDepartment || '',
          selectedClerk: parsed.selectedClerk || '',
          selectedStatus: parsed.selectedStatus || '',
          activeTab: savedTab || 'inProgress',
          currentPage: savedPagination ? JSON.parse(savedPagination).currentPage : 1
        };
      }
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
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

  const initialState = getInitialState();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClerk, setSelectedClerk] = useState(initialState.selectedClerk);
  const [selectedDepartment, setSelectedDepartment] = useState(initialState.selectedDepartment);
  const [selectedStatus, setSelectedStatus] = useState(initialState.selectedStatus);
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GroupInsuranceRecord | null>(null);
  const [activeTab, setActiveTab] = useState(initialState.activeTab as 'inProgress' | 'pending' | 'completed');
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const recordsPerPage = 20;

  // Data states
  const [groupInsuranceRecords, setGroupInsuranceRecords] = useState<GroupInsuranceRecord[]>([]);
  const [clerks, setClerks] = useState<ClerkData[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<GroupInsuranceRecord[]>([]);

  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save state
  const saveState = () => {
    try {
      const filterState = {
        searchTerm,
        selectedDepartment,
        selectedClerk,
        selectedStatus,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filterState));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeTab);
      localStorage.setItem(STORAGE_KEYS.PAGINATION, JSON.stringify({ currentPage, timestamp: Date.now() }));
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
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
        saveState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Load modal state (if any) when component initializes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODAL_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.showEditModal && parsed.editingRecord) {
          setEditingRecord(parsed.editingRecord);
          setShowEditModal(true);
        }
      }
    } catch (error) {
      // ignore
    }
  }, []);

  // Save modal state when it changes (after initialization)
  const saveModalState = (modalState: { showEditModal: boolean; editingRecord: GroupInsuranceRecord | null }) => {
    try {
      const stateWithTimestamp = { ...modalState, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEYS.MODAL_STATE, JSON.stringify(stateWithTimestamp));
    } catch (error) {
      // ignore
    }
  };

  useEffect(() => {
    if (isInitialized) {
      saveModalState({ showEditModal, editingRecord });
    }
  }, [showEditModal, editingRecord, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveState();
    }
  }, [searchTerm, selectedDepartment, selectedClerk, selectedStatus, activeTab, currentPage, isInitialized]);

  useEffect(() => {
    filterRecords();
  }, [groupInsuranceRecords, selectedClerk, selectedDepartment, selectedStatus, searchTerm, userRole, userProfile]);

  // New useEffect for tab switch reset
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // New useEffect for clamping currentPage
  useEffect(() => {
    const totalPages = getTotalPages();
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredRecords, activeTab, currentPage]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchGroupInsuranceRecords(),
        fetchClerks(),
        fetchDepartments()
      ]);
    } catch (error) {
      console.error('Error fetching group insurance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupInsuranceRecords = async () => {
    try {
      const { data, error } = await ermsClient
        .from('group_insurance')
        .select(`
          id,
          emp_id,
          employee_name,
          retirement_date,
          assigned_clerk,
          department,
          age,
          year_1990,
          year_2003,
          year_2010,
          year_2020,
          overall_comments,
          last_updated,
          created_at,
          updated_at,
          year_1990_comment,
          year_2003_comment,
          year_2010_comment,
          year_2020_comment,
          year_1990_date,
          year_2003_date,
          year_2010_date,
          year_2020_date
        `)
        .order('employee_name');

      if (error) throw error;

      setGroupInsuranceRecords(data || []);
    } catch (error) {
      console.error('Error fetching group insurance records:', error);
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
      const uniqueDepartments = [...new Set(groupInsuranceRecords.map(record => record.department).filter(Boolean))];
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const filterRecords = () => {
    let filtered = groupInsuranceRecords;

    // Role-based filtering
    if (userRole === 'clerk' && userProfile?.name) {
      filtered = filtered.filter(record => record.assigned_clerk === userProfile.name);
    }

    // Clerk filter (for non-clerk users)
    if (selectedClerk && userRole !== 'clerk') {
      const selectedClerkName = clerks.find(c => c.user_id === selectedClerk)?.name;
      if (selectedClerkName) {
        filtered = filtered.filter(record => record.assigned_clerk === selectedClerkName);
      }
    }

    // Department filter
    if (selectedDepartment) {
      filtered = filtered.filter(record => record.department === selectedDepartment);
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        String(record.emp_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(record.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(record.department || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }


    setFilteredRecords(filtered);
  };

  const getStatusIcon = (status: string | null) => {
    if (!status || status.trim() === '') {
      return <span className="text-gray-400 text-lg">○</span>;
    }

    const v = status.trim();

    if (v === 'आहे' || v === 'आहे (Available)' || v === 'होय (Yes)' || v === 'पूर्ण (Complete)') {
      return <span className="text-green-600 text-lg">✓</span>;
    }

    if (v === 'नाही' || v === 'नाही (Not Available)') {
      return <span className="text-red-600 text-lg">✗</span>;
    }

    if (v === 'लागू नाही' || v === 'लागू नाही (Not Applicable)') {
      return <span className="text-blue-600 text-lg">△</span>;
    }

    if (v === 'सुट आहे' || v === 'सुट आहे (Exempted)') {
      return <span className="text-purple-600 text-lg">◊</span>;
    }

    if (v === 'इतर' || v === 'इतर (Other)') {
      return <span className="text-orange-600 text-lg">◈</span>;
    }

    return <span className="text-orange-500 text-lg">◐</span>;
  };

const getProgressStatus = (record: GroupInsuranceRecord) => {
  const progressFields = [
    record.year_1990,
    record.year_2003,
    record.year_2010,
    record.year_2020
  ];

  const selectedFields = progressFields.filter(field => field && field.trim() !== '');
  if (selectedFields.length === 0) return 'pending';

  const hasNotAvailable = selectedFields.some(field => {
    const v = field!.trim();
    return v === 'नाही' || v === 'नाही (Not Available)';
  });
  if (hasNotAvailable) return 'processing';

  const allSelectedAreNotNA = selectedFields.every(field => {
    const v = field!.trim();
    return v !== 'नाही' && v !== 'नाही (Not Available)';
  });
  if (allSelectedAreNotNA) return 'completed';

  return 'processing';
};

  const getStatusCounts = () => {
    const total = filteredRecords.length;
    const processing = filteredRecords.filter(record => getProgressStatus(record) === 'processing').length;
    const completed = filteredRecords.filter(record => getProgressStatus(record) === 'completed').length;
    const pending = filteredRecords.filter(record => getProgressStatus(record) === 'pending').length;

    return { total, processing, completed, pending };
  };

  const getTabFilteredRecords = () => {
    if (activeTab === 'completed') {
      return filteredRecords.filter(record => getProgressStatus(record) === 'completed');
    } else if (activeTab === 'pending') {
      return filteredRecords.filter(record => getProgressStatus(record) === 'pending');
    } else if (activeTab === 'inProgress') {
      return filteredRecords.filter(record => getProgressStatus(record) === 'processing');
    }
    return filteredRecords;
  };

  const getPaginatedRecords = () => {
    const tabRecords = getTabFilteredRecords();
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return tabRecords.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const tabRecords = getTabFilteredRecords();
    return Math.ceil(tabRecords.length / recordsPerPage);
  };

  const handleEditRecord = (record: GroupInsuranceRecord) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    setIsLoading(true);
    try {
      const newStatus = getProgressStatus(editingRecord);

      const { error: insuranceError } = await ermsClient
        .from('group_insurance')
        .update({
          year_1990: editingRecord.year_1990,
          year_2003: editingRecord.year_2003,
          year_2010: editingRecord.year_2010,
          year_2020: editingRecord.year_2020,
          overall_comments: editingRecord.overall_comments,
          year_1990_comment: editingRecord.year_1990_comment,
          year_2003_comment: editingRecord.year_2003_comment,
          year_2010_comment: editingRecord.year_2010_comment,
          year_2020_comment: editingRecord.year_2020_comment,
          year_1990_date: editingRecord.year_1990_date,
          year_2003_date: editingRecord.year_2003_date,
          year_2010_date: editingRecord.year_2010_date,
          year_2020_date: editingRecord.year_2020_date,
          last_updated: new Date().toISOString()
        })
        .eq('id', editingRecord.id);

      const { error: employeeError } = await ermsClient
        .from('employee_retirement')
        .update({
          group_insurance_status: newStatus,
        })
        .eq('emp_id', editingRecord.emp_id);

      if (insuranceError || employeeError) throw insuranceError || employeeError;

      await fetchGroupInsuranceRecords();
      setShowEditModal(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
      alert(t('common.error') + ': ' + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };


  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedClerk('');
    setSelectedStatus('');
  };

  const statusCounts = getStatusCounts();
  const paginatedRecords = getPaginatedRecords();
  const totalPages = getTotalPages();

  // Updated helper for pagination buttons with dynamic display and ellipsis
  const renderPageButtons = () => {
    const buttons: React.ReactNode[] = [];

    // First button
    buttons.push(
      <button
        key="first"
        onClick={() => setCurrentPage(1)}
        className={`px-3 py-1 text-sm border rounded-md ${currentPage === 1
          ? 'bg-blue-500 text-white border-blue-500'
          : 'border-gray-300 hover:bg-gray-50'
          }`}
      >
        1
      </button>
    );

    // Ellipsis if startPage > 2
    let startPage = Math.max(2, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);

    if (startPage > 2) {
      buttons.push(<span key="ellipsis-start" className="px-3 py-1 text-sm text-gray-500">...</span>);
    }

    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 text-sm border rounded-md ${currentPage === i
            ? 'bg-blue-500 text-white border-blue-500'
            : 'border-gray-300 hover:bg-gray-50'
            }`}
        >
          {i}
        </button>
      );
    }

    // Ellipsis if endPage < totalPages - 1
    if (endPage < totalPages - 1) {
      buttons.push(<span key="ellipsis-end" className="px-3 py-1 text-sm text-gray-500">...</span>);
    }

    // Last button if totalPages > 1
    if (totalPages > 1) {
      buttons.push(
        <button
          key="last"
          onClick={() => setCurrentPage(totalPages)}
          className={`px-3 py-1 text-sm border rounded-md ${currentPage === totalPages
            ? 'bg-blue-500 text-white border-blue-500'
            : 'border-gray-300 hover:bg-gray-50'
            }`}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  if (isLoading && groupInsuranceRecords.length === 0) {
    return <div className="flex justify-center items-center h-64">{t('common.loading')}...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {/* Start of New changes to deploy */}
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

      {/* Process Overview */}
      <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('retirementTracker.processOverview')}</h3>
          <span className="text-sm text-gray-500">
            {statusCounts.total > 0 ? Math.round((statusCounts.completed / statusCounts.total) * 100) : 0}% {t('retirementTracker.complete')}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div
            className="bg-gradient-to-r from-orange-500 to-red-500 h-4 rounded-full transition-all duration-300"
            style={{
              width: statusCounts.total > 0 ? `${(statusCounts.completed / statusCounts.total) * 100}%` : '0%',
            }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
            <div className="text-sm text-gray-600">{t('retirementTracker.totalCases')}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
            <div className="text-sm text-gray-600">{t('retirementTracker.completed')}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.processing}</div>
            <div className="text-sm text-gray-600">{t('retirementTracker.inProgress')}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.pending}</div>
            <div className="text-sm text-gray-600">{t('retirementTracker.pending')}</div>
          </div>
        </div>
      </div>

      {/* Group Insurance Records Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-300">
        <div className="px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('retirementTracker.groupInsurance')}</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchAllData}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">{t('erms.refresh')}</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300">
                <Download className="h-4 w-4" />
                <span className="text-sm">{t('common.export')}</span>
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
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
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
                {clerks.map(clerk => (
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
              <span className="text-sm">{t('retirementTracker.clearFilters')}</span>
            </button>
          </div>

          {/* Tabs */}
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">{t('retirementTracker.employee')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">{t('retirementTracker.department')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">Retirement Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">{t('retirementTracker.age')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">{t('retirementTracker.assignedClerk')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">1990</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">2003</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">2010</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">2020</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider select-none whitespace-nowrap">{t('retirementTracker.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    {isLoading ? t('retirementTracker.loadingData') : t('retirementTracker.noRecordsFound')}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const status = getProgressStatus(record);
                  return (
                    <tr key={record.id} className="hover:bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.employee_name}</div>
                          <div className="text-sm text-gray-500">{record.emp_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.department || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.retirement_date ? new Date(record.retirement_date).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.age || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.assigned_clerk || t('erms.unassigned')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusIcon(record.year_1990)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusIcon(record.year_2003)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusIcon(record.year_2010)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusIcon(record.year_2020)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleEditRecord(record)} className="text-green-600 hover:text-green-900 p-1 rounded">
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
        {/* End of New changes to deploy */}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {t('retirementTracker.showingPage', {
                  start: (currentPage - 1) * recordsPerPage + 1,
                  end: Math.min(currentPage * recordsPerPage, getTabFilteredRecords().length),
                  total: getTabFilteredRecords().length
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

                <div className="flex space-x-1">
                  {renderPageButtons()}
                </div>

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
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Group Insurance Details</h3>
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
                      value={editingRecord.emp_id}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.employeeName')}</label>
                    <input
                      type="text"
                      value={editingRecord.employee_name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('retirementTracker.age')}</label>
                    <input
                      type="text"
                      value={editingRecord.age || '-'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Group Insurance Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">1990 Year</label>
                    <select
                      value={editingRecord.year_1990 || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_1990: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Status</option>
                      <option value="आहे">आहे (Available)</option>
                      <option value="नाही">नाही (Not Available)</option>
                      <option value="लागू नाही">लागू नाही (Not Applicable)</option>
                      <option value="सुट आहे">सुट आहे (Exempted)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">1990 Date</label>
                    <input
                      type="date"
                      value={editingRecord.year_1990_date ? editingRecord.year_1990_date.split('T')[0] : ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_1990_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2003 Year</label>
                    <select
                      value={editingRecord.year_2003 || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2003: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Status</option>
                      <option value="आहे">आहे (Available)</option>
                      <option value="नाही">नाही (Not Available)</option>
                      <option value="लागू नाही">लागू नाही (Not Applicable)</option>
                      <option value="सुट आहे">सुट आहे (Exempted)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2003 Date</label>
                    <input
                      type="date"
                      value={editingRecord.year_2003_date ? editingRecord.year_2003_date.split('T')[0] : ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2003_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2010 Year</label>
                    <select
                      value={editingRecord.year_2010 || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2010: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Status</option>
                      <option value="आहे">आहे (Available)</option>
                      <option value="नाही">नाही (Not Available)</option>
                      <option value="लागू नाही">लागू नाही (Not Applicable)</option>
                      <option value="सुट आहे">सुट आहे (Exempted)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2010 Date</label>
                    <input
                      type="date"
                      value={editingRecord.year_2010_date ? editingRecord.year_2010_date.split('T')[0] : ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2010_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2020 Year</label>
                    <select
                      value={editingRecord.year_2020 || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2020: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Status</option>
                      <option value="आहे">आहे (Available)</option>
                      <option value="नाही">नाही (Not Available)</option>
                      <option value="लागू नाही">लागू नाही (Not Applicable)</option>
                      <option value="सुट आहे">सुट आहे (Exempted)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2020 Date</label>
                    <input
                      type="date"
                      value={editingRecord.year_2020_date ? editingRecord.year_2020_date.split('T')[0] : ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2020_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Year Comments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">1990 Comment</label>
                    <textarea
                      value={editingRecord.year_1990_comment || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_1990_comment: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter comment for 1990"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2003 Comment</label>
                    <textarea
                      value={editingRecord.year_2003_comment || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2003_comment: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter comment for 2003"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2010 Comment</label>
                    <textarea
                      value={editingRecord.year_2010_comment || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2010_comment: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter comment for 2010"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2020 Comment</label>
                    <textarea
                      value={editingRecord.year_2020_comment || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year_2020_comment: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter comment for 2020"
                    />
                  </div>
                </div>

                {/* Overall Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Comments</label>
                  <textarea
                    value={editingRecord.overall_comments || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, overall_comments: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter overall comments"
                  />
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
                onClick={handleUpdateRecord}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? t('common.saving') : t('common.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
