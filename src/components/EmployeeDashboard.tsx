import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users,
  Calendar,
  UserCheck,
  BarChart3,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Filter,
  Download
} from 'lucide-react';
import { ermsClient, supabase } from '../lib/supabase';
import { EducationEmployeeDashboard } from './EducationEmployeeDashboard';
import { usePermissions } from '../hooks/usePermissions';

interface EmployeeDashboardProps {
  onBack: () => void;
}

interface Employee {
  emp_id: string;
  employee_name: string;
  date_of_birth: string;
  retirement_date: string; // calculated field
  reason: string;
  assigned_clerk: string | null;
  dept_id: string;
  department: string; // from department table
  designation_id: string;
  designation: string; // from designations table
  tal_id: string;
  office_id: string;
  name: string; // from office_locations table
  date_of_assignment: string | null;
  panchayatrajsevarth_id: string | null;
  ddo_code: string | null;
  Cadre: string;
  date_of_joining: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Department {
  dept_id: bigint;
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

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'education'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedClerk, setSelectedClerk] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmployeeCount, setTotalEmployeeCount] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [selectedCadre, setSelectedCadre] = useState('');
  
  // Modal persistence state management
  const getInitialModalState = () => {
    try {
      const savedModalState = localStorage.getItem('erms-employee-modal-state');
      if (savedModalState) {
        const parsed = JSON.parse(savedModalState);
        return {
          showAddModal: parsed.showAddModal || false,
          showEditModal: parsed.showEditModal || false,
          editingEmployee: parsed.editingEmployee || null,
          formData: parsed.formData || {
            emp_id: '',
            employee_name: '',
            date_of_birth: '',
            retirement_date: '',
            reason: '',
            assigned_clerk: '',
            dept_id: '',
            designation_id: '',
            tal_id: '',
            office_id: '',
            panchayatrajsevarth_id: '',
            ddo_code: '',
            Cadre: '',
            date_of_joining: ''
          }
        };
      }
    } catch (error) {
      console.warn('Failed to load modal state from localStorage:', error);
    }
    return {
      showAddModal: false,
      showEditModal: false,
      editingEmployee: null,
      formData: {
        emp_id: '',
        employee_name: '',
        date_of_birth: '',
        retirement_date: '',
        reason: '',
        assigned_clerk: '',
        dept_id: '',
        designation_id: '',
        tal_id: '',
        office_id: '',
        panchayatrajsevarth_id: '',
        ddo_code: '',
        Cadre: '',
        date_of_joining: ''
      }
    };
  };

  const initialModalState = getInitialModalState();
  const [showAddModal, setShowAddModal] = useState(initialModalState.showAddModal);
  const [showEditModal, setShowEditModal] = useState(initialModalState.showEditModal);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(initialModalState.editingEmployee);
  
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [department, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [talukas, setTalukas] = useState<Taluka[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [clerks, setClerks] = useState<ClerkData[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

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
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Employee>>(initialModalState.formData);

  // Save modal state to localStorage
  const saveModalState = (modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    editingEmployee: Employee | null;
    formData: Partial<Employee>;
  }) => {
    try {
      localStorage.setItem('erms-employee-modal-state', JSON.stringify(modalState));
      
      // Broadcast to other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'erms-employee-modal-state',
        newValue: JSON.stringify(modalState),
        storageArea: localStorage
      }));
    } catch (error) {
      console.warn('Failed to save modal state to localStorage:', error);
    }
  };

  // Clear modal state
  const clearModalState = () => {
    try {
      localStorage.removeItem('erms-employee-modal-state');
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'erms-employee-modal-state',
        newValue: null,
        storageArea: localStorage
      }));
    } catch (error) {
      console.warn('Failed to clear modal state from localStorage:', error);
    }
  };

  // Storage keys for persistence
  const MODAL_STATE_KEY = 'employee-dashboard-modal-state';
  const FORM_DATA_KEY = 'employee-dashboard-form-data';

  const getInitialFormData = () => {
    return {
      emp_id: '',
      employee_name: '',
      date_of_birth: '',
      retirement_date: '',
      reason: '',
      assigned_clerk: '',
      dept_id: '',
      designation_id: '',
      tal_id: '',
      office_id: '',
      panchayatrajsevarth_id: '',
      ddo_code: '',
      Cadre: '',
      date_of_joining: ''
    };
  };

  useEffect(() => {
    fetchAllData();
    // Enable persistence after initial load
    setTimeout(() => {
      loadPersistedState();
      setPersistenceEnabled(true);
    }, 100);
    
    // Add event listeners for persistence
    const handleVisibilityChange = () => {
      if (!document.hidden && persistenceEnabled) {
        loadPersistedState();
      }
    };
    
    const handleBeforeUnload = () => {
      if (persistenceEnabled && (showAddModal || editingEmployee)) {
        saveCurrentState();
      }
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'erms-employee-modal-state' && persistenceEnabled) {
        loadPersistedState();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save current state to localStorage
  const saveCurrentState = () => {
    if (!persistenceEnabled) return;
    
    try {
      const state = {
        showAddModal,
        editingEmployee,
        formData,
        timestamp: Date.now()
      };
      localStorage.setItem('erms-employee-modal-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save modal state:', error);
    }
  };
  
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const saved = localStorage.getItem('erms-employee-modal-state');
      if (!saved) return;
      
      const state = JSON.parse(saved);
      const isRecent = Date.now() - state.timestamp < 24 * 60 * 60 * 1000; // 24 hours
      
      if (isRecent && (state.showAddModal || state.editingEmployee)) {
        setShowAddModal(state.showAddModal);
        setEditingEmployee(state.editingEmployee);
        setFormData(state.formData || getInitialFormData());
      }
    } catch (error) {
      console.warn('Failed to load modal state:', error);
    }
  };
  
  // Clear persisted state
  const clearPersistedState = () => {
    try {
      localStorage.removeItem('erms-employee-modal-state');
    } catch (error) {
      console.warn('Failed to clear modal state:', error);
    }
  };
  
  // Auto-save state when modal or form data changes
  useEffect(() => {
    if (persistenceEnabled && (showAddModal || editingEmployee)) {
      saveCurrentState();
    }
  }, [showAddModal, editingEmployee, formData, persistenceEnabled]);
  
  // Auto-save form data on input changes
  useEffect(() => {
    if (persistenceEnabled && (showAddModal || editingEmployee)) {
      const timeoutId = setTimeout(() => {
        saveCurrentState();
      }, 500); // Debounce saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData]);

  // Save form data to localStorage
  const saveFormData = () => {
    if (persistenceEnabled && isInitialized) {
      try {
        const formState = {
          data: formData,
          timestamp: Date.now()
        };
        localStorage.setItem(FORM_DATA_KEY, JSON.stringify(formState));
      } catch (error) {
        console.warn('Failed to save form data:', error);
      }
    }
  };

  // Auto-save form data when it changes
  useEffect(() => {
    if (persistenceEnabled && isInitialized) {
      saveFormData();
    }
  }, [formData, persistenceEnabled, isInitialized]);

  // Handle page visibility and beforeunload events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && persistenceEnabled) {
        saveFormData();
      }
    };

    const handleBeforeUnload = () => {
      if (persistenceEnabled) {
        saveFormData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [persistenceEnabled]);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, selectedDepartment, selectedClerk, selectedReason, selectedCadre]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchDesignations(),
        fetchTalukas(),
        fetchOffices(),
        fetchClerks()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // console.log('🔍 Fetching employees from erms.employee table...');
      
      // First get the education department ID
      const { data: educationDept, error: deptError } = await ermsClient
        .from('department')
        .select('dept_id')
        .eq('department', 'शिक्षण विभाग')
        .single();
      
      if (deptError) {
        console.warn('Could not find education department:', deptError);
      }
      
      const educationDeptId = educationDept?.dept_id;
      console.log('Education Department ID:', educationDeptId);
      
      // Get total count excluding education department
      const countQuery = ermsClient
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .or(`dept_id.is.null,dept_id.neq.${educationDeptId}`);

      
      if (educationDeptId) {
        countQuery.neq('dept_id', educationDeptId);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error getting employee count:', countError);
        throw countError;
      }
      
      console.log('Total employees (excluding education):', count);
      setTotalEmployeeCount(count || 0);
      
      // Fetch all records excluding education department
      const dataQuery = ermsClient
        .from('employee')
        .select(`
          emp_id,
          employee_name,
          employee_name_en,
          age,
          date_of_birth,
          retirement_date,
          reason,
          assigned_clerk,
          date_of_assignment,
          dept_id,
          designation_id,
          tal_id,
          office_id,
          panchayatrajsevarth_id,
          ddo_code,
          Cadre,
          date_of_joining,
          created_at,
          updated_at
        `,{
            count: 'exact',
                head: false
            })
        .order('employee_name')
        .range(0, count ? count - 1 : 9999)
        .or(`dept_id.is.null,dept_id.neq.${educationDeptId}`);
      
      // if (educationDeptId) {
      //   dataQuery.neq('dept_id', educationDeptId);
      // }

      if (educationDeptId) {
            dataQuery.or(`dept_id.is.null,dept_id.neq.${educationDeptId}`);
              }

      const { data, error } = await dataQuery;
      
      // Define education department ID
      // console.log('✅ Raw employee data from database:', data);
      // console.log('📊 Number of employees fetched:', data?.length || 0);
      // console.log('✅ Employees fetched (excluding education):', data?.length || 0, 'out of', count);
      setEmployees(data || []);
      // console.log('📋 Employees state updated with:', data?.length || 0, 'records');
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Set empty array on error to prevent undefined state
      setEmployees([]);
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

  const fetchClerks = async () => {debugger;
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
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(emp => emp.dept_id === selectedDepartment);
    }

    if (selectedClerk) {
      filtered = filtered.filter(emp => emp.assigned_clerk === selectedClerk);
    }

    if (selectedReason) {
      filtered = filtered.filter(emp => emp.reason === selectedReason);
    }

    setFilteredEmployees(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const calculateUpcomingRetirements = () => {
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return employees.filter(emp => {
      if (!emp.retirement_date) return false;
      const retirementDate = new Date(emp.retirement_date);
      return retirementDate <= sixMonthsFromNow;
    }).length;
  };


  const handleAddEmployee = () => {
    setEditingEmployee(null);
    // Reset form data completely
    setFormData({
      emp_id: '',
      employee_name: '',
      date_of_birth: '',
      retirement_date: '',
      reason: '',
      assigned_clerk: '',
      dept_id: '',
      designation_id: '',
      tal_id: '',
      office_id: '',
      panchayatrajsevarth_id: '',
      ddo_code: '',
      Cadre: '',
      date_of_joining: ''
    });
    setShowAddModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      emp_id: employee.emp_id,
      employee_name: employee.employee_name,
      date_of_birth: employee.date_of_birth,
     // retirement_date: employee.retirement_date,
      reason: employee.reason,
      Cadre: employee.Cadre,
      assigned_clerk: employee.assigned_clerk,
      dept_id: employee.dept_id,
      designation_id: employee.designation_id,
      tal_id: employee.tal_id,
      office_id: employee.office_id,
      panchayatrajsevarth_id: employee.panchayatrajsevarth_id,
      ddo_code: employee.ddo_code,
      date_of_joining: employee.date_of_joining
    });
    setShowEditModal(true);
  };

  const handleSaveEmployee = async () => {
    if (!formData.emp_id || !formData.employee_name || !formData.date_of_birth) {
      alert('Employee ID, name, and date of birth are required');
      return;
    }

    // Check if Cadre is selected before calling calculateRetirementDate
    console.log('🔍 Debugging retirement date calculation:');
    console.log('   Date of Birth:', formData.date_of_birth);
    console.log('   Cadre:', formData.Cadre);
    console.log('   Cadre selected:', !!formData.Cadre);
    
    if (!formData.Cadre) {
      console.warn('⚠️ Warning: Cadre not selected, retirement date will be null');
    }
    
    // Calculate age from date of birth
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
      const calculateAge = (dateOfBirth: string) => {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      };
      
      const calculatedAge = calculateAge(formData.date_of_birth);
      
      // Calculate retirement date based on cadre
      const calculatedRetirementDate = formData.Cadre ? 
        calculateRetirementDate(formData.date_of_birth, formData.Cadre) : null;
      
      // console.log('📊 Calculated values:');
      // console.log('   Age:', calculatedAge);
      // console.log('   Retirement Date:', calculatedRetirementDate);
    
      
      // Calculate retirement date based on cadre
      const employeeData = {
        emp_id: String(formData.emp_id || '').trim() || null,
        employee_name: String(formData.employee_name || '').trim(),
        Cadre: String(formData.Cadre || '').trim() || null,
        date_of_birth: formData.date_of_birth,
        //retirement_date: calculatedRetirementDate,
        retirement_date: calculateRetirementDate(formData.date_of_birth, formData.Cadre),
        designation_id: formData.designation_id,
        reason: String(formData.reason || '').trim() || null,
        assigned_clerk: formData.assigned_clerk || null,
        tal_id: formData.tal_id,
        dept_id: formData.dept_id,
        office_id: formData.office_id,
        ddo_code: String(formData.ddo_code || '').trim() || null,
        date_of_joining: formData.date_of_joining || null,
        panchayatrajsevarth_id: formData.panchayatrajsevarth_id?.trim() || null
        //department: formData.department || null
      };

      // Log the employeeData object before insert to verify retirement_date is present
      // console.log('📝 Employee data being sent to database:');
      // console.log(JSON.stringify(employeeData, null, 2));
      // console.log('   retirement_date field present:', 'retirement_date' in employeeData);
      // console.log('   retirement_date value:', employeeData.retirement_date);
      // console.log('   dept_id:', employeeData.dept_id);
      // console.log('   department:', employeeData.department);


      if (editingEmployee) {
        const { error } = await ermsClient
          .from('employee')
          .update(employeeData)
          .eq('emp_id', editingEmployee.emp_id);
        if (error) throw error;
        
        // Show success message for update
        alert(t('common.success') + ': Employee updated successfully');
      } else {
        const { error } = await ermsClient
          .from('employee')
          .insert(employeeData);
        if (error) throw error;
        
        // Show success message for creation
        alert(t('common.success') + ': Employee added successfully');
      }
      
      await fetchEmployees();
      clearPersistedState();
      setShowAddModal(false);
      setShowEditModal(false);
      
      // Reset form data properly
      setFormData({
        emp_id: '',
        employee_name: '',
        date_of_birth: '',
        retirement_date: '',
        reason: '',
        assigned_clerk: '',
        dept_id: '',
        designation_id: '',
        tal_id: '',
        office_id: '',
        panchayatrajsevarth_id: '',
        ddo_code: '',
        Cadre: '',
        date_of_joining: ''
      });
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error saving employee:', error);
      
      // Print error.message fully to see if it's a constraint violation or type mismatch
      console.error('🚨 Full error details:');
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.details);
      console.error('   Error hint:', error.hint);
      console.error('   Full error object:', JSON.stringify(error, null, 2));
      
      // More user-friendly error messages
      let errorMessage = t('common.error');
      if (error.message.includes('duplicate key')) {
        errorMessage = 'Employee ID already exists. Please use a different ID.';
      } else if (error.message.includes('foreign key')) {
        errorMessage = 'Please select valid department, designation, taluka, and office.';
      } else if (error.message.includes('retirement_date')) {
        errorMessage = 'Retirement date validation failed. Please check date of birth and cadre selection.';
      } else if (error.message.includes('constraint')) {
        errorMessage = 'Data validation failed. Please check all required fields and constraints.';
      } else {
        errorMessage += ': ' + error.message;
      }
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    // More descriptive confirmation message
    const confirmMessage = `${t('common.deleteConfirm')}\n\nEmployee: ${employee.employee_name}\nID: ${employee.emp_id}`;
    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      const { error } = await ermsClient
        .from('employee')
        .delete()
        .eq('emp_id', employee.emp_id);
      
      if (error) throw error;
      
      // Show success message
      alert(t('common.success') + ': Employee deleted successfully');
      await fetchEmployees();
      clearPersistedState();
    } catch (error) {
      console.error('Error deleting employee:', error);
      
      // More user-friendly error message
      let errorMessage = t('common.error');
      if (error.message.includes('foreign key')) {
        errorMessage = 'Cannot delete employee. This employee has related records in the system.';
      } else {
        errorMessage += ': ' + error.message;
      }
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedClerk('');
    setSelectedReason('');
  };

  const assignedCount = employees.filter(emp => emp.assigned_clerk).length;
  const unassignedCount = employees.length - assignedCount;
  const upcomingRetirements = calculateUpcomingRetirements();

  // If education tab is selected, render the education component
  if (activeTab === 'education') {
    return <EducationEmployeeDashboard onBack={() => setActiveTab('general')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('erms.employeeDashboardTitle')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('erms.employeeDashboardSubtitle')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchAllData}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm font-medium">{t('erms.refresh')}</span>
              </button>
              <button 
                onClick={handleAddEmployee}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">{t('erms.addEmployee')}</span>
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="mt-4">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General Employees
              </button>
              <button
                onClick={() => setActiveTab('education')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'education'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Education Department
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.totalEmployees')}</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.upcomingRetirements')}</p>
                <p className="text-2xl font-bold text-orange-600">{upcomingRetirements}</p>
                <p className="text-xs text-gray-500">{t('erms.nextSixMonths')}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.assigned')}</p>
                <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('erms.unassigned')}</p>
                <p className="text-2xl font-bold text-red-600">{unassignedCount}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Employee Records Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <select
                  value={recordsPerPage}
                  onChange={(e) => {
                    setRecordsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <button 
                  onClick={fetchEmployees}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('erms.refresh')}</span>
                </button>
              </div>
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} employees
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('erms.searchEmployees')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('erms.allDepartments')}</option>
                {department.map(dept => (
                  <option key={dept.dept_id} value={dept.dept_id}>{dept.department}</option>
                ))}
              </select>

              <select
                value={selectedClerk}
                onChange={(e) => setSelectedClerk(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('erms.allClerks')}</option>
                {clerks.map(clerk => (
                  <option key={clerk.user_id} value={clerk.user_id}>{clerk.name}</option>
                ))}
              </select>

              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('erms.allReasons')}</option>
                <option value="मृत्यू झाल्याने">मृत्यू झाल्याने</option>
                <option value="नियत वयोमान">नियत वयोमान</option>
                <option value="स्वेच्छा सेवा निवृत्ती">स्वेच्छा सेवा निवृत्ती</option>
              </select>

              <button
                onClick={clearFilters}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <X className="h-4 w-4" />
                <span className="text-sm">{t('erms.clearFilters')}</span>
              </button>
            </div>
            
            <p className="text-sm text-gray-500">
              {t('erms.showingEmployees', { filtered: filteredEmployees.length, total: employees.length })}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">कर्मचारी आयडी</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">कर्मचारी नाव</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">जन्म तारीख</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">डीडीओ कोड</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">संवर्ग</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">पदाचे नाव</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">विभाग</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">कार्यरत कार्यालयाचे नाव</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">नियुक्त लिपिक</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">सेवेत रुजू होण्याची तारीख</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">सेवानिवृत्ती तारीख</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">क्रिया</th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
  {paginatedEmployees.length === 0 ? (
    <tr>
      <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
        {t('erms.noEmployeesFound')}
      </td>
    </tr>
  ) : (
    [...paginatedEmployees]
      .sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth))
      .map((employee) => (
        <tr key={employee.emp_id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {employee.emp_id || '-'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div>
              <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {employee.date_of_birth}
          </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.ddo_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.Cadre || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {designations.find(d => d.designation_id === employee.designation_id)?.designation || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {department.find(d => d.dept_id === employee.dept_id)?.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {offices.find(o => o.office_id === employee.office_id)?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.assigned_clerk ? 
                          clerks.find(c => c.user_id === employee.assigned_clerk)?.name || t('erms.unassigned')
                          : t('erms.unassigned')
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.date_of_joining}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.retirement_date}
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    
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
                    Next
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('erms.addEmployee')}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.panchayatrajsevarthId')}
                  </label>
                  <input
                    type="text"
                    value={formData.panchayatrajsevarth_id || ''}
                    onChange={(e) => setFormData({ ...formData, panchayatrajsevarth_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.employeeIdInternal')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.emp_id || ''}
                    onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.employeeName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employee_name || ''}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.dateOfBirth')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.ddoCode')}
                  </label>
                  <input
                    type="text"
                    value={formData.ddo_code || ''}
                    onChange={(e) => setFormData({ ...formData, ddo_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.Cadre')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.Cadre || ''}
                    onChange={(e) => setFormData({ ...formData, Cadre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                   <option value="">Select Cadre</option>
                   <option value="C">C</option>
                   <option value="D">D</option>
                  </select>
                  {formData.Cadre && (
                    <p className="text-xs text-gray-500 mt-1">
                    Currently selected Cadre: <span className="font-semibold">{formData.Cadre}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.dateOfJoining')}
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_joining || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.retirementDate')}
                  </label>
                  <input
                    type="date"
                    value={calculateRetirementDate(formData.date_of_birth, formData.Cadre) || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    title="Retirement date is auto-calculated based on date of birth and Cadre"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated: Cadre C = 58 years, Cadre D = 60 years (last day of month)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.retirementReason')}
                  </label>
                  <select
                    value={formData.reason || ''}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectReason')}</option>
                    <option value="मृत्यू झाल्याने">मृत्यू झाल्याने</option>
                    <option value="नियत वयोमान">नियत वयोमान</option>
                    <option value="स्वेच्छा सेवा निवृत्ती">स्वेच्छा सेवा निवृत्ती</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.department')}
                  </label>
                  <select
                    value={formData.dept_id || ''}
                    onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectDepartment')}</option>
                    {department.map(dept => (
                      <option key={dept.dept_id} value={dept.dept_id}>{dept.department}</option>
                    ))}
                  </select>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.taluka')}
                  </label>
                  <select
                    value={formData.tal_id || ''}
                    onChange={(e) => setFormData({ ...formData, tal_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectTaluka')}</option>
                    {talukas.map(taluka => (
                      <option key={taluka.tal_id} value={taluka.tal_id}>{taluka.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.office')}
                  </label>
                  <select
                    value={formData.office_id || ''}
                    onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectOffice')}</option>
                    {offices.map(office => (
                      <option key={office.office_id} value={office.office_id}>{office.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.assignedClerk')}
                  </label>
                  <select
                    value={formData.assigned_clerk || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_clerk: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectClerk')}</option>
                    {clerks.map(clerk => (
                      <option key={clerk.user_id} value={clerk.user_id}>{clerk.name}</option>
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('erms.editEmployee')}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.panchayatrajsevarthId')}
                  </label>
                  <input
                    type="text"
                    value={formData.panchayatrajsevarth_id || ''}
                    onChange={(e) => setFormData({ ...formData, panchayatrajsevarth_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.employeeIdInternal')}
                  </label>
                  <input
                    type="text"
                    value={formData.emp_id || ''}
                    onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Employee ID cannot be changed during edit</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.employeeName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employee_name || ''}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.dateOfBirth')}
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.ddoCode')}
                  </label>
                  <input
                    type="text"
                    value={formData.ddo_code || ''}
                    onChange={(e) => setFormData({ ...formData, ddo_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.Cadre')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.Cadre || ''}
                    onChange={(e) => setFormData({ ...formData, Cadre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                   <option value="">Select Cadre</option>
                   <option value="C">C</option>
                   <option value="D">D</option>
                  </select>
                  {formData.Cadre && (
                    <p className="text-xs text-gray-500 mt-1">
                    Currently selected Cadre: <span className="font-semibold">{formData.Cadre}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.dateOfJoining')}
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_joining || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.retirementDate')}
                  </label>
                  <input
                    type="date"
                    value={calculateRetirementDate(formData.date_of_birth, formData.Cadre) || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    title="Retirement date is auto-calculated based on date of birth and Cadre"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated: Cadre C = 58 years, Cadre D = 60 years (last day of month)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.retirementReason')}
                  </label>
                  <select
                    value={formData.reason || ''}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectReason')}</option>
                    <option value="मृत्यू झाल्याने">मृत्यू झाल्याने</option>
                    <option value="नियत वयोमान">नियत वयोमान</option>
                    <option value="स्वेच्छा सेवा निवृत्ती">स्वेच्छा सेवा निवृत्ती</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.department')}
                  </label>
                  <select
                    value={formData.dept_id || ''}
                    onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectDepartment')}</option>
                    {department.map(dept => (
                      <option key={dept.dept_id} value={dept.dept_id}>{dept.department}</option>
                    ))}
                  </select>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.taluka')}
                  </label>
                  <select
                    value={formData.tal_id || ''}
                    onChange={(e) => setFormData({ ...formData, tal_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectTaluka')}</option>
                    {talukas.map(taluka => (
                      <option key={taluka.tal_id} value={taluka.tal_id}>{taluka.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.office')}
                  </label>
                  <select
                    value={formData.office_id || ''}
                    onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectOffice')}</option>
                    {offices.map(office => (
                      <option key={office.office_id} value={office.office_id}>{office.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('erms.assignedClerk')}
                  </label>
                  <select
                    value={formData.assigned_clerk || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_clerk: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('erms.selectClerk')}</option>
                    {clerks.map(clerk => (
                      <option key={clerk.user_id} value={clerk.user_id}>{clerk.name}</option>
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
                {isLoading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};