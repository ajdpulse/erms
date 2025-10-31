import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { ermsClient, supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface RetirementDashboardProps {
  user: SupabaseUser;
  onBack: () => void;
}

interface RetirementEmployee {
  id: string;
  emp_id: string;
  employee_name: string;
  date_of_birth: string | null;
  age: number | null;
  retirement_date: string | null;
  reason: string;
  designation_time_of_retirement: string | null;
  assigned_clerk: string | null;
  department: string | null;
  designation: string | null;
  retirement_progress_status: string | null;
  pay_commission_status: string | null;
  group_insurance_status: string | null;
  status: string | null;
  date_of_submission: string | null;
  department_submitted: string | null;
  type_of_pension: string | null;
  date_of_pension_case_approval: string | null;
  date_of_actual_benefit_provided_for_group_insurance: string | null;
  date_of_benefit_provided_for_gratuity: string | null;
  date_of_actual_benefit_provided_for_leave_encashment: string | null;
  date_of_actual_benefit_provided_for_medical_allowance_if_applic: string | null;
  date_of_benefit_provided_for_hometown_travel_allowance_if_appli: string | null;
  date_of_actual_benefit_provided_for_pending_travel_allowance_if: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClerkData {
  user_id: string;
  name: string;
  role_name: string;
}

interface EditingEmployee extends RetirementEmployee {
  // All fields are already included in RetirementEmployee
}

export const RetirementDashboard: React.FC<RetirementDashboardProps> = ({ user, onBack }) => {
  const { t } = useTranslation();
  const { userRole, userProfile } = usePermissions(user);
  
  // Comprehensive state persistence system
  const STORAGE_KEYS = {
    ACTIVE_TAB: 'retirement-dashboard-active-tab',
    SELECTED_CLERK: 'retirement-dashboard-selected-clerk',
    SELECTED_MONTH: 'retirement-dashboard-selected-month',
    SELECTED_YEAR: 'retirement-dashboard-selected-year',
    MODAL_STATE: 'retirement-dashboard-modal-state',
    PAGINATION: 'retirement-dashboard-pagination'
  };

  // Get initial state from localStorage
  const getInitialState = () => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
      const savedClerk = localStorage.getItem(STORAGE_KEYS.SELECTED_CLERK);
      const savedMonth = localStorage.getItem(STORAGE_KEYS.SELECTED_MONTH);
      const savedYear = localStorage.getItem(STORAGE_KEYS.SELECTED_YEAR);
      const savedPagination = localStorage.getItem(STORAGE_KEYS.PAGINATION);
      
      return {
        activeTab: savedFilters || 'inProgress',
        selectedClerk: savedClerk || '',
        selectedMonth: savedMonth ? parseInt(savedMonth) : new Date().getMonth(),
        selectedYear: savedYear ? parseInt(savedYear) : new Date().getFullYear(),
        currentPage: savedPagination ? JSON.parse(savedPagination).currentPage : 1
      };
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
      return {
        activeTab: 'inProgress',
        selectedClerk: '',
        selectedMonth: new Date().getMonth(),
        selectedYear: new Date().getFullYear(),
        currentPage: 1
      };
    }
  };

  const initialState = getInitialState();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClerk, setSelectedClerk] = useState(initialState.selectedClerk);
  const [selectedMonth, setSelectedMonth] = useState(initialState.selectedMonth);
  const [selectedYear, setSelectedYear] = useState(initialState.selectedYear);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EditingEmployee | null>(null);
  const [activeTab, setActiveTab] = useState(initialState.activeTab as 'inProgress' | 'pending' | 'completed');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<RetirementEmployee | null>(null);
  const [retirementEmployees, setRetirementEmployees] = useState<RetirementEmployee[]>([]);
  const [clerks, setClerks] = useState<ClerkData[]>([]);
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const [employeesPerPage] = useState(10);

  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save state functions
  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeTab);
      localStorage.setItem(STORAGE_KEYS.SELECTED_CLERK, selectedClerk);
      localStorage.setItem(STORAGE_KEYS.SELECTED_MONTH, selectedMonth.toString());
      localStorage.setItem(STORAGE_KEYS.SELECTED_YEAR, selectedYear.toString());
      localStorage.setItem(STORAGE_KEYS.PAGINATION, JSON.stringify({ currentPage, timestamp: Date.now() }));
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
    }
  };

  const filteredEmployees = useMemo(() => {
    let filtered = retirementEmployees;

    // Role-based filtering
    if (userRole === 'clerk' && userProfile?.name) {
      // Clerk can only see their assigned employees
      filtered = filtered.filter(emp => emp.assigned_clerk === userProfile.name);
    }

    // Clerk filter (for non-clerk users)
    if (selectedClerk && userRole !== 'clerk') {
      const selectedClerkName = clerks.find(c => c.user_id === selectedClerk)?.name;
      if (selectedClerkName) {
        filtered = filtered.filter(emp => emp.assigned_clerk === selectedClerkName);
      }
    }

    return filtered;
  }, [retirementEmployees, selectedClerk, userRole, userProfile, clerks]);

  const totalPages = useMemo(() => Math.ceil(filteredEmployees.length / employeesPerPage), [filteredEmployees.length, employeesPerPage]);

  // Add missing function definitions
  const getDepartmentWiseData = useCallback(() => {
    const deptCounts: { [key: string]: number } = {};
    
    filteredEmployees.forEach(emp => {
      const dept = emp.department || 'Not Assigned';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    return Object.entries(deptCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredEmployees]);

  // Helper function to calculate retirement progress status
  const calculateRetirementProgressStatus = (record: any) => {
    const progressFields = [
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
      record.verification_completed,
      record.undertaking_taken,
      record.no_objection_certificate,
      record.retirement_order
    ];

    const filledFields = progressFields.filter(field => field && field.trim() !== '').length;
    const totalFields = progressFields.length;

    if (filledFields === 0) return 'pending';
    if (filledFields === totalFields) return 'completed';
    return 'in_progress';
  };

  // Helper function to calculate pay commission status
  const calculatePayCommissionStatus = (record: any) => {
    const payCommissionFields = [
      record.fourth_pay_comission,
      record.fifth_pay_comission,
      record.sixth_pay_comission,
      record.seventh_pay_comission
    ];

    const filledFields = payCommissionFields.filter(field => field && field.trim() !== '').length;
    const totalFields = payCommissionFields.length;

    if (filledFields === 0) return 'pending';
    if (filledFields === totalFields) return 'completed';
    return 'in_progress';
  };

  // Helper function to calculate group insurance status
  const calculateGroupInsuranceStatus = (record: any) => {
    const groupInsuranceFields = [
      record.year_1990,
      record.year_2003,
      record.year_2010,
      record.year_2020
    ];

    const filledFields = groupInsuranceFields.filter(field => field && field.trim() !== '').length;
    const totalFields = groupInsuranceFields.length;

    if (filledFields === 0) return 'pending';
    if (filledFields === totalFields) return 'completed';
    return 'in_progress';
  };

  // Initial data fetch - only run once on mount
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
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (isInitialized) {
      saveState();
    }
  }, [activeTab, selectedClerk, selectedMonth, selectedYear, currentPage, isInitialized]);

  // Restore modal state (edit/view) when the component initializes so that
  // switching tabs away and back preserves the modal if it was open.
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODAL_STATE);
      if (saved) {
        const state = JSON.parse(saved);
        const isRecent = Date.now() - (state.timestamp || 0) < 24 * 60 * 60 * 1000; // 24 hours
        if (isRecent) {
          if (state.showEditModal && state.editingEmployee) {
            setEditingEmployee(state.editingEmployee);
            setShowEditModal(true);
          }
          if (state.showViewModal && state.viewingEmployee) {
            setViewingEmployee(state.viewingEmployee);
            setShowViewModal(true);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore modal state from localStorage:', error);
    }
  }, [isInitialized]);

  // Persist modal state so it survives tab/component switches
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const state = {
        showEditModal,
        editingEmployee,
        showViewModal,
        viewingEmployee,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.MODAL_STATE, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save modal state to localStorage:', error);
    }
  }, [showEditModal, editingEmployee, showViewModal, viewingEmployee, isInitialized]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [retirementEmployees, selectedClerk]);

  const fetchAllData = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous calls
    
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRetirementEmployees(),
        fetchClerks()
      ]);
    } catch (error) {
      console.error('Error fetching retirement dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const fetchRetirementEmployees = useCallback(async () => {
    try {
      // Fetch retirement records with related data from all tables
      const { data: retirementData, error: retirementError } = await ermsClient
        .from('employee_retirement')
        .select(`
          id,
          emp_id,
          employee_name,
          date_of_birth,
          age,
          retirement_date,
          reason,
          designation_time_of_retirement,
          assigned_clerk,
          department,
          updated_at,
          retirement_progress_status,
          pay_commission_status,
          group_insurance_status,
          status,
          date_of_submission,
          department_submitted,
          type_of_pension,
          date_of_pension_case_approval,
          date_of_actual_benefit_provided_for_group_insurance,
          date_of_benefit_provided_for_gratuity,
          date_of_actual_benefit_provided_for_leave_encashment,
          date_of_actual_benefit_provided_for_medical_allowance_if_applic,
          date_of_benefit_provided_for_hometown_travel_allowance_if_appli,
          date_of_actual_benefit_provided_for_pending_travel_allowance_if,
          created_at,
          updated_at,
          designation
        `)
        .order('age', { ascending: false });
      
      if (retirementError) throw retirementError;

      // Just set the data without any database updates to prevent loops
      setRetirementEmployees(retirementData || []);
    } catch (error) {
      console.error('Error fetching retirement employees:', error);
      setRetirementEmployees([]); // Set empty array on error to prevent undefined issues
    }
  }, []);

  const fetchClerks = useCallback(async () => {
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
      setClerks([]); // Set empty array on error
    }
  }, []);

  const getProgressStatus = (employee: RetirementEmployee) => {
    // Only include actual data fields, not status fields
    const progressFields = [
      employee.date_of_submission,
      employee.department_submitted,
      employee.type_of_pension,
      employee.date_of_pension_case_approval,
      employee.date_of_actual_benefit_provided_for_group_insurance,
      employee.date_of_benefit_provided_for_gratuity,
      employee.date_of_actual_benefit_provided_for_leave_encashment,
      employee.date_of_actual_benefit_provided_for_medical_allowance_if_applic,
      employee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli,
      employee.date_of_actual_benefit_provided_for_pending_travel_allowance_if,
    ];

    const filledFields = progressFields.filter(field => field && field.trim() !== '').length;
    const totalFields = progressFields.length;

    if (filledFields === 0) return 'pending';
    if (filledFields === totalFields) return 'completed';
    return 'processing';
  };

  const getStatusCounts = useCallback(() => {
    const total = filteredEmployees.length;
    const processing = filteredEmployees.filter(emp => getProgressStatus(emp) === 'processing').length;
    const completed = filteredEmployees.filter(emp => getProgressStatus(emp) === 'completed').length;
    const pending = filteredEmployees.filter(emp => getProgressStatus(emp) === 'pending').length;

    return { total, processing, completed, pending };
  }, [filteredEmployees]);

  const getMonthWiseData = useCallback(() => {
    // Get 6 months: 3 before selected month, selected month, 2 after selected month
    const monthData = [];
    for (let i = -3; i <= 2; i++) {
      const targetDate = new Date(selectedYear, selectedMonth + i, 1);
      const monthName = targetDate.toLocaleString('default', { month: 'short' });
      const year = targetDate.getFullYear();
      monthData.push({
        month: `${monthName} ${year.toString().slice(-2)}`,
        fullDate: targetDate,
        count: 0
      });
    }

    // Count employees for each month
    filteredEmployees.forEach(emp => {
      if (emp.retirement_date) {
        const retirementDate = new Date(emp.retirement_date);
        const monthIndex = monthData.findIndex(m => 
          m.fullDate.getMonth() === retirementDate.getMonth() && 
          m.fullDate.getFullYear() === retirementDate.getFullYear()
        );
        if (monthIndex !== -1) {
          monthData[monthIndex].count++;
        }
      }
    });

    return monthData;
  }, [filteredEmployees, selectedMonth, selectedYear]);

  const getClerkWiseData = useCallback(() => {
    const clerkCounts: { [key: string]: number } = {};
    
    filteredEmployees.forEach(emp => {
      const clerk = emp.assigned_clerk || 'Unassigned';
      clerkCounts[clerk] = (clerkCounts[clerk] || 0) + 1;
    });

    return Object.entries(clerkCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredEmployees]);

  const getDesignationWiseData = useCallback(() => {
    const designationCounts: { [key: string]: number } = {};
    
    filteredEmployees.forEach(emp => {
      const designation = emp.designation || 'Not Assigned';
      designationCounts[designation] = (designationCounts[designation] || 0) + 1;
    });

    return Object.entries(designationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredEmployees]);

  const getTabFilteredEmployees = useCallback(() => {
    if (activeTab === 'completed') {
      return filteredEmployees.filter(emp => getProgressStatus(emp) === 'completed');
    } else if (activeTab === 'pending') {
      return filteredEmployees.filter(emp => getProgressStatus(emp) === 'pending');
    } else if (activeTab === 'inProgress') {
      return filteredEmployees.filter(emp => {
        const status = getProgressStatus(emp);
        return status === 'processing';
      });
    }
    return filteredEmployees;
  }, [activeTab, filteredEmployees]);

  const handleEditEmployee = useCallback((employee: RetirementEmployee) => {
    setEditingEmployee(employee);
    setShowEditModal(true);
  }, []);

  const handleViewEmployee = useCallback((employee: RetirementEmployee) => {
    setViewingEmployee(employee);
    setShowViewModal(true);
  }, []);

  const handleUpdateEmployee = useCallback(async () => {
    if (!editingEmployee) return;
    setIsLoading(true);
    try {
      // Calculate the new status based on the updated data
      const newStatus = getProgressStatus(editingEmployee);
      
      const { error } = await ermsClient
        .from('employee_retirement')
        .update({
          designation_time_of_retirement: editingEmployee.designation_time_of_retirement,
          assigned_clerk: editingEmployee.assigned_clerk,
          status: newStatus,
          date_of_submission: editingEmployee.date_of_submission,
          department_submitted: editingEmployee.department_submitted,
          type_of_pension: editingEmployee.type_of_pension,
          date_of_pension_case_approval: editingEmployee.date_of_pension_case_approval,
          date_of_actual_benefit_provided_for_group_insurance: editingEmployee.date_of_actual_benefit_provided_for_group_insurance,
          date_of_benefit_provided_for_gratuity: editingEmployee.date_of_benefit_provided_for_gratuity,
          date_of_actual_benefit_provided_for_leave_encashment: editingEmployee.date_of_actual_benefit_provided_for_leave_encashment,
          date_of_actual_benefit_provided_for_medical_allowance_if_applic: editingEmployee.date_of_actual_benefit_provided_for_medical_allowance_if_applic,
          date_of_benefit_provided_for_hometown_travel_allowance_if_appli: editingEmployee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli,
          date_of_actual_benefit_provided_for_pending_travel_allowance_if: editingEmployee.date_of_actual_benefit_provided_for_pending_travel_allowance_if,
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;
      
      // Update local state instead of refetching to prevent loops
      setRetirementEmployees(prev => 
        prev.map(emp => emp.id === editingEmployee.id ? { ...editingEmployee, status: newStatus } : emp)
      );
      setShowEditModal(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(t('common.error') + ': ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [editingEmployee, t]);

  const getTabFilteredRecords = () => {
    return getTabFilteredEmployees();
  };

  const getCompletionPercentage = (employee: RetirementEmployee) => {
    // Only include actual data fields, not status fields
    const progressFields = [
      employee.date_of_submission,
      employee.department_submitted,
      employee.type_of_pension,
      employee.date_of_pension_case_approval,
      employee.date_of_actual_benefit_provided_for_group_insurance,
      employee.date_of_benefit_provided_for_gratuity,
      employee.date_of_actual_benefit_provided_for_leave_encashment,
      employee.date_of_actual_benefit_provided_for_medical_allowance_if_applic,
      employee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli,
      employee.date_of_actual_benefit_provided_for_pending_travel_allowance_if,
    ];
    const filledFields = progressFields.filter(field => 
      field && 
      field.trim() !== '' && 
      field !== 'pending' && 
      field !== 'प्रलंबित'
    ).length;
    return Math.round((filledFields / progressFields.length) * 100);
  };

  const handleDownload = useCallback(() => {
    try {
      const tabRecords = getTabFilteredRecords();
      
      // Prepare Excel data with proper headers
      const headers = [
        'Employee ID',
        'Employee Name',
        'Department',
        'Designation',
        'Age',
        'Retirement Date',
        'Assigned Clerk',
        'Retirement Reason',
        'Birth Certificate',
        'Medical Certificate',
        'Nomination',
        'Permanent Registration',
        'Computer Exam',
        'Language Exam',
        'Post Service Exam',
        'Verification',
        'Date of Birth Verification',
        'Computer Exam Passed',
        'Marathi Hindi Exam Exemption',
        'Verification Completed',
        'Undertaking Taken',
        'No Objection Certificate',
        'Retirement Order',
        'Submission Date',
        'Department Submitted',
        'Type of Pension',
        'Pension Case Approval Date',
        'Group Insurance Benefit',
        'Gratuity Benefit',
        'Leave Encashment Benefit',
        'Medical Allowance Benefit',
        'Hometown Travel Allowance',
        'Pending Travel Allowance',
        'Government Decision March 2023',
        'Overall Comment',
        'Completion Percentage',
        'Status'
      ];
      
      // Convert data to CSV format
      const csvData = tabRecords.map(record => {
        const completionPercentage = getCompletionPercentage(record);
        const status = getProgressStatus(record);
        
        return [
          record.emp_id || '',
          record.employee_name || '',
          record.department || '',
          record.designation || '',
          record.age || '',
          record.retirement_date ? new Date(record.retirement_date).toLocaleDateString() : '',
          record.assigned_clerk || '',
          record.reason || '',
          record.birth_certificate || '',
          record.medical_certificate || '',
          record.nomination || '',
          record.permanent_registration || '',
          record.computer_exam || '',
          record.language_exam || '',
          record.post_service_exam || '',
          record.verification || '',
          record.date_of_birth_verification || '',
          record.computer_exam_passed || '',
          record.marathi_hindi_exam_exemption || '',
          record.verification_completed || '',
          record.undertaking_taken || '',
          record.no_objection_certificate || '',
          record.retirement_order || '',
          record.date_of_submission ? new Date(record.date_of_submission).toLocaleDateString() : '',
          record.department_submitted || '',
          record.type_of_pension || '',
          record.date_of_pension_case_approval ? new Date(record.date_of_pension_case_approval).toLocaleDateString() : '',
          record.date_of_actual_benefit_provided_for_group_insurance ? new Date(record.date_of_actual_benefit_provided_for_group_insurance).toLocaleDateString() : '',
          record.date_of_benefit_provided_for_gratuity ? new Date(record.date_of_benefit_provided_for_gratuity).toLocaleDateString() : '',
          record.date_of_actual_benefit_provided_for_leave_encashment ? new Date(record.date_of_actual_benefit_provided_for_leave_encashment).toLocaleDateString() : '',
          record.date_of_actual_benefit_provided_for_medical_allowance_if_applic ? new Date(record.date_of_actual_benefit_provided_for_medical_allowance_if_applic).toLocaleDateString() : '',
          record.date_of_benefit_provided_for_hometown_travel_allowance_if_appli ? new Date(record.date_of_benefit_provided_for_hometown_travel_allowance_if_appli).toLocaleDateString() : '',
          record.date_of_actual_benefit_provided_for_pending_travel_allowance_if ? new Date(record.date_of_actual_benefit_provided_for_pending_travel_allowance_if).toLocaleDateString() : '',
          record.overall_comment || '',
          `${completionPercentage}%`,
          status
        ];
      });
      
      // Create CSV content
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `\"${field}\"`).join(','))
        .join('\n');
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date and tab
      const currentDate = new Date().toISOString().split('T')[0];
      const tabName = activeTab === 'inProgress' ? 'In_Progress' : 
                     activeTab === 'pending' ? 'Pending' : 'Completed';
      const filename = `retirement_progress_${tabName}_${currentDate}.csv`;
      link.setAttribute('download', filename);
      
      // Trigger download
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading data:', error);
      alert(t('common.error') + ': Failed to download data');
    }
  }, [activeTab, t, getTabFilteredRecords, getCompletionPercentage]);

  const statusCounts = getStatusCounts();
  const monthWiseData = getMonthWiseData();
  const departmentWiseData = getDepartmentWiseData();
  const clerkWiseData = getClerkWiseData();
  const designationWiseData = getDesignationWiseData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('erms.retirementDashboard')}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {userRole === 'clerk' 
                  ? `${t('erms.interactiveClerkView')} - ${userProfile?.name || t('erms.unknownClerk')}`
                  : t('erms.globalAdministrativeView')
                }
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
                  {clerks.map(clerk => (
                    <option key={clerk.user_id} value={clerk.user_id}>
                      {clerk.name}
                    </option>
                  ))}
                </select>
              )}
              <button 
                onClick={fetchAllData}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">{t('erms.refresh')}</span>
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">{t('common.export')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.totalRetirements')}</p>
                <p className="text-3xl font-bold text-gray-900">{statusCounts.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.processing')}</p>
                <p className="text-3xl font-bold text-orange-600">{statusCounts.processing}</p>
                <p className="text-xs text-gray-500">{t('erms.withSubmissionData')}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.completed')}</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.completed}</p>
                <p className="text-xs text-gray-500">{t('erms.pensionApproved')}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.pending')}</p>
                <p className="text-3xl font-bold text-purple-600">{statusCounts.pending}</p>
                <p className="text-xs text-gray-500">{t('erms.awaitingApproval')}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Month-wise Retirement Count Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('erms.monthWiseRetirementCount')}</h3>
            <div className="flex items-center space-x-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={2023}>2023</option>
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={0}>{t('erms.january')}</option>
                <option value={1}>{t('erms.february')}</option>
                <option value={2}>{t('erms.march')}</option>
                <option value={3}>{t('erms.april')}</option>
                <option value={4}>{t('erms.may')}</option>
                <option value={5}>{t('erms.june')}</option>
                <option value={6}>{t('erms.july')}</option>
                <option value={7}>{t('erms.august')}</option>
                <option value={8}>{t('erms.september')}</option>
                <option value={9}>{t('erms.october')}</option>
                <option value={10}>{t('erms.november')}</option>
                <option value={11}>{t('erms.december')}</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            {monthWiseData.map((item, index) => (
              <div key={index} className={`flex items-center justify-between ${
                item.fullDate.getMonth() === selectedMonth && item.fullDate.getFullYear() === selectedYear 
                  ? 'bg-blue-50 border border-blue-200 rounded-lg p-2' 
                  : ''
              }`}>
                <div className="flex items-center space-x-3 w-20">
                  <span className={`text-sm font-medium ${
                    item.fullDate.getMonth() === selectedMonth && item.fullDate.getFullYear() === selectedYear 
                      ? 'text-blue-700 font-bold' 
                      : 'text-gray-700'
                  }`}>{item.month}</span>
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-6 relative">
                    <div
                      className={`h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                        item.fullDate.getMonth() === selectedMonth && item.fullDate.getFullYear() === selectedYear 
                          ? 'bg-blue-600' 
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: statusCounts.total > 0 ? `${Math.max((item.count / Math.max(...monthWiseData.map(d => d.count))) * 100, 5)}%` : '0%'
                      }}
                    >
                      {item.count > 0 && item.count}
                    </div>
                  </div>
                </div>
                <div className="w-8 text-right">
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {t('erms.showing6MonthsCentered', { 
                month: new Date(0, selectedMonth).toLocaleString('default', { month: 'long' }), 
                year: selectedYear 
              })}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Department-wise Count */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('erms.departmentWiseRetirementCount')}</h3>
            <div className="space-y-3 overflow-y-auto max-h-80 flex-1">
              {departmentWiseData.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{item.name}</span>
                      <span className="text-sm text-gray-500">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: statusCounts.total > 0 ? `${(item.count / statusCounts.total) * 100}%` : '0%'
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {statusCounts.total > 0 ? Math.round((item.count / statusCounts.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">{t('erms.showingTopResults', { count: 10 })}</p>
            </div>
          </div>

          {/* Designation vs Employee Count */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('erms.designationVsEmployeeCount')}</h3>
            <div className="space-y-3 overflow-y-auto max-h-80 flex-1">
              {designationWiseData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{item.name}</span>
                      <span className="text-sm text-gray-500">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{
                          width: statusCounts.total > 0 ? `${(item.count / statusCounts.total) * 100}%` : '0%'
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {statusCounts.total > 0 ? Math.round((item.count / statusCounts.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">{t('erms.showingTopResults', { count: 10 })}</p>
            </div>
          </div>

          {/* Clerk-wise Employee Count */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('erms.clerkWiseEmployeeCount')}</h3>
            <div className="space-y-3 overflow-y-auto max-h-80 flex-1">
              {clerkWiseData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{item.name}</span>
                      <span className="text-sm text-gray-500">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{
                          width: statusCounts.total > 0 ? `${(item.count / statusCounts.total) * 100}%` : '0%'
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {statusCounts.total > 0 ? Math.round((item.count / statusCounts.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">{t('erms.showingTopResults', { count: 10 })}</p>
            </div>
          </div>
        </div>

        {/* Employee Retirement Records Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('erms.retirementProgressTracker')}</h3>
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <Download className="h-4 w-4" />
                  <span className="text-sm">{t('common.export')}</span>
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="mt-4">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('inProgress')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'inProgress'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('erms.inProgress')} ({statusCounts.processing})
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('erms.pending')} ({statusCounts.pending})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'completed'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('erms.completed')} ({statusCounts.completed})
                </button>
              </nav>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.employee')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.department')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.designation')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.age')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.retirementDate')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.assignedClerk')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.retirementProgressStatus')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.payCommissionStatus')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.groupInsuranceStatus')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.progress')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('erms.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                        {t('erms.loadingRetirementData')}
                      </div>
                    </td>
                  </tr>
                ) : getTabFilteredEmployees().length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                      {t('erms.noRetirementRecordsFound')}
                    </td>
                  </tr>
                ) : (
                  getTabFilteredEmployees().map((employee) => {
                    const status = getProgressStatus(employee);
                    const progressFields = [
                      employee.date_of_submission,
                      employee.department_submitted,
                      employee.type_of_pension,
                      employee.date_of_pension_case_approval,
                      employee.date_of_actual_benefit_provided_for_group_insurance,
                      employee.date_of_benefit_provided_for_gratuity,
                      employee.date_of_actual_benefit_provided_for_leave_encashment,
                      employee.date_of_actual_benefit_provided_for_medical_allowance_if_applic,
                      employee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli,
                      employee.date_of_actual_benefit_provided_for_pending_travel_allowance_if,
                      employee.retirement_progress_status,
                      employee.pay_commission_status,
                      employee.group_insurance_status
                    ];
                    const filledFields = progressFields.filter(field => field && field.trim() !== '').length;
                    const progressPercentage = Math.round((filledFields / progressFields.length) * 100);

                    return (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                            <div className="text-sm text-gray-500">{employee.emp_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.designation || employee.designation_time_of_retirement || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.age || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.retirement_date ? new Date(employee.retirement_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.assigned_clerk || t('erms.unassigned')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'completed' ? 'bg-green-100 text-green-800' :
                            status === 'processing' ? 'bg-orange-100 text-orange-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                            {status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {t(`erms.${status}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.retirement_progress_status || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.pay_commission_status || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.group_insurance_status || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  status === 'completed' ? 'bg-green-500' :
                                  status === 'processing' ? 'bg-orange-500' :
                                  'bg-purple-500'
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{progressPercentage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleViewEmployee(employee)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            >
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
      </div>

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('erms.editRetirementDetails')}</h3>
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
                <h4 className="text-md font-semibold text-gray-800 mb-3">{t('erms.basicEmployeeInfo')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.employeeId')}</label>
                    <input
                      type="text"
                      value={editingEmployee.emp_id}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.employeeName')}</label>
                    <input
                      type="text"
                      value={editingEmployee.employee_name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.retirementDate')}</label>
                    <input
                      type="text"
                      value={editingEmployee.retirement_date ? new Date(editingEmployee.retirement_date).toLocaleDateString() : '-'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.designationAtRetirement')}</label>
                    <input
                      type="text"
                      value={editingEmployee.designation_time_of_retirement || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, designation_time_of_retirement: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.assignedClerk')}</label>
                    <input
                      type="text"
                      value={editingEmployee.assigned_clerk || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, assigned_clerk: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.dateOfSubmission')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_submission || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_submission: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.departmentSubmitted')}</label>
                    <input
                      type="text"
                      value={editingEmployee.department_submitted || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, department_submitted: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.typeOfPension')}</label>
                    <input
                      type="text"
                      value={editingEmployee.type_of_pension || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, type_of_pension: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.dateOfPensionCaseApproval')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_pension_case_approval || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_pension_case_approval: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.groupInsuranceBenefit')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_actual_benefit_provided_for_group_insurance || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_actual_benefit_provided_for_group_insurance: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.gratuityBenefit')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_benefit_provided_for_gratuity || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_benefit_provided_for_gratuity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.leaveEncashmentBenefit')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_actual_benefit_provided_for_leave_encashment || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_actual_benefit_provided_for_leave_encashment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.medicalAllowanceBenefit')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_actual_benefit_provided_for_medical_allowance_if_applic || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_actual_benefit_provided_for_medical_allowance_if_applic: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.hometownTravelAllowance')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_benefit_provided_for_hometown_travel_allowance_if_appli: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.pendingTravelAllowance')}</label>
                    <input
                      type="date"
                      value={editingEmployee.date_of_actual_benefit_provided_for_pending_travel_allowance_if || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_actual_benefit_provided_for_pending_travel_allowance_if: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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

      {/* View Employee Modal */}
      {showViewModal && viewingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Retirement Details - {viewingEmployee.employee_name}</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Basic Employee Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-md font-semibold text-blue-800 mb-3">{t('erms.basicEmployeeInfo')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.employeeId')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.emp_id}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.employeeName')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.employee_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.age')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.age || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.department')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.department || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.designation')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.designation || viewingEmployee.designation_time_of_retirement || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.retirementDate')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.retirement_date ? new Date(viewingEmployee.retirement_date).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.assignedClerk')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.assigned_clerk || t('erms.unassigned')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.retirementReason')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.reason || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Retirement Process Details */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h4 className="text-md font-semibold text-green-800 mb-3">Retirement Process Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.dateOfSubmission')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_submission ? new Date(viewingEmployee.date_of_submission).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.departmentSubmitted')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.department_submitted || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.typeOfPension')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.type_of_pension || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.dateOfPensionCaseApproval')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_pension_case_approval ? new Date(viewingEmployee.date_of_pension_case_approval).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits Information */}
              <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                <h4 className="text-md font-semibold text-orange-800 mb-3">Benefits Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.groupInsuranceBenefit')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_actual_benefit_provided_for_group_insurance ? new Date(viewingEmployee.date_of_actual_benefit_provided_for_group_insurance).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.gratuityBenefit')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_benefit_provided_for_gratuity ? new Date(viewingEmployee.date_of_benefit_provided_for_gratuity).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.leaveEncashmentBenefit')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_actual_benefit_provided_for_leave_encashment ? new Date(viewingEmployee.date_of_actual_benefit_provided_for_leave_encashment).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.medicalAllowanceBenefit')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_actual_benefit_provided_for_medical_allowance_if_applic ? new Date(viewingEmployee.date_of_actual_benefit_provided_for_medical_allowance_if_applic).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.hometownTravelAllowance')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli ? new Date(viewingEmployee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('erms.pendingTravelAllowance')}</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {viewingEmployee.date_of_actual_benefit_provided_for_pending_travel_allowance_if ? new Date(viewingEmployee.date_of_actual_benefit_provided_for_pending_travel_allowance_if).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Progress Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const progressFields = [
                          viewingEmployee.date_of_submission,
                          viewingEmployee.department_submitted,
                          viewingEmployee.type_of_pension,
                          viewingEmployee.date_of_pension_case_approval,
                          viewingEmployee.date_of_actual_benefit_provided_for_group_insurance,
                          viewingEmployee.date_of_benefit_provided_for_gratuity,
                          viewingEmployee.date_of_actual_benefit_provided_for_leave_encashment,
                          viewingEmployee.date_of_actual_benefit_provided_for_medical_allowance_if_applic,
                          viewingEmployee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli,
                          viewingEmployee.date_of_actual_benefit_provided_for_pending_travel_allowance_if,
                        ];
                        const filledFields = progressFields.filter(field => field && field.trim() !== '').length;
                        return Math.round((filledFields / progressFields.length) * 100);
                      })()}%
                    </div>
                    <div className="text-sm text-gray-600">Completion Rate</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      getProgressStatus(viewingEmployee) === 'completed' ? 'text-green-600' :
                      getProgressStatus(viewingEmployee) === 'processing' ? 'text-orange-600' :
                      'text-purple-600'
                    }`}>
                      {t(`erms.${getProgressStatus(viewingEmployee)}`)}
                    </div>
                    <div className="text-sm text-gray-600">Current Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {(() => {
                        const progressFields = [
                          viewingEmployee.date_of_submission,
                          viewingEmployee.department_submitted,
                          viewingEmployee.type_of_pension,
                          viewingEmployee.date_of_pension_case_approval,
                          viewingEmployee.date_of_actual_benefit_provided_for_group_insurance,
                          viewingEmployee.date_of_benefit_provided_for_gratuity,
                          viewingEmployee.date_of_actual_benefit_provided_for_leave_encashment,
                          viewingEmployee.date_of_actual_benefit_provided_for_medical_allowance_if_applic,
                          viewingEmployee.date_of_benefit_provided_for_hometown_travel_allowance_if_appli,
                          viewingEmployee.date_of_actual_benefit_provided_for_pending_travel_allowance_if,                         
                        ];
                        return progressFields.filter(field => field && field.trim() !== '').length;
                      })()}/11
                    </div>
                    <div className="text-sm text-gray-600">Fields Completed</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditEmployee(viewingEmployee);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                {t('common.edit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};