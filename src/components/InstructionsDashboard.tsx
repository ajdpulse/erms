import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen,
  User,
  Shield,
  DollarSign,
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';
import { ermsClient } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface InstructionsDashboardProps {
  user: SupabaseUser;
  onBack: () => void;
}

interface Instruction {
  id: string;
  name: string;
  instructions: string;
  created_at?: string;
  updated_at?: string;
}

export const InstructionsDashboard: React.FC<InstructionsDashboardProps> = ({ user, onBack }) => {
  const { t } = useTranslation();
  const { userRole } = usePermissions(user);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'clerk' | 'admin' | 'payCommission'>('clerk');
  
  // Data states
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [filteredInstructions, setFilteredInstructions] = useState<Instruction[]>([]);

  useEffect(() => {
    fetchInstructions();
  }, []);

  useEffect(() => {
    filterInstructions();
  }, [instructions, searchTerm, activeTab]);

  const fetchInstructions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await ermsClient
        .from('instructions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setInstructions(data || []);
    } catch (error) {
      console.error('Error fetching instructions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterInstructions = () => {
    let filtered = instructions;

    // Filter by tab category
    if (activeTab === 'clerk') {
      filtered = filtered.filter(inst => 
        inst.name.toLowerCase().includes('clerk') || 
        inst.name.toLowerCase().includes('लिपिक') ||
        inst.name.toLowerCase().includes('कर्मचारी')
      );
    } else if (activeTab === 'admin') {
      filtered = filtered.filter(inst => 
        inst.name.toLowerCase().includes('admin') || 
        inst.name.toLowerCase().includes('प्रशासक') ||
        inst.name.toLowerCase().includes('अधिकारी')
      );
    } else if (activeTab === 'payCommission') {
      filtered = filtered.filter(inst => 
        inst.name.toLowerCase().includes('pay') || 
        inst.name.toLowerCase().includes('commission') ||
        inst.name.toLowerCase().includes('वेतन') ||
        inst.name.toLowerCase().includes('आयोग')
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(inst =>
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.instructions.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredInstructions(filtered);
  };

  const tabs = [
    {
      id: 'clerk' as const,
      name: t('erms.clerkInstructions', 'Clerk Instructions'),
      nameMarathi: 'लिपिक सूचना',
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'admin' as const,
      name: t('erms.adminInstructions', 'Admin Instructions'),
      nameMarathi: 'प्रशासक सूचना',
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500'
    },
    {
      id: 'payCommission' as const,
      name: t('erms.payCommissionInstructions', 'Pay Commission'),
      nameMarathi: 'वेतन आयोग',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('erms.instructionsGuidelines', 'Instructions & Guidelines')}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t('erms.systemInstructionsDesc', 'System instructions and operational guidelines')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchInstructions}
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
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? `${tab.borderColor} ${tab.color}`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.nameMarathi}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('erms.searchInstructions', 'Search instructions...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Instructions Content */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredInstructions.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('erms.noInstructionsFound', 'No instructions found')}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm 
                      ? t('erms.noInstructionsMatchSearch', 'No instructions match your search criteria.')
                      : t('erms.noInstructionsAvailable', 'No instructions available for this category.')
                    }
                  </p>
                </div>
              ) : (
                filteredInstructions.map((instruction, index) => (
                  <div key={instruction.id || index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className={`${tabs.find(t => t.id === activeTab)?.bgColor} p-3 rounded-lg flex-shrink-0`}>
                        {React.createElement(tabs.find(t => t.id === activeTab)?.icon || BookOpen, {
                          className: `h-6 w-6 ${tabs.find(t => t.id === activeTab)?.color}`
                        })}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {instruction.name}
                        </h3>
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <div className="whitespace-pre-wrap">
                            {instruction.instructions}
                          </div>
                        </div>
                        {instruction.updated_at && (
                          <div className="mt-4 text-xs text-gray-500">
                            {t('erms.lastUpdated', 'Last updated')}: {new Date(instruction.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Important Note */}
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-lg font-semibold text-amber-900 mb-2">
                    {t('erms.importantNote', 'Important Note')}
                  </h4>
                  <p className="text-amber-800 leading-relaxed">
                    {t('erms.instructionsNote', 'These instructions are regularly updated to reflect current procedures and policies. Please ensure you are following the latest version of the guidelines relevant to your role.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};