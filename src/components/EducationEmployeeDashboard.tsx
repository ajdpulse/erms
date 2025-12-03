import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Calendar,
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { ermsClient, supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface EducationEmployeeDashboardProps {
  onBack: () => void;
}

interface EducationEmployee {
  emp_id: string;
  employee_name: string;
  employee_name_en?: string;
  gender?: string;
  age: number | null;
  date_of_birth: string | null;
  officer_assigned: string | null;
  dept_id: string;
  designation: string;
  designation_id: string;
  taluka: string | null;
  office: string | null;
  tal_id: string;
  office_id: string;
  retirement_date: string | null;
  retirement_reason: string | null;
  assigned_clerk: string | null;
  date_of_assignment: string | null;
  Shalarth_Id?: string;
  cast_category?: string;
  appointment_caste_category?: string;
  teacher_type?: string;
  teacher_is_active?: boolean;
  Cadre?: string;
  date_of_joining?: string;
  created_at?: string;
  updated_at?: string;
}

interface Department {
  dept_id: string;
  department: string;
}

interface Designation {
  designation_id: string;
  designation: string;
}

interface Taluka {
  tal_id: string;
  name: string;
}

interface Office {
  office_id: string;
  name: string;
}

interface ClerkData {
  user_id: string;
  name: string;
  role_name: string;
}

export const EducationEmployeeDashboard: React.FC<EducationEmployeeDashboardProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // Comprehensive state persistence system
  const STORAGE_KEYS = {
    ACTIVE_TAB: 'education-dashboard-active-tab',
    FILTERS: 'education-dashboard-filters',
    PAGINATION: 'education-dashboard-pagination',
    MODAL_STATE: 'education-dashboard-modal-state',
    FORM_DATA: 'education-dashboard-form-data'
  };

  // Get initial filter state from localStorage
  const getInitialFilters = () => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return {
          searchTerm: parsed.searchTerm || '',
          selectedDepartment: parsed.selectedDepartment || '',
          selectedDesignation: parsed.selectedDesignation || '',
          selectedClerk: parsed.selectedClerk || '',
          selectedReason: parsed.selectedReason || ''
        };
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
    return {
      searchTerm: '',
      selectedDepartment: '',
      selectedDesignation: '',
      selectedClerk: '',
      selectedReason: ''
    };
  };

  // Get initial pagination state from localStorage
  const getInitialPagination = () => {
    try {
      const savedPagination = localStorage.getItem(STORAGE_KEYS.PAGINATION);
      if (savedPagination) {
        const parsed = JSON.parse(savedPagination);
        return {
          currentPage: parsed.currentPage || 1,
          recordsPerPage: parsed.recordsPerPage || 20
        };
      }
    } catch (error) {
      console.warn('Failed to load pagination from localStorage:', error);
    }
    return {
      currentPage: 1,
      recordsPerPage: 20
    };
  };

  // Modal persistence state management
  const getInitialModalState = () => {
    try {
      const savedModalState = localStorage.getItem(STORAGE_KEYS.MODAL_STATE);
      if (savedModalState) {
        const parsed = JSON.parse(savedModalState);
        return {
          showAddModal: parsed.showAddModal || false,
          showEditModal: parsed.showEditModal || false,
          editingEmployee: parsed.editingEmployee || null
        };
      }
    } catch (error) {
      console.warn('Failed to load modal state from localStorage:', error);
    }
    return {
      showAddModal: false,
      showEditModal: false,
      editingEmployee: null
    };
  };

  // 🔥 ADDED – Load form data from localStorage
  const getInitialFormData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("Failed to load form data:", err);
    }
    return { Cadre: "C", date_of_joining: "" };
  };


  const [employees, setEmployees] = useState<EducationEmployee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EducationEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [talukas, setTalukas] = useState<Taluka[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [clerks, setClerks] = useState<ClerkData[]>([]);
  const [educationDeptId, setEducationDeptId] = useState<string>('');
  const [officers, setOfficers] = useState<ClerkData[]>([]);

  // Initialize state with persisted values
  const initialFilters = getInitialFilters();
  const initialPagination = getInitialPagination();
  const initialModalState = getInitialModalState();

  // Filter states
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm);
  const [selectedDepartment, setSelectedDepartment] = useState(initialFilters.selectedDepartment);
  const [selectedClerk, setSelectedClerk] = useState(initialFilters.selectedClerk);
  const [selectedReason, setSelectedReason] = useState(initialFilters.selectedReason);
  const [currentPage, setCurrentPage] = useState(initialPagination.currentPage);
  const [totalEmployeeCount, setTotalEmployeeCount] = useState(0);
  const [recordsPerPage] = useState(initialPagination.recordsPerPage);
  const [filterType, setFilterType] = useState<string>('');
  const [selectedDesignation, setSelectedDesignation] = useState('');


  // Modal states
  const [showAddModal, setShowAddModal] = useState(initialModalState.showAddModal);
  const [showEditModal, setShowEditModal] = useState(initialModalState.showEditModal);
  const [editingEmployee, setEditingEmployee] = useState<EducationEmployee | null>(initialModalState.editingEmployee);

  // Form data
  // 🔥 ADDED – persistent form data initialization
  const [formData, setFormData] = useState<Partial<EducationEmployee>>(getInitialFormData());


  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save filters to localStorage
  const saveFilters = () => {
    try {
      const filterState = {
        searchTerm,
        selectedDepartment,
        selectedDesignation,
        selectedClerk,
        selectedReason,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filterState));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  };

  // Function to calculate retirement date based on date of birth and Cadre
  const calculateRetirementDate = (dateOfBirth: string, Cadre: string) => {

    if (!Cadre) return null;

    const birthDate = new Date(dateOfBirth);

    // Determine retirement age based on cadre
    let retirementAge = 60; // default
    if (Cadre.toLowerCase() === 'c') {
      retirementAge = 58;
    } else if (Cadre.toLowerCase() === 'd') {
      retirementAge = 60;
    }

    // Add retirement age to birth year
    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(birthDate.getFullYear() + retirementAge);

    // Set to last day of that month
    // Check if birth date is the 1st
    if (birthDate.getDate() === 1) {
      // Set to last day of previous month
      retirementDate.setMonth(retirementDate.getMonth(), 0);
    } else {
      // Set to last day of retirement month
      retirementDate.setMonth(retirementDate.getMonth() + 1, 0);
    }


    // retirementDate.setMonth(retirementDate.getMonth() + 1, 0);

    // Format date to YYYY-MM-DD
    const year = retirementDate.getFullYear();
    const month = (retirementDate.getMonth() + 1).toString().padStart(2, '0');
    const day = retirementDate.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // Save pagination to localStorage
  const savePagination = () => {
    try {
      const paginationState = {
        currentPage,
        recordsPerPage,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.PAGINATION, JSON.stringify(paginationState));
    } catch (error) {
      console.warn('Failed to save pagination to localStorage:', error);
    }
  };

  // Save modal state to localStorage
  const saveModalState = (modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    editingEmployee: EducationEmployee | null;
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

    // Enable persistence after initial load
    setTimeout(() => {
      setPersistenceEnabled(true);
      setIsInitialized(true);
    }, 100);

    // Add event listeners for persistence
    const handleBeforeUnload = () => {
      if (persistenceEnabled) {
        saveFilters();
        savePagination();
        saveModalState({
          showAddModal,
          showEditModal,
          editingEmployee
        });

        // 🔥 ADDED
        localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));
      }
    };


    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.MODAL_STATE && persistenceEnabled) {
        // Only load if we're not currently in a modal to prevent resets
        if (!showAddModal && !editingEmployee) {
          try {
            const saved = e.newValue;
            if (saved) {
              const state = JSON.parse(saved);
              const isRecent = Date.now() - state.timestamp < 24 * 60 * 60 * 1000; // 24 hours

              if (isRecent && (state.showAddModal || state.editingEmployee)) {
                setShowAddModal(state.showAddModal);
                setShowEditModal(state.showEditModal);
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

  // 🔥 ADDED – auto save form data on change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));
      } catch (err) {
        console.warn("Failed to save form data:", err);
      }
    }
  }, [formData, isInitialized]);

  // Auto-save filters when they change
  useEffect(() => {
    if (isInitialized) {
      saveFilters();
    }
  }, [searchTerm, selectedDepartment, selectedClerk, selectedReason, selectedDesignation, isInitialized]);

  // Auto-save pagination when it changes
  useEffect(() => {
    if (isInitialized) {
      savePagination();
    }
  }, [currentPage, recordsPerPage, isInitialized]);

  // Auto-save modal state when it changes
  useEffect(() => {
    if (isInitialized) {
      saveModalState({
        showAddModal,
        showEditModal,
        editingEmployee
      });
    }
  }, [showAddModal, showEditModal, editingEmployee, isInitialized]);

  useEffect(() => {
    if (educationDeptId) {
      fetchEmployees();
    }
  }, [educationDeptId]);

  useEffect(() => {
    filterEmployees();
    setCurrentPage(1);
  }, [employees, searchTerm, selectedDepartment, selectedClerk, selectedReason, selectedDesignation, filterType]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // First fetch the education department ID
      await fetchEducationDeptId();
      await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchDesignations(),
        fetchTalukas(),
        fetchOffices(),
        fetchClerks(),
        fetchOfficers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
            user_id,
            name,
            roles!inner(name)
          `)
        .eq('roles.name', 'officer')
        .not('name', 'is', null);

      if (error) throw error;

      const officersData = data?.map(officer => ({
        user_id: officer.user_id,
        name: officer.name,
        role_name: officer.roles?.name || 'officer'
      })) || [];

      setOfficers(officersData);
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  const fetchEducationDeptId = async () => {
    try {
      const { data, error } = await ermsClient
        .from('department')
        .select('dept_id')
        .eq('department', 'शिक्षण विभाग')
        .single();

      if (error) throw error;
      if (data) {
        setEducationDeptId(data.dept_id);
      }
    } catch (error) {
      console.error('Error fetching education department ID:', error);
    }
  };

  const fetchEmployees = async () => {
    if (!educationDeptId) return;

    try {
      // First get total count
      // First get the total count
      const { count, error: countError } = await ermsClient
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .eq('dept_id', educationDeptId);

      if (countError) {
        console.error('❌ Error getting employee count:', countError);
      } else {
        // console.log('📊 Total education employees:', count);
      }

      // Fetch all records using range - ensure we get ALL records
      const { data, error } = await ermsClient
        .from('employee')
        .select('*')
        .eq('dept_id', educationDeptId) // Filter for Education Department
        .range(0, Math.max((count || 0) - 1, 9999))
        //.limit(5000)
        //.range(0, count ? count - 1 : 9999)
        .order('employee_name');

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
      // console.log('✅ Employees fetched:', data?.length || 0, 'out of', count);
      setEmployees(data || []);
      setTotalEmployeeCount(count || data?.length || 0);
    } catch (error) {
      console.error('Error fetching employees:', error);
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

  const fetchDesignations = async () => {
    try {
      const { data, error } = await ermsClient
        .from('designations')
        .select('designation_id, designation')
        .order('designation');

      if (error) throw error;
      setDesignations(data || []);
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const fetchTalukas = async () => {
    try {
      const { data, error } = await ermsClient
        .from('talukas')
        .select('tal_id, name')
        .order('name');

      if (error) throw error;
      setTalukas(data || []);
    } catch (error) {
      console.error('Error fetching talukas:', error);
    }
  };

  const fetchOffices = async () => {
    try {
      const { data, error } = await ermsClient
        .from('office_locations')
        .select('office_id, name')
        .order('name');

      if (error) throw error;
      setOffices(data || []);
    } catch (error) {
      console.error('Error fetching offices:', error);
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

  const filterEmployees = () => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        String(emp.emp_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Shalarth_Id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // New Department Filter
    if (selectedDepartment) {
      filtered = filtered.filter(emp => String(emp.dept_id) === selectedDepartment);
    }

    // New Designation Filter
    if (selectedDesignation) {
      filtered = filtered.filter(emp => String(emp.designation_id) === selectedDesignation);
    }

    if (selectedClerk) {
      filtered = filtered.filter(emp => emp.assigned_clerk === selectedClerk);
    }

    if (selectedReason) {
      filtered = filtered.filter(emp => emp.retirement_reason === selectedReason);
    }

    if (filterType === 'upcomingRetirements') {
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      filtered = filtered.filter(emp => {
        if (!emp.retirement_date) return false;
        const retirementDate = new Date(emp.retirement_date);
        return retirementDate <= sixMonthsFromNow;
      });
    } else if (filterType === 'assigned') {
      filtered = filtered.filter(emp => emp.assigned_clerk);
    } else if (filterType === 'unassigned') {
      filtered = filtered.filter(emp => !emp.assigned_clerk);
    }

    setFilteredEmployees(filtered);
    setCurrentPage(1); // Ensure pagination resets, same as EmployeeDashboard
  };

  // Pagination logic
  const getPaginatedEmployees = () => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredEmployees.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(filteredEmployees.length / recordsPerPage);
  };

  const getKPIData = () => {
    const total = totalEmployeeCount; // Use the actual total count from database
    const upcomingRetirements = filteredEmployees.filter(emp => {
      if (!emp.retirement_date) return false;
      const retirementDate = new Date(emp.retirement_date);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      return retirementDate <= sixMonthsFromNow;
    }).length;

    const assigned = employees.filter(emp => emp.assigned_clerk).length; // Use all employees, not filtered
    const unassigned = total - assigned;

    return { total, upcomingRetirements, assigned, unassigned };
  };

const handleAddEmployee = async () => {
  setEditingEmployee(null);

  // 1. Fetch max emp_id from actual employee table
  const { data, error } = await ermsClient
    .from("employee")
    .select("emp_id")
    .order("emp_id", { ascending: false })
    .limit(1);

  let nextId = "1";

  if (!error && data && data.length > 0) {
    const maxId = Number(data[0].emp_id);
    if (!isNaN(maxId)) {
      nextId = String(maxId + 1);
    }
  }

  // 2. Apply to your form structure
  setFormData({
    emp_id: nextId,
    Cadre: "C",
    date_of_joining: "",
    employee_name: "",
    employee_name_en: "",
    gender: "",
    Shalarth_Id: "",
    cast_category: "",
    appointment_caste_category: "",
    teacher_type: "",
    teacher_is_active: true,
    designation_id: "",
    date_of_birth: "",
    taluka: "",
    office_id: "",
    assigned_clerk: "",
    officer_assigned: ""
  });

  // 3. Open modal
  setShowAddModal(true);
};

  const handleEditEmployee = (employee: EducationEmployee) => {
    setFormData(employee);
    setEditingEmployee(employee);
    setShowEditModal(true);
  };

  const handleSaveEmployee = async () => {

    if (!formData.emp_id || !formData.employee_name || !formData.designation_id) {
      alert(t('erms.fillAllFields'));
      return;
    }

    if (!educationDeptId) {
      alert('Education department ID not found');
      return;
    }

    // Define calculateAge only once
    const calculateAge = (dateOfBirth: string) => {
      if (!dateOfBirth) return null;
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    setIsLoading(true);
    try {
      // Calculate age from date of birth
      const calculatedAge = calculateAge(formData.date_of_birth);

      // Calculate retirement date based on cadre
      const calculatedRetirementDate = formData.Cadre
        ? calculateRetirementDate(formData.date_of_birth, formData.Cadre)
        : null;

      // Prepare employee data
      const employeeData = {
        emp_id: String(formData.emp_id || '').trim() || null,
        employee_name: String(formData.employee_name || '').trim(),
        employee_name_en: formData.employee_name_en ? String(formData.employee_name_en).trim() : null,
        date_of_birth: formData.date_of_birth,
        Cadre: 'C', // Always set to C
        retirement_date: calculatedRetirementDate,
        age: calculatedAge,
        designation_id: formData.designation_id,
        assigned_clerk: formData.assigned_clerk || null,
        officer_assigned: formData.officer_assigned || null,
        tal_id: formData.tal_id,
        dept_id: educationDeptId,
        office_id: formData.office_id,
        date_of_joining: formData.date_of_joining || null,
        Shalarth_Id: formData.Shalarth_Id,
        cast_category: formData.cast_category,
        appointment_caste_category: formData.appointment_caste_category,
        teacher_type: formData.teacher_type,
        teacher_is_active: formData.teacher_is_active,
        gender: formData.gender,
        updated_at: new Date().toISOString()
      };

      if (editingEmployee) {
        const { error } = await ermsClient
          .from('employee')
          .update(employeeData)
          .eq('emp_id', editingEmployee.emp_id);

        if (error) throw error;
        alert(t('common.success') + ': Employee updated successfully');
      } else {
        const { error } = await ermsClient
          .from('employee')
          .insert({
            ...employeeData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      await fetchEmployees();
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData({ Cadre: 'C' });
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(t('common.error') + ': ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteEmployee = async (employee: EducationEmployee) => {
    if (!confirm(t('common.deleteConfirm'))) return;

    setIsLoading(true);
    try {
      const { error } = await ermsClient
        .from('employee')
        .delete()
        .eq('emp_id', employee.emp_id);

      if (error) throw error;
      await fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(t('common.error') + ': ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedDesignation('');
    setSelectedClerk('');
    setCurrentPage(1);
    setSelectedReason('');
  };

  const kpiData = getKPIData();
  const paginatedEmployees = getPaginatedEmployees();
  const totalPages = getTotalPages();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Start of New changes to deploy */}
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-300 rounded-b-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-300"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm font-semibold">Back to General</span>
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-blue-700 tracking-wide">Education Department Employees</h1>
                <p className="text-sm text-gray-600 mt-1 font-medium tracking-wide">Manage education department employee records and analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchAllData}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg shadow-sm border border-transparent hover:border-indigo-300 transition-all duration-300"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm font-semibold">रिफ्रेश</span>
              </button>
              <button
                onClick={handleAddEmployee}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-semibold">कर्मचारी जोडा</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-indigo-50 rounded-b-xl shadow-inner">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md border border-indigo-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5" onClick={() => { setFilterType('total'); setTimeout(() => { }, 0); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-700 font-semibold tracking-wide mb-1 uppercase">{t('erms.totalEmployees')}</p>
                <p className="text-2xl font-extrabold text-indigo-900">{kpiData.total}</p>
              </div>
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-md">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-orange-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5" onClick={() => { setFilterType('upcomingRetirements'); setTimeout(() => { }, 0); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-semibold tracking-wide mb-1 uppercase">{t('erms.upcomingRetirements')}</p>
                <p className="text-2xl font-extrabold text-orange-800">{kpiData.upcomingRetirements}</p>
                <p className="text-xs text-orange-600 font-medium">{t('erms.nextSixMonths')}</p>
              </div>
              <div className="bg-gradient-to-tr from-orange-500 to-yellow-500 p-3 rounded-2xl shadow-md">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-green-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5" onClick={() => { setFilterType('assigned'); setTimeout(() => { }, 0); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-semibold tracking-wide mb-1 uppercase">{t('erms.assigned')}</p>
                <p className="text-2xl font-extrabold text-green-900">{kpiData.assigned}</p>
              </div>
              <div className="bg-gradient-to-tr from-green-500 to-teal-500 p-3 rounded-2xl shadow-md">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-red-300 p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-0.5" onClick={() => { setFilterType('unassigned'); setTimeout(() => { }, 0); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-semibold tracking-wide mb-1 uppercase">{t('erms.unassigned')}</p>
                <p className="text-2xl font-extrabold text-red-900">{kpiData.unassigned}</p>
              </div>
              <div className="bg-gradient-to-tr from-red-500 to-pink-600 p-3 rounded-2xl shadow-md">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Records Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-300">
        <div className="px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              {filteredEmployees.length} पैकी {paginatedEmployees.length} कर्मचारी दाखवत आहे (पृष्ठ {currentPage} / {totalPages})
            </div>
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300">
                <Download className="h-4 w-4" />
                <span className="text-sm font-semibold">{t('common.export')}</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5 mt-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('erms.searchEmployees')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedClerk}
              onChange={(e) => setSelectedClerk(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('erms.allClerks')}</option>
              {clerks.map(clerk => (
                <option key={clerk.user_id} value={clerk.user_id}>
                  {clerk.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">सर्व विभाग</option>
              {departments.map(dept => (
                <option key={dept.dept_id} value={dept.dept_id}>
                  {dept.department}
                </option>
              ))}
            </select>

            <select
              value={selectedDesignation}
              onChange={(e) => setSelectedDesignation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('erms.selectDesignation')}</option>
              {designations.map(designation => (
                <option key={designation.designation_id} value={String(designation.designation_id)}>{designation.designation}</option>
              ))}
            </select>

            {/* <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('erms.allReasons')}</option>
              <option value="मृत्यू झाल्याने">मृत्यू झाल्याने</option>
              <option value="नियत वयोमान">नियत वयोमान</option>
              <option value="स्वेच्छा सेवा निवृत्ती">स्वेच्छा सेवा निवृत्ती</option>
            </select> */}

            <button
              onClick={clearFilters}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm font-semibold">Clear Filters</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50 border-b border-blue-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.shalarthId')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.employee')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.gender')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.designation')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.teacherType')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.age')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.department')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.officeLocation')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.retirementDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.assignedClerk')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('erms.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    {isLoading ? 'Loading employees...' : 'No employees found'}
                  </td>
                </tr>
              ) : (
                getPaginatedEmployees().map(employee => (
                  <tr key={employee.emp_id} className="hover:bg-blue-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.Shalarth_Id || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                        <div className="text-sm text-gray-500">{employee.emp_id}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.gender || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {designations.find(d => d.designation_id === employee.designation_id)?.designation || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.teacher_type || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.age || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {departments.find(d => d.dept_id === employee.dept_id)?.department || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offices.find(o => o.office_id === employee.office_id)?.name || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.retirement_date
                        ? new Date(employee.retirement_date).toLocaleDateString()
                        : '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.assigned_clerk
                        ? clerks.find(c => c.user_id === employee.assigned_clerk)?.name || t('erms.unassigned')
                        : t('erms.unassigned')}
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
                        <button
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* End of New changes to deploy */}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  पृष्ठ {currentPage} / {totalPages} ({filteredEmployees.length} एकूण रेकॉर्ड)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>मागील</span>
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

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
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <span>पुढील</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Education Department Employee</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.employeeId')}</label>
                  <input
                    type="text"
                    value={formData.emp_id || ''}
                    onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('erms.enterEmployeeId')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.employeeName')}</label>
                  <input
                    type="text"
                    value={formData.employee_name || ''}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('erms.enterEmployeeName')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name (English)</label>
                  <input
                    type="text"
                    value={formData.employee_name_en || ''}
                    onChange={(e) => setFormData({ ...formData, employee_name_en: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter employee name in English"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.gender')}</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectGender')}</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.shalarthId')}</label>
                  <input
                    type="text"
                    value={formData.Shalarth_Id || ''}
                    onChange={(e) => setFormData({ ...formData, Shalarth_Id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('erms.placeholderShalarthId')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.castCategory')}</label>
                  <select
                    value={formData.cast_category || ''}
                    onChange={(e) => setFormData({ ...formData, cast_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectCastCategory')}</option>
                    <option value="Open">Open</option>
                    <option value="Scheduled Tribe">Scheduled Tribe</option>
                    <option value="Other Backward Class">Other Backward Class</option>
                    <option value="Scheduled Caste">Scheduled Caste</option>
                    <option value="Nomadic Tribe (B)">Nomadic Tribe (B)</option>
                    <option value="Special Backward Class">Special Backward Class</option>
                    <option value="Vimukta Jati (A)">Vimukta Jati (A)</option>
                    <option value="Nomadic Tribe (D)">Nomadic Tribe (D)</option>
                    <option value="Economically Weaker Section">Economically Weaker Section</option>
                    <option value="Special Backward Category (A)">Special Backward Category (A)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.appointmentCastCategory')}</label>
                  <select
                    value={formData.appointment_caste_category || ''}
                    onChange={(e) => setFormData({ ...formData, appointment_caste_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectAppointmentCastCategory')}</option>
                    <option value="Open">Open</option>
                    <option value="Scheduled Tribe">Scheduled Tribe</option>
                    <option value="Other Backward Class">Other Backward Class</option>
                    <option value="Scheduled Caste">Scheduled Caste</option>
                    <option value="Nomadic Tribe (B)">Nomadic Tribe (B)</option>
                    <option value="Special Backward Class">Special Backward Class</option>
                    <option value="Vimukta Jati (A)">Vimukta Jati (A)</option>
                    <option value="Nomadic Tribe (D)">Nomadic Tribe (D)</option>
                    <option value="Economically Weaker Section">Economically Weaker Section</option>
                    <option value="Special Backward Category (A)">Special Backward Category (A)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.teacherType')}</label>
                  <select
                    value={formData.teacher_type || ''}
                    onChange={(e) => setFormData({ ...formData, teacher_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectTeacherType')}</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Under Graduate">Under Graduate</option>
                    <option value="Headmaster">Headmaster</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.teacherActiveStatus')}</label>
                  <select
                    value={formData.teacher_is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, teacher_is_active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.Cadre')}</label>
                  <input
                    type="text"
                    value="C"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.designation')}</label>
                  <select
                    value={formData.designation_id || ''}
                    onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectDesignation')}</option>
                    {designations.map(designation => (
                      <option key={designation.designation_id} value={designation.designation_id}>{designation.designation}</option>
                    ))}
                  </select>
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.age')}</label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('erms.enterAge')}
                  />
                </div> */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.dateOfBirth')}</label>
                  <input
                    type="date"
                    value={formData.date_of_birth ? formData.date_of_birth.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.taluka')}</label>
                  <select
                    value={formData.taluka || ''}
                    onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectTaluka')}</option>
                    {talukas.map(taluka => (
                      <option key={taluka.tal_id} value={taluka.name}>
                        {taluka.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.office')}</label>
                  <select
                    value={formData.office_id || ''}
                    onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectOffice')}</option>
                    {offices.map(office => (
                      <option key={office.office_id} value={office.office_id}>
                        {office.name}
                      </option>
                    ))}
                  </select>

                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.assignedClerk')}</label>
                  <select
                    value={formData.assigned_clerk || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_clerk: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectClerk')}</option>
                    {clerks.map(clerk => (
                      <option key={clerk.user_id} value={clerk.user_id}>
                        {clerk.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.assignedOfficer')}
                  </label>
                  <select
                    value={formData.officer_assigned || ''}
                    onChange={(e) => setFormData({ ...formData, officer_assigned: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectOfficer')}</option>
                    {officers.map(officer => (
                      <option key={officer.user_id} value={officer.user_id}>{officer.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveEmployee}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Education Department Employee</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.employeeId')}</label>
                  <input
                    type="text"
                    value={formData.emp_id || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.employeeName')}</label>
                  <input
                    type="text"
                    value={formData.employee_name || ''}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('erms.enterEmployeeName')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name (English)</label>
                  <input
                    type="text"
                    value={formData.employee_name_en || ''}
                    onChange={(e) => setFormData({ ...formData, employee_name_en: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter employee name in English"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.gender')}</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectGender')}</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.shalarthId')}</label>
                  <input
                    type="text"
                    value={formData.Shalarth_Id || ''}
                    onChange={(e) => setFormData({ ...formData, Shalarth_Id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('erms.placeholderShalarthId')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.castCategory')}</label>
                  <select
                    value={formData.cast_category || ''}
                    onChange={(e) => setFormData({ ...formData, cast_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectCastCategory')}</option>
                    <option value="Open">Open</option>
                    <option value="Scheduled Tribe">Scheduled Tribe</option>
                    <option value="Other Backward Class">Other Backward Class</option>
                    <option value="Scheduled Caste">Scheduled Caste</option>
                    <option value="Nomadic Tribe (B)">Nomadic Tribe (B)</option>
                    <option value="Special Backward Class">Special Backward Class</option>
                    <option value="Vimukta Jati (A)">Vimukta Jati (A)</option>
                    <option value="Nomadic Tribe (D)">Nomadic Tribe (D)</option>
                    <option value="Economically Weaker Section">Economically Weaker Section</option>
                    <option value="Special Backward Category (A)">Special Backward Category (A)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.appointmentCastCategory')}</label>
                  <select
                    value={formData.appointment_caste_category || ''}
                    onChange={(e) => setFormData({ ...formData, appointment_caste_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectAppointmentCastCategory')}</option>
                    <option value="Open">Open</option>
                    <option value="Scheduled Tribe">Scheduled Tribe</option>
                    <option value="Other Backward Class">Other Backward Class</option>
                    <option value="Scheduled Caste">Scheduled Caste</option>
                    <option value="Nomadic Tribe (B)">Nomadic Tribe (B)</option>
                    <option value="Special Backward Class">Special Backward Class</option>
                    <option value="Vimukta Jati (A)">Vimukta Jati (A)</option>
                    <option value="Nomadic Tribe (D)">Nomadic Tribe (D)</option>
                    <option value="Economically Weaker Section">Economically Weaker Section</option>
                    <option value="Special Backward Category (A)">Special Backward Category (A)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.teacherType')} </label>
                  <select
                    value={formData.teacher_type || ''}
                    onChange={(e) => setFormData({ ...formData, teacher_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectTeacherType')}</option>
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Higher Secondary">Higher Secondary</option>
                    <option value="Special">Special</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.teacherActiveStatus')}</label>
                  <select
                    value={formData.teacher_is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, teacher_is_active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.Cadre')}</label>
                  <input
                    type="text"
                    value="C"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.designation')}
                  </label>
                  <select
                    value={formData.designation_id || ''}
                    onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectDesignation')}</option>
                    {designations.map(designation => (
                      <option key={designation.designation_id} value={designation.designation_id}>{designation.designation}</option>
                    ))}
                  </select>
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.age')}</label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('erms.enterAge')}
                  />
                </div> */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.dateOfBirth')}</label>
                  <input
                    type="date"
                    value={formData.date_of_birth ? formData.date_of_birth.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.taluka')}</label>
                  <select
                    value={formData.taluka || ''}
                    onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectTaluka')}</option>
                    {talukas.map(taluka => (
                      <option key={taluka.tal_id} value={taluka.name}>
                        {taluka.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.office')}</label>
                  <select
                    value={formData.office_id || ''}
                    onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectOffice')}</option>
                    {offices.map(office => (
                      <option key={office.office_id} value={office.office_id}>
                        {office.name}
                      </option>
                    ))}
                  </select>

                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('erms.assignedClerk')}</label>
                  <select
                    value={formData.assigned_clerk || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_clerk: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectClerk')}</option>
                    {clerks.map(clerk => (
                      <option key={clerk.user_id} value={clerk.user_id}>
                        {clerk.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.assignedOfficer')}
                  </label>
                  <select
                    value={formData.officer_assigned || ''}
                    onChange={(e) => setFormData({ ...formData, officer_assigned: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectOfficer')}</option>
                    {officers.map(officer => (
                      <option key={officer.user_id} value={officer.user_id}>{officer.name}</option>
                    ))}
                  </select>
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
                onClick={handleSaveEmployee}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? t('common.updating') : t('common.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};