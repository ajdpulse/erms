import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3,
  Table,
  PieChart,
  TrendingUp,
  Filter,
  Save,
  Play,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings,
  Database,
  Users,
  Calendar,
  Building2,
  MapPin,
  FileText,
  X,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { ermsClient, supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface CustomReportsProps {
  user: SupabaseUser;
  onBack: () => void;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  report_type: 'bar' | 'pie' | 'line' | 'table';
  tables: string[];
  columns: string[];
  filters: any[];
  joins: any[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface TableInfo {
  table_name: string;
  display_name: string;
  icon: any;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  column_name: string;
  display_name: string;
  data_type: string;
}

export const CustomReports: React.FC<CustomReportsProps> = ({ user, onBack }) => {
  const { t } = useTranslation();
  const { userRole, userProfile } = usePermissions(user);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'results'>('create');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportColumns, setReportColumns] = useState<string[]>([]);
  
  // Report Builder States
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [reportType, setReportType] = useState<'bar' | 'pie' | 'line' | 'table'>('table');
  const [filters, setFilters] = useState<any[]>([]);
  const [joins, setJoins] = useState<any[]>([]);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [availableColumns, setAvailableColumns] = useState<{[key: string]: ColumnInfo[]}>({});
  
  // Data States
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<ReportTemplate[]>([]);

  useEffect(() => {
    fetchAvailableTables();
    fetchSavedTemplates();
  }, []);

  useEffect(() => {
    // Update available columns when tables are selected
    const columnsMap: {[key: string]: ColumnInfo[]} = {};
    selectedTables.forEach(tableName => {
      const table = availableTables.find(t => t.table_name === tableName);
      if (table) {
        columnsMap[tableName] = table.columns;
      }
    });
    setAvailableColumns(columnsMap);
  }, [selectedTables, availableTables]);

  const tableDefinitions: TableInfo[] = [
    {
      table_name: 'employee',
      display_name: t('customReports.employeeRecords', 'Employee Records'),
      icon: Users,
      columns: [
        { column_name: 'emp_id', display_name: t('erms.employeeId'), data_type: 'text' },
        { column_name: 'employee_name', display_name: t('erms.employeeName'), data_type: 'text' },
        { column_name: 'date_of_birth', display_name: t('erms.dateOfBirth'), data_type: 'date' },
        { column_name: 'retirement_date', display_name: t('erms.retirementDate'), data_type: 'date' },
        { column_name: 'reason', display_name: t('erms.retirementReason'), data_type: 'text' },
        { column_name: 'assigned_clerk', display_name: t('erms.assignedClerk'), data_type: 'text' },
        { column_name: 'dept_id', display_name: t('erms.departmentId'), data_type: 'text' },
        { column_name: 'office_id', display_name: t('erms.officeId'), data_type: 'text' },
        { column_name: 'department', display_name: t('erms.department'), data_type: 'text' },
        { column_name: 'designation', display_name: t('erms.designation'), data_type: 'text' }
      ]
    },
    {
      table_name: 'retirement_progress',
      display_name: t('customReports.retirementProgress', 'Retirement Progress Records'),
      icon: TrendingUp,
      columns: [
        { column_name: 'emp_id', display_name: t('erms.employeeId'), data_type: 'text' },
        { column_name: 'employee_name', display_name: t('erms.employeeName'), data_type: 'text' },
        { column_name: 'birth_certificate_submitted', display_name: t('retirementTracker.birthCertificate'), data_type: 'text' },
        { column_name: 'birth_document_submitted', display_name: t('retirementTracker.birthDocSubmitted'), data_type: 'text' },
        { column_name: 'medical_certificate', display_name: t('retirementTracker.medicalCertificate'), data_type: 'text' },
        { column_name: 'nomination', display_name: t('retirementTracker.nomination'), data_type: 'text' },
        { column_name: 'permanent_registration', display_name: t('retirementTracker.permanentRegistration'), data_type: 'text' },
        { column_name: 'computer_exam', display_name: t('retirementTracker.computerExam'), data_type: 'text' },
        { column_name: 'language_exam', display_name: t('retirementTracker.languageExam'), data_type: 'text' },
        { column_name: 'post_service_exam', display_name: t('retirementTracker.postServiceExam'), data_type: 'text' },
        { column_name: 'verification', display_name: t('retirementTracker.verification'), data_type: 'text' },
        { column_name: 'date_of_birth_verification', display_name: t('retirementTracker.dateOfBirthVerification'), data_type: 'text' },
        { column_name: 'computer_exam_passed', display_name: t('retirementTracker.computerExamPassed'), data_type: 'text' },
        { column_name: 'marathi_hindi_exam_exemption', display_name: t('retirementTracker.marathiHindiExamExemption'), data_type: 'text' },
        { column_name: 'verification_completed', display_name: t('retirementTracker.verificationCompleted'), data_type: 'text' },
        { column_name: 'undertaking_taken', display_name: t('retirementTracker.undertakingTaken'), data_type: 'text' },
        { column_name: 'no_objection_certificate', display_name: t('retirementTracker.noObjectionCertificate'), data_type: 'text' },
        { column_name: 'retirement_order', display_name: t('retirementTracker.retirementOrder'), data_type: 'text' },
        { column_name: 'overall_comment', display_name: t('retirementTracker.overallComment'), data_type: 'text' }
      ]
    },
    {
      table_name: 'pay_commission',
      display_name: t('customReports.payCommission', 'Pay Commission Records'),
      icon: TrendingUp,
      columns: [
        { column_name: 'emp_id', display_name: t('erms.employeeId'), data_type: 'text' },
        { column_name: 'employee_name', display_name: t('erms.employeeName'), data_type: 'text' },
        { column_name: 'fourth_pay_comission', display_name: t('customReports.fourthPayCommission', '4th Pay Commission'), data_type: 'text' },
        { column_name: 'fifth_pay_comission', display_name: t('customReports.fifthPayCommission', '5th Pay Commission'), data_type: 'text' },
        { column_name: 'sixth_pay_comission', display_name: t('customReports.sixthPayCommission', '6th Pay Commission'), data_type: 'text' },
        { column_name: 'seventh_pay_comission', display_name: t('customReports.seventhPayCommission', '7th Pay Commission'), data_type: 'text' },
        { column_name: 'comments', display_name: 'Comments', data_type: 'text' }
      ]
    },
    {
      table_name: 'group_insurance',
      display_name: t('customReports.groupInsurance', 'Group Insurance Records'),
      icon: Users,
      columns: [
        { column_name: 'emp_id', display_name: t('erms.employeeId'), data_type: 'text' },
        { column_name: 'employee_name', display_name: t('erms.employeeName'), data_type: 'text' },
        { column_name: 'year_1990', display_name: t('customReports.year1990', '1990 Year'), data_type: 'text' },
        { column_name: 'year_2003', display_name: t('customReports.year2003', '2003 Year'), data_type: 'text' },
        { column_name: 'year_2010', display_name: t('customReports.year2010', '2010 Year'), data_type: 'text' },
        { column_name: 'year_2020', display_name: t('customReports.year2020', '2020 Year'), data_type: 'text' },
        { column_name: 'overall_comments', display_name: 'Overall Comments', data_type: 'text' }
      ]
    },
    {
      table_name: 'employee_retirement',
      display_name: t('customReports.retirementProcessing', 'Retirement Processing'),
      icon: Calendar,
      columns: [
        { column_name: 'emp_id', display_name: t('erms.employeeId'), data_type: 'text' },
        { column_name: 'employee_name', display_name: t('erms.employeeName'), data_type: 'text' },
        { column_name: 'status', display_name: t('erms.status'), data_type: 'text' },
        { column_name: 'date_of_submission', display_name: t('erms.dateOfSubmission'), data_type: 'date' },
        { column_name: 'type_of_pension', display_name: t('erms.typeOfPension'), data_type: 'text' },
        { column_name: 'department', display_name: t('erms.department'), data_type: 'text' },
        { column_name: 'designation', display_name: t('erms.designation'), data_type: 'text' },
        { column_name: 'retirement_date', display_name: t('erms.retirementDate'), data_type: 'date' },
        { column_name: 'age', display_name: t('erms.age'), data_type: 'number' }
      ]
    },
    {
      table_name: 'department',
      display_name: t('customReports.departments', 'Departments'),
      icon: Building2,
      columns: [
        { column_name: 'dept_id', display_name: t('erms.departmentId'), data_type: 'text' },
        { column_name: 'department', display_name: t('erms.departmentName'), data_type: 'text' },
        { column_name: 'created_at', display_name: t('erms.createdDate'), data_type: 'date' }
      ]
    },
    {
      table_name: 'designations',
      display_name: t('customReports.designations', 'Designations'),
      icon: FileText,
      columns: [
        { column_name: 'designation_id', display_name: t('erms.designationId'), data_type: 'text' },
        { column_name: 'designation', display_name: t('erms.designationName'), data_type: 'text' },
        { column_name: 'created_at', display_name: t('erms.createdDate'), data_type: 'date' }
      ]
    },
    {
      table_name: 'office_locations',
      display_name: t('customReports.officeLocations', 'Office Locations'),
      icon: MapPin,
      columns: [
        { column_name: 'office_id', display_name: t('erms.officeId'), data_type: 'text' },
        { column_name: 'name', display_name: t('erms.officeName'), data_type: 'text' },
        { column_name: 'created_at', display_name: t('erms.createdDate'), data_type: 'date' }
      ]
    },
    {
      table_name: 'talukas',
      display_name: t('customReports.talukas', 'Talukas'),
      icon: MapPin,
      columns: [
        { column_name: 'tal_id', display_name: t('erms.talukaId'), data_type: 'text' },
        { column_name: 'name', display_name: t('erms.talukaName'), data_type: 'text' },
        { column_name: 'created_at', display_name: t('erms.createdDate'), data_type: 'date' }
      ]
    }
  ];

  const fetchAvailableTables = async () => {
    setAvailableTables(tableDefinitions);
  };

  const fetchSavedTemplates = async () => {
    try {
      const { data, error } = await ermsClient
        .from('report_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSavedTemplates(data || []);
    } catch (error) {
      console.error('Error fetching saved templates:', error);
    }
  };

  const executeReport = async () => {
    if (selectedTables.length === 0 || selectedColumns.length === 0) {
      alert(t('customReports.selectTablesColumns', 'Please select at least one table and column'));
      return;
    }

    setIsLoading(true);
    try {
      let query;
      let data;
      
      if (selectedTables.length === 1) {
        // Single table query
        const cleanColumns = selectedColumns.map(col => {
          const parts = col.split('.');
          return parts.length > 1 ? parts[1] : col;
        });
        
        query = ermsClient.from(selectedTables[0]).select(cleanColumns.join(', '));
        
        // Apply filters if any
        filters.forEach(filter => {
          if (filter.column && filter.operator && filter.value) {
            const cleanFilterColumn = filter.column.includes('.') ? 
              filter.column.split('.')[1] : filter.column;
            
            switch (filter.operator) {
              case 'eq':
                query = query.eq(cleanFilterColumn, filter.value);
                break;
              case 'neq':
                query = query.neq(cleanFilterColumn, filter.value);
                break;
              case 'gt':
                query = query.gt(cleanFilterColumn, filter.value);
                break;
              case 'lt':
                query = query.lt(cleanFilterColumn, filter.value);
                break;
              case 'like':
                query = query.ilike(cleanFilterColumn, `%${filter.value}%`);
                break;
            }
          }
        });

        const result = await query;
        if (result.error) throw result.error;
        data = result.data;
        
      } else if (selectedTables.length === 2) {
        // Two table join - implement common joins
        const [table1, table2] = selectedTables;
        
        // Define common join relationships
        const joinRelationships = {
          'employee-pay_commission': {
            table1: 'employee',
            table2: 'pay_commission', 
            joinKey: 'emp_id'
          },
          'employee-retirement_progress': {
            table1: 'employee',
            table2: 'retirement_progress',
            joinKey: 'emp_id'
          },
          'employee-group_insurance': {
            table1: 'employee',
            table2: 'group_insurance',
            joinKey: 'emp_id'
          },
          'employee-employee_retirement': {
            table1: 'employee',
            table2: 'employee_retirement',
            joinKey: 'emp_id'
          },
          'retirement_progress-pay_commission': {
            table1: 'retirement_progress',
            table2: 'pay_commission',
            joinKey: 'emp_id'
          },
          'retirement_progress-group_insurance': {
            table1: 'retirement_progress',
            table2: 'group_insurance',
            joinKey: 'emp_id'
          },
          'pay_commission-group_insurance': {
            table1: 'pay_commission',
            table2: 'group_insurance',
            joinKey: 'emp_id'
          }
        };
        
        const joinKey = `${table1}-${table2}`;
        const reverseJoinKey = `${table2}-${table1}`;
        const relationship = joinRelationships[joinKey] || joinRelationships[reverseJoinKey];
        
        if (relationship) {
          // Build select string with table prefixes
          const selectColumns = selectedColumns.map(col => {
            const [tableName, columnName] = col.split('.');
            return `${tableName}!inner(${columnName})`;
          });
          
          // Use the first table as the base and join with the second
          const baseTable = relationship.table1;
          const joinTable = relationship.table2;
          
          // Create a more specific select query for joins
          const baseColumns = selectedColumns
            .filter(col => col.startsWith(`${baseTable}.`))
            .map(col => col.split('.')[1]);
          
          const joinColumns = selectedColumns
            .filter(col => col.startsWith(`${joinTable}.`))
            .map(col => col.split('.')[1]);
          
          if (baseColumns.length > 0 && joinColumns.length > 0) {
            const selectString = [
              ...baseColumns,
              `${joinTable}!inner(${joinColumns.join(',')})`
            ].join(',');
            
            query = ermsClient.from(baseTable).select(selectString);
            
            const result = await query;
            if (result.error) throw result.error;
            
            // Flatten the joined data
            data = result.data?.map(row => {
              const flatRow = { ...row };
              if (row[joinTable] && Array.isArray(row[joinTable]) && row[joinTable].length > 0) {
                // Take the first joined record
                Object.assign(flatRow, row[joinTable][0]);
              } else if (row[joinTable] && !Array.isArray(row[joinTable])) {
                Object.assign(flatRow, row[joinTable]);
              }
              delete flatRow[joinTable];
              return flatRow;
            }) || [];
          } else {
            throw new Error('Please select columns from both tables for joining');
          }
        } else {
          throw new Error(`Join relationship not defined between ${table1} and ${table2}`);
        }
      } else {
        throw new Error('Multi-table joins (more than 2 tables) are not supported yet');
      }

      // Set the column names for display
      const cleanColumns = selectedColumns.map(col => {
        const parts = col.split('.');
        return parts.length > 1 ? parts[1] : col;
      });
      
      setReportData(data);
      setReportColumns(cleanColumns);
      setActiveTab('results');
    } catch (error) {
      console.error('Error executing report:', error);
      alert(t('common.error') + ': ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!reportName.trim()) {
      alert(t('customReports.enterReportName', 'Please enter a report name'));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await ermsClient
        .from('report_templates')
        .insert({
          name: reportName,
          description: reportDescription,
          report_type: reportType,
          tables: selectedTables,
          columns: selectedColumns,
          filters: filters,
          joins: joins,
          user_id: user.id
        });

      if (error) throw error;
      
      await fetchSavedTemplates();
      setShowSaveModal(false);
      setReportName('');
      setReportDescription('');
    } catch (error) {
      console.error('Error saving template:', error);
      alert(t('common.error') + ': ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplate = (template: ReportTemplate) => {
    setSelectedTables(template.tables);
    setSelectedColumns(template.columns);
    setReportType(template.report_type);
    setFilters(template.filters);
    setJoins(template.joins);
    setActiveTab('create');
  };

  const addFilter = () => {
    setFilters([...filters, { column: '', operator: 'eq', value: '' }]);
  };

  const updateFilter = (index: number, field: string, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const addJoin = () => {
    if (selectedTables.length >= 2) {
      setJoins([...joins, { 
        table1: selectedTables[0], 
        table2: selectedTables[1], 
        joinType: 'inner',
        table1Column: '',
        table2Column: ''
      }]);
    }
  };

  const updateJoin = (index: number, field: string, value: string) => {
    const newJoins = [...joins];
    newJoins[index] = { ...newJoins[index], [field]: value };
    setJoins(newJoins);
  };

  const removeJoin = (index: number) => {
    setJoins(joins.filter((_, i) => i !== index));
  };

  const renderBarChart = () => {
    if (reportData.length === 0) return null;

    const maxValue = Math.max(...reportData.map(item => Object.values(item).find(val => typeof val === 'number') as number || 0));

    return (
      <div className="space-y-4">
        {reportData.slice(0, 20).map((item, index) => {
          const label = Object.values(item)[0] as string;
          const value = Object.values(item).find(val => typeof val === 'number') as number || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-32 text-sm font-medium text-gray-700 truncate">{label}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    {value > 0 && value}
                  </div>
                </div>
              </div>
              <div className="w-16 text-sm text-gray-500 text-right">{value}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTable = () => {
    if (reportData.length === 0) return null;

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {reportColumns.map((column) => (
                <th key={column} className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {reportColumns.map((column) => (
                  <td key={column} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                    {row[column] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('customReports.title', 'Custom Reports')}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t('customReports.subtitle', 'Create interactive reports and analytics from your data')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchSavedTemplates}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm font-medium">{t('erms.refresh')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'create'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>{t('customReports.createReport', 'Create Report')}</span>
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'templates'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Save className="h-4 w-4" />
                <span>{t('customReports.savedTemplates', 'Saved Templates')}</span>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'results'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>{t('customReports.results', 'Results')}</span>
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Create Report Tab */}
            {activeTab === 'create' && (
              <div className="space-y-6">
                {/* Report Type Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('customReports.selectReportType', 'Select Report Type')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { type: 'table', icon: Table, label: t('customReports.table', 'Table') },
                      { type: 'bar', icon: BarChart3, label: t('customReports.barChart', 'Bar Chart') },
                      { type: 'pie', icon: PieChart, label: t('customReports.pieChart', 'Pie Chart') },
                      { type: 'line', icon: TrendingUp, label: t('customReports.lineChart', 'Line Chart') }
                    ].map((option) => (
                      <button
                        key={option.type}
                        onClick={() => setReportType(option.type as any)}
                        className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                          reportType === option.type
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <option.icon className="h-8 w-8 mx-auto mb-2" />
                        <div className="text-sm font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('customReports.selectTables', 'Select Data Sources')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableTables.map((table) => (
                      <div
                        key={table.table_name}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedTables.includes(table.table_name)
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (selectedTables.includes(table.table_name)) {
                            setSelectedTables(selectedTables.filter(t => t !== table.table_name));
                          } else {
                            setSelectedTables([...selectedTables, table.table_name]);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <table.icon className="h-6 w-6 text-teal-600" />
                          <div>
                            <div className="font-medium text-gray-900">{table.display_name}</div>
                            <div className="text-sm text-gray-500">{table.columns.length} columns</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column Selection */}
                {selectedTables.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {t('customReports.selectColumns', 'Select Columns')}
                    </h3>
                    <div className="space-y-4">
                      {selectedTables.map((tableName) => {
                        const table = availableTables.find(t => t.table_name === tableName);
                        if (!table) return null;

                        return (
                          <div key={tableName} className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3">{table.display_name}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {table.columns.map((column) => (
                                <label key={column.column_name} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedColumns.includes(`${tableName}.${column.column_name}`)}
                                    onChange={(e) => {
                                      const columnKey = `${tableName}.${column.column_name}`;
                                      if (e.target.checked) {
                                        setSelectedColumns([...selectedColumns, columnKey]);
                                      } else {
                                        setSelectedColumns(selectedColumns.filter(c => c !== columnKey));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  <span className="text-sm text-gray-700">{column.display_name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('customReports.filters', 'Filters')}
                    </h3>
                    <button
                      onClick={addFilter}
                      className="flex items-center space-x-2 px-3 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">{t('customReports.addFilter', 'Add Filter')}</span>
                    </button>
                  </div>
                  
                  {filters.length > 0 && (
                    <div className="space-y-3">
                      {filters.map((filter, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                          <select
                            value={filter.column}
                            onChange={(e) => updateFilter(index, 'column', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="">{t('customReports.selectColumn', 'Select Column')}</option>
                            {selectedColumns.map((column) => (
                              <option key={column} value={column}>{column}</option>
                            ))}
                          </select>
                          
                          <select
                            value={filter.operator}
                            onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="eq">{t('customReports.equals', 'Equals')}</option>
                            <option value="neq">{t('customReports.notEquals', 'Not Equals')}</option>
                            <option value="gt">{t('customReports.greaterThan', 'Greater Than')}</option>
                            <option value="lt">{t('customReports.lessThan', 'Less Than')}</option>
                            <option value="like">{t('customReports.contains', 'Contains')}</option>
                          </select>
                          
                          <input
                            type="text"
                            value={filter.value}
                            onChange={(e) => updateFilter(index, 'value', e.target.value)}
                            placeholder={t('customReports.enterValue', 'Enter value')}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                          
                          <button
                            onClick={() => removeFilter(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Table Joins */}
                {selectedTables.length >= 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Table Joins</h3>
                      <button
                        onClick={addJoin}
                        className="flex items-center space-x-2 px-3 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Add Join</span>
                      </button>
                    </div>
                    
                    {selectedTables.length === 2 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Automatic Join Available</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Tables "{selectedTables[0]}" and "{selectedTables[1]}" can be automatically joined using employee ID (emp_id).
                          Select columns from both tables and click "Generate Report" to see the joined data.
                        </p>
                      </div>
                    )}
                    
                    {joins.length > 0 && (
                      <div className="space-y-3">
                        {joins.map((join, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                            <select
                              value={join.table1}
                              onChange={(e) => updateJoin(index, 'table1', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                              {selectedTables.map((table) => (
                                <option key={table} value={table}>{table}</option>
                              ))}
                            </select>
                            
                            <select
                              value={join.table1Column}
                              onChange={(e) => updateJoin(index, 'table1Column', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                              <option value="">Select Column</option>
                              {availableColumns[join.table1]?.map((column) => (
                                <option key={column.column_name} value={column.column_name}>
                                  {column.display_name}
                                </option>
                              ))}
                            </select>
                            
                            <span className="text-sm text-gray-500">=</span>
                            
                            <select
                              value={join.table2}
                              onChange={(e) => updateJoin(index, 'table2', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                              {selectedTables.map((table) => (
                                <option key={table} value={table}>{table}</option>
                              ))}
                            </select>
                            
                            <select
                              value={join.table2Column}
                              onChange={(e) => updateJoin(index, 'table2Column', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                              <option value="">Select Column</option>
                              {availableColumns[join.table2]?.map((column) => (
                                <option key={column.column_name} value={column.column_name}>
                                  {column.display_name}
                                </option>
                              ))}
                            </select>
                            
                            <button
                              onClick={() => removeJoin(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowSaveModal(true)}
                    disabled={selectedTables.length === 0 || selectedColumns.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    <span>{t('customReports.saveTemplate', 'Save Template')}</span>
                  </button>
                  
                  <button
                    onClick={executeReport}
                    disabled={selectedTables.length === 0 || selectedColumns.length === 0 || isLoading}
                    className="flex items-center space-x-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>{t('customReports.generateReport', 'Generate Report')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Saved Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('customReports.yourSavedTemplates', 'Your Saved Templates')}
                  </h3>
                </div>
                
                {savedTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <Save className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('customReports.noTemplates', 'No saved templates')}
                    </h3>
                    <p className="text-gray-500">
                      {t('customReports.createFirstTemplate', 'Create your first report template to get started.')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedTemplates.map((template) => (
                      <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-teal-600" />
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            template.report_type === 'table' ? 'bg-blue-100 text-blue-800' :
                            template.report_type === 'bar' ? 'bg-green-100 text-green-800' :
                            template.report_type === 'pie' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {template.report_type}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        
                        <div className="text-xs text-gray-500 mb-3">
                          <div>Tables: {template.tables.join(', ')}</div>
                          <div>Columns: {template.columns.length}</div>
                          <div>Created: {new Date(template.created_at).toLocaleDateString()}</div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => loadTemplate(template)}
                            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
                          >
                            <Play className="h-3 w-3" />
                            <span className="text-xs">{t('customReports.load', 'Load')}</span>
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-all duration-200">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('customReports.reportResults', 'Report Results')}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {reportData.length} {t('customReports.records', 'records')}
                    </span>
                    <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200">
                      <Download className="h-4 w-4" />
                      <span className="text-sm">{t('common.export')}</span>
                    </button>
                  </div>
                </div>
                
                {reportData.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('customReports.noResults', 'No results to display')}
                    </h3>
                    <p className="text-gray-500">
                      {t('customReports.generateReportFirst', 'Generate a report to see results here.')}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    {reportType === 'table' && renderTable()}
                    {reportType === 'bar' && renderBarChart()}
                    {(reportType === 'pie' || reportType === 'line') && (
                      <div className="text-center py-8">
                        <div className="text-gray-500">
                          {reportType === 'pie' ? 'Pie chart' : 'Line chart'} visualization coming soon...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('customReports.saveReportTemplate', 'Save Report Template')}
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('customReports.templateName', 'Template Name')}
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder={t('customReports.enterTemplateName', 'Enter template name')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('customReports.description', 'Description')}
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder={t('customReports.enterDescription', 'Enter description (optional)')}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveTemplate}
                disabled={isLoading || !reportName.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
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