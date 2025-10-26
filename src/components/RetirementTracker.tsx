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
  verification_completed: string | null;
  has_undertaking_been_taken_on_21_12_2021: string | null;
  no_objection_no_inquiry_certificate: string | null;
  retirement_order: string | null;
  birth_certificate_doc_submitted: string | null;
  date_of_birth_verification_comment: string | null;
  medical_certificate_comment: string | null;
  nomination_comment: string | null;
  permanent_registration_comment: string | null;
  computer_exam_passed_comment: string | null;
  marathi_hindi_exam_exemption_comment: string | null;
  post_service_exam_comment: string | null;
  verification_completed_comment: string | null;
  has_undertaking_been_taken_on_21_12_2021_comment: string | null;
  no_objection_no_inquiry_certificate_comment: string | null;
  retirement_order_comment: string | null;
  date_of_birth_verification_date: string | null;
  medical_certificate_date: string | null;
  nomination_date: string | null;
  permanent_registration_date: string | null;
  computer_exam_passed_date: string | null;
  marathi_hindi_exam_exemption_date: string | null;
  post_service_exam_date: string | null;
  verification_completed_date: string | null;
  has_undertaking_been_taken_on_21_12_2021_date: string | null;
  no_objection_no_inquiry_certificate_date: string | null;
  retirement_order_date: string | null;
  overall_comment: string | null;
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
  verification_completed: string | null;
  undertaking_taken: string | null;
  no_objection_certificate: string | null;
  retirement_order: string | null;
  overall_comment: string | null;
}

export const RetirementTracker: React.FC<RetirementTrackerProps> = ({ user, onBack }) => {
  const { t } = useTranslation();
  const { userRole, userProfile } = usePermissions(user);
  const [activeMainTab, setActiveMainTab] = useState<'retirement' | 'payCommission' | 'groupInsurance'>('retirement');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClerk, setSelectedClerk] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<RetirementProgress | null>(null);
  const [viewingRecord, setViewingRecord] = useState<RetirementProgressRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'inProgress' | 'pending' | 'completed'>('inProgress');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;
  
  // Data states
  const [retirementProgress, setRetirementProgress] = useState<RetirementProgress[]>([]);
  const [clerks, setClerks] = useState<ClerkData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<RetirementProgress[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

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
          department,
          status,
          date_of_birth_verification,
          medical_certificate,
          nomination,
          permanent_registration,
          computer_exam_passed,
          marathi_hindi_exam_exemption,
          post_service_exam,
          verification_completed,
          has_undertaking_been_taken_on_21_12_2021,
          no_objection_no_inquiry_certificate,
          retirement_order,
          birth_certificate_doc_submitted,
          date_of_birth_verification_comment,
          medical_certificate_comment,
          nomination_comment,
          permanent_registration_comment,
          computer_exam_passed_comment,
          marathi_hindi_exam_exemption_comment,
          post_service_exam_comment,
          verification_completed_comment,
          has_undertaking_been_taken_on_21_12_2021_comment,
          no_objection_no_inquiry_certificate_comment,
          retirement_order_comment,
          date_of_birth_verification_date,
          medical_certificate_date,
          nomination_date,
          permanent_registration_date,
          computer_exam_passed_date,
          marathi_hindi_exam_exemption_date,
          post_service_exam_date,
          verification_completed_date,
          has_undertaking_been_taken_on_21_12_2021_date,
          no_objection_no_inquiry_certificate_date,
          retirement_order_date,
          overall_comment,
          created_at,
          updated_at
        `)
        .order('age', { ascending: false });
      
      if (error) throw error;
      
      // Update status for each employee based on progress and save to database
      const employeesWithUpdatedStatus = await Promise.all((data || []).map(async (employee) => {
        const calculatedStatus = getProgressStatus(employee);
        
        // Only update if status has changed
        if (employee.status !== calculatedStatus) {
          try {
            const { error: updateError } = await ermsClient
              .from('retirement_progress')
              .update({ status: calculatedStatus })
              .eq('id', employee.id);
            
            if (updateError) {
              console.error('Error updating status for employee:', employee.emp_id, updateError);
            } else {
              console.log(`Updated status for ${employee.emp_id}: ${calculatedStatus}`);
            }
          } catch (updateError) {
            console.error('Error updating employee status:', updateError);
          }
        }
        
        return { ...employee, status: calculatedStatus };
      }));
      
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

  const filterEmployees = () => {
    let filtered = retirementProgress;

    // Role-based filtering
    if (userRole === 'clerk' && userProfile?.name) {
      // Clerk can only see their assigned employees
      filtered = filtered.filter(emp => emp.assigned_clerk === userProfile.name);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        String(emp.emp_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.department || '').toLowerCase().includes(searchTerm.toLowerCase())
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
    return tabFiltered.slice(startIndex, endIndex);
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('retirementTracker.totalCases')}</p>
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
                <p className="text-sm text-gray-600 mb-1">{t('retirementTracker.processing')}</p>
                <p className="text-3xl font-bold text-orange-600">{statusCounts.processing}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('retirementTracker.completed')}</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.completed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('retirementTracker.pending')}</p>
                <p className="text-3xl font-bold text-purple-600">{statusCounts.pending}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Process Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                width: statusCounts.total > 0 ? `${(statusCounts.completed / statusCounts.total) * 100}%` : '0%'
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

        {/* Progress Records Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('retirementTracker.progressRecords')}</h3>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={fetchAllData}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">{t('erms.refresh')}</span>
                </button>
                <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
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
                  {clerks.map(clerk => (
                    <option key={clerk.user_id} value={clerk.user_id}>
                      {clerk.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={clearFilters}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <X className="h-4 w-4" />
                <span className="text-sm">{t('retirementTracker.clearFilters')}</span>
              </button>
            </div>
            
            {/* Sub Tabs for Retirement Progress */}
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
                  {t('retirementTracker.inProgress')} ({statusCounts.processing})
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('retirementTracker.pending')} ({statusCounts.pending})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'completed'
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.employee')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.dateOfBirthVerification')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.birthDocumentSubmitted')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.medicalCertificate')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.nomination')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.permanentRegistration')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.computerExamPassed')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.marathiHindiExamExemption')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.postServiceExam')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.verificationCompleted')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.undertakingTaken')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.noObjectionCertificate')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.retirementOrder')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retirementTracker.actions')}</th>
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
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                            <div className="text-sm text-gray-500">{employee.emp_id}</div>
                            <div className="text-xs text-gray-400">{t('retirementTracker.age')}: {employee.age || '-'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'completed' ? 'bg-green-100 text-green-800' :
                            status === 'processing' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{t(`retirementTracker.${status}`)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.date_of_birth_verification)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.birth_certificate_doc_submitted)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.medical_certificate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.nomination)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.permanent_registration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.computer_exam_passed)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.marathi_hindi_exam_exemption)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.post_service_exam)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.verification_completed)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.has_undertaking_been_taken_on_21_12_2021)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.no_objection_no_inquiry_certificate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusIcon(employee.retirement_order)}
                        </td>
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
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === pageNum
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
                      <input
                        type="date"
                        value={editingEmployee.date_of_birth_verification_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_birth_verification_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.date_of_birth_verification_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, date_of_birth_verification_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.birth_certificate_doc_submitted_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, birth_certificate_doc_submitted_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.birth_certificate_doc_submitted_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, birth_certificate_doc_submitted_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.medical_certificate_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, medical_certificate_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.medical_certificate_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, medical_certificate_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.nomination_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, nomination_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.nomination_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, nomination_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.permanent_registration_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, permanent_registration_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.permanent_registration_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, permanent_registration_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.computer_exam_passed_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, computer_exam_passed_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.computer_exam_passed_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, computer_exam_passed_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.marathi_hindi_exam_exemption_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, marathi_hindi_exam_exemption_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.marathi_hindi_exam_exemption_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, marathi_hindi_exam_exemption_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.post_service_exam_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, post_service_exam_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.post_service_exam_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, post_service_exam_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.verification_completed_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, verification_completed_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.verification_completed_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, verification_completed_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.has_undertaking_been_taken_on_21_12_2021_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, has_undertaking_been_taken_on_21_12_2021_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.has_undertaking_been_taken_on_21_12_2021_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, has_undertaking_been_taken_on_21_12_2021_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.no_objection_no_inquiry_certificate_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, no_objection_no_inquiry_certificate_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.no_objection_no_inquiry_certificate_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, no_objection_no_inquiry_certificate_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
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
                      <input
                        type="date"
                        value={editingEmployee.retirement_order_date || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, retirement_order_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <textarea
                        value={editingEmployee.retirement_order_comment || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, retirement_order_comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('common.comment')}
                      />
                    </div>
                  </div>
                  
                  {/* Overall Comment */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('retirementTracker.overallComment')}</label>
                    <textarea
                      value={editingEmployee.overall_comment || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, overall_comment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder={t('retirementTracker.enterOverallComment')}
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

                {/* Overall Comments */}
                {viewingRecord.overall_comment && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">{t('retirementTracker.overallComment')}</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {viewingRecord.overall_comment}
                    </div>
                  </div>
                )}

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
                            viewingRecord.verification_completed,
                            viewingRecord.undertaking_taken,
                            viewingRecord.no_objection_certificate,
                            viewingRecord.retirement_order
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
                            viewingRecord.verification_completed,
                            viewingRecord.undertaking_taken,
                            viewingRecord.no_objection_certificate,
                            viewingRecord.retirement_order
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
      employee.verification_completed,
      employee.has_undertaking_been_taken_on_21_12_2021,
      employee.no_objection_no_inquiry_certificate,
      employee.retirement_order
    ];

    const filledFields = progressFields.filter(field => 
      field && field.trim() !== '' && field !== 'नाही (Not Available)'
    ).length;
    const totalFields = progressFields.length;

    if (filledFields === 0) return 'pending';
    if (filledFields === totalFields) return 'completed';
    return 'processing';
  };

  const getStatusCounts = () => {
    const total = filteredEmployees.length;
    const processing = filteredEmployees.filter(emp => getProgressStatus(emp) === 'processing').length;
    const completed = filteredEmployees.filter(emp => getProgressStatus(emp) === 'completed').length;
    const pending = filteredEmployees.filter(emp => getProgressStatus(emp) === 'pending').length;

    return { total, processing, completed, pending };
  };

  const handleEditEmployee = (employee: RetirementProgress) => {
    setEditingEmployee(employee);
    setShowEditModal(true);
  };

  const handleViewRecord = (record: RetirementProgressRecord) => {
    setViewingRecord(record);
    setShowViewModal(true);
  };

  const handleEditRecord = (record: RetirementProgressRecord) => {
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
      verification_completed: record.verification_completed,
      has_undertaking_been_taken_on_21_12_2021: record.undertaking_taken,
      no_objection_no_inquiry_certificate: record.no_objection_certificate,
      retirement_order: record.retirement_order,
      birth_certificate_doc_submitted: record.birth_doc_submitted,
      date_of_birth_verification_comment: null,
      medical_certificate_comment: null,
      nomination_comment: null,
      permanent_registration_comment: null,
      computer_exam_passed_comment: null,
      marathi_hindi_exam_exemption_comment: null,
      post_service_exam_comment: null,
      verification_completed_comment: null,
      has_undertaking_been_taken_on_21_12_2021_comment: null,
      no_objection_no_inquiry_certificate_comment: null,
      retirement_order_comment: null,
      date_of_birth_verification_date: null,
      medical_certificate_date: null,
      nomination_date: null,
      permanent_registration_date: null,
      computer_exam_passed_date: null,
      marathi_hindi_exam_exemption_date: null,
      post_service_exam_date: null,
      verification_completed_date: null,
      has_undertaking_been_taken_on_21_12_2021_date: null,
      no_objection_no_inquiry_certificate_date: null,
      retirement_order_date: null,
      overall_comment: record.overall_comment
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
      
      const { error } = await ermsClient
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
          verification_completed: editingEmployee.verification_completed,
          has_undertaking_been_taken_on_21_12_2021: editingEmployee.has_undertaking_been_taken_on_21_12_2021,
          no_objection_no_inquiry_certificate: editingEmployee.no_objection_no_inquiry_certificate,
          retirement_order: editingEmployee.retirement_order,
          birth_certificate_doc_submitted: editingEmployee.birth_certificate_doc_submitted,
          date_of_birth_verification_comment: editingEmployee.date_of_birth_verification_comment,
          medical_certificate_comment: editingEmployee.medical_certificate_comment,
          nomination_comment: editingEmployee.nomination_comment,
          permanent_registration_comment: editingEmployee.permanent_registration_comment,
          computer_exam_passed_comment: editingEmployee.computer_exam_passed_comment,
          marathi_hindi_exam_exemption_comment: editingEmployee.marathi_hindi_exam_exemption_comment,
          post_service_exam_comment: editingEmployee.post_service_exam_comment,
          verification_completed_comment: editingEmployee.verification_completed_comment,
          has_undertaking_been_taken_on_21_12_2021_comment: editingEmployee.has_undertaking_been_taken_on_21_12_2021_comment,
          no_objection_no_inquiry_certificate_comment: editingEmployee.no_objection_no_inquiry_certificate_comment,
          retirement_order_comment: editingEmployee.retirement_order_comment,
          date_of_birth_verification_date: editingEmployee.date_of_birth_verification_date,
          medical_certificate_date: editingEmployee.medical_certificate_date,
          nomination_date: editingEmployee.nomination_date,
          permanent_registration_date: editingEmployee.permanent_registration_date,
          computer_exam_passed_date: editingEmployee.computer_exam_passed_date,
          marathi_hindi_exam_exemption_date: editingEmployee.marathi_hindi_exam_exemption_date,
          post_service_exam_date: editingEmployee.post_service_exam_date,
          verification_completed_date: editingEmployee.verification_completed_date,
          has_undertaking_been_taken_on_21_12_2021_date: editingEmployee.has_undertaking_been_taken_on_21_12_2021_date,
          no_objection_no_inquiry_certificate_date: editingEmployee.no_objection_no_inquiry_certificate_date,
          retirement_order_date: editingEmployee.retirement_order_date,
          overall_comment: editingEmployee.overall_comment
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;
      
      await fetchRetirementProgress();
      setShowEditModal(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(t('common.error') + ': ' + error.message);
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
      record.verification_completed,
      record.undertaking_taken,
      record.no_objection_certificate,
      record.retirement_order
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
      record.verification_completed,
      record.undertaking_taken,
      record.no_objection_certificate,
      record.retirement_order
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
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('retirementTracker.title')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('retirementTracker.subtitle')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchAllData}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm font-medium">{t('erms.refresh')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Main Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <nav className="flex space-x-8 px-6 border-b border-gray-200">
            <button
              onClick={() => setActiveMainTab('retirement')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeMainTab === 'retirement'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>{t('retirementTracker.retirementProgress')}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveMainTab('payCommission')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeMainTab === 'payCommission'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>{t('retirementTracker.payCommission')}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveMainTab('groupInsurance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeMainTab === 'groupInsurance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>{t('retirementTracker.groupInsurance')}</span>
              </div>
            </button>
          </nav>
        </div>

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

                {/* Overall Comments */}
                {viewingRecord.overall_comment && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">{t('retirementTracker.overallComment')}</h4>
                    <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded border">
                      {viewingRecord.overall_comment}
                    </div>
                  </div>
                )}

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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getProgressStatus(viewingRecord) === 'completed' ? 'bg-green-100 text-green-800' :
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