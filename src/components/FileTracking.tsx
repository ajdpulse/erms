import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileText,
  Send,
  RotateCcw,
  CheckCircle,
  Clock,
  User as UserIcon,
  Calendar,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  History
} from 'lucide-react';
import { supabase, ermsClient } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface FileTrackingProps {
  isOpen: boolean;
  onClose: () => void;
  retirementId: string;
  employeeName: string;
  currentUser: User;
  userRole: string | null;
  employeeData?: any; // Full employee record for validation
}

interface FileTracking {
  id: string;
  retirement_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
  current_level: string;
  status: string;
  comments: string | null;
  days_held: number;
  assigned_to_name?: string;
  assigned_by_name?: string;
}

interface FileHistory {
  id: string;
  retirement_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  from_level: string | null;
  to_level: string | null;
  action: string;
  comments: string | null;
  created_at: string;
  from_user_name?: string;
  to_user_name?: string;
}

interface UserOption {
  user_id: string;
  name: string;
  role_name: string;
}

export const FileTracking: React.FC<FileTrackingProps> = ({
  isOpen,
  onClose,
  retirementId,
  employeeName,
  currentUser,
  userRole,
  employeeData
}) => {
  const { t } = useTranslation();
  const [currentTracking, setCurrentTracking] = useState<FileTracking | null>(null);
  const [fileHistory, setFileHistory] = useState<FileHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMode, setActionMode] = useState<'view' | 'forward' | 'revert' | 'reassign'>('view');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [comments, setComments] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);

  const isAssignedToCurrentUser = currentTracking?.assigned_to_user_id === currentUser.id;

  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (!employeeData) return 0;

    const progressFields = [
      'retirement_progress_status',
      'pay_commission_status',
      'group_insurance_status',
      'date_of_submission',
      'type_of_pension',
      'date_of_pension_case_approval',
      'date_of_actual_benefit_provided_for_group_insurance',
      'date_of_benefit_provided_for_gratuity',
      'date_of_actual_benefit_provided_for_leave_encashment',
      'date_of_actual_benefit_provided_for_medical_allowance_if_applic',
      'date_of_benefit_provided_for_hometown_travel_allowance_if_appli',
      'date_of_actual_benefit_provided_for_pending_travel_allowance_if'
    ];

    const filledFields = progressFields.filter(field => {
      const value = employeeData[field];
      return value !== null && value !== undefined && value !== '';
    });

    return Math.round((filledFields.length / progressFields.length) * 100);
  };

  useEffect(() => {
    if (isOpen) {
      loadFileTracking();
      loadFileHistory();
    }
  }, [isOpen, retirementId]);

  const loadFileTracking = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load the most recent tracking record (any status)
      const { data, error: fetchError } = await ermsClient
        .from('retirement_file_tracking')
        .select('*')
        .eq('retirement_id', retirementId)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const { data: assignedToUser } = await supabase
          .from('user_roles')
          .select('name')
          .eq('user_id', data.assigned_to_user_id)
          .maybeSingle();

        const { data: assignedByUser } = await supabase
          .from('user_roles')
          .select('name')
          .eq('user_id', data.assigned_by_user_id)
          .maybeSingle();

        setCurrentTracking({
          ...data,
          assigned_to_name: assignedToUser?.name || 'Unknown',
          assigned_by_name: assignedByUser?.name || 'Unknown'
        });
      } else {
        setCurrentTracking(null);
      }
    } catch (err) {
      console.error('Error loading file tracking:', err);
      setError('Failed to load file tracking information');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileHistory = async () => {
    try {
      const { data, error: fetchError } = await ermsClient
        .from('retirement_file_history')
        .select('*')
        .eq('retirement_id', retirementId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const historyWithNames = await Promise.all(
        (data || []).map(async (item) => {
          let fromUserName = 'System';
          let toUserName = 'Unknown';

          if (item.from_user_id) {
            const { data: fromUser } = await supabase
              .from('user_roles')
              .select('name')
              .eq('user_id', item.from_user_id)
              .maybeSingle();
            fromUserName = fromUser?.name || 'Unknown';
          }

          if (item.to_user_id) {
            const { data: toUser } = await supabase
              .from('user_roles')
              .select('name')
              .eq('user_id', item.to_user_id)
              .maybeSingle();
            toUserName = toUser?.name || 'Unknown';
          }

          return {
            ...item,
            from_user_name: fromUserName,
            to_user_name: toUserName
          };
        })
      );

      setFileHistory(historyWithNames);
    } catch (err) {
      console.error('Error loading file history:', err);
    }
  };

  const loadAvailableUsers = async (targetLevel: string) => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', targetLevel)
        .maybeSingle();

      if (rolesError) throw rolesError;
      if (!rolesData) {
        setError(`Role '${targetLevel}' not found`);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_roles')
        .select('user_id, name')
        .eq('role_id', rolesData.id);

      if (fetchError) throw fetchError;

      const users = (data || []).map(item => ({
        user_id: item.user_id,
        name: item.name,
        role_name: targetLevel
      }));

      setAvailableUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load available users');
    }
  };

  const getNextLevel = (currentLevel: string): string => {
    const hierarchy = ['clerk', 'officer', 'admin', 'superadmin'];
    const currentIndex = hierarchy.indexOf(currentLevel);
    return currentIndex < hierarchy.length - 1 ? hierarchy[currentIndex + 1] : currentLevel;
  };

  const getPreviousLevel = (currentLevel: string): string => {
    const hierarchy = ['clerk', 'officer', 'admin', 'superadmin'];
    const currentIndex = hierarchy.indexOf(currentLevel);
    return currentIndex > 0 ? hierarchy[currentIndex - 1] : currentLevel;
  };

  const handleForward = () => {
    if (!currentTracking) return;
    const nextLevel = getNextLevel(currentTracking.current_level);
    setActionMode('forward');
    loadAvailableUsers(nextLevel);
  };

  const handleRevert = () => {
    if (!currentTracking) return;
    const prevLevel = getPreviousLevel(currentTracking.current_level);
    setActionMode('revert');
    loadAvailableUsers(prevLevel);
  };

  const handleReassign = () => {
    if (!currentTracking) return;
    setActionMode('reassign');
    loadAvailableUsers(currentTracking.current_level);
  };

  const handleSubmitAction = async () => {
    if (!selectedUser || !currentTracking) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const targetLevel = actionMode === 'forward'
        ? getNextLevel(currentTracking.current_level)
        : actionMode === 'revert'
        ? getPreviousLevel(currentTracking.current_level)
        : currentTracking.current_level; // reassign stays at same level

      // Update current tracking status
      await ermsClient
        .from('retirement_file_tracking')
        .update({
          status: actionMode === 'forward' ? 'completed' :
                  actionMode === 'revert' ? 'reverted' :
                  'reassigned'
        })
        .eq('id', currentTracking.id);

      const { error: insertTrackingError } = await ermsClient
        .from('retirement_file_tracking')
        .insert({
          retirement_id: retirementId,
          assigned_to_user_id: selectedUser,
          assigned_by_user_id: currentUser.id,
          current_level: targetLevel,
          status: 'assigned',
          comments: comments || null
        });

      if (insertTrackingError) throw insertTrackingError;

      const { error: insertHistoryError } = await ermsClient
        .from('retirement_file_history')
        .insert({
          retirement_id: retirementId,
          from_user_id: currentUser.id,
          to_user_id: selectedUser,
          from_level: currentTracking.current_level,
          to_level: targetLevel,
          action: actionMode === 'forward' ? 'forwarded' :
                  actionMode === 'revert' ? 'reverted' :
                  'reassigned',
          comments: comments || null
        });

      if (insertHistoryError) throw insertHistoryError;

      setComments('');
      setSelectedUser('');
      setActionMode('view');
      await loadFileTracking();
      await loadFileHistory();
    } catch (err) {
      console.error('Error submitting action:', err);
      setError('Failed to process file action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTracking = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Check if file is 100% complete
      const completionPercentage = calculateCompletionPercentage();
      if (completionPercentage < 100) {
        setError(`File must be 100% complete before starting tracking. Current completion: ${completionPercentage}%`);
        setIsSubmitting(false);
        return;
      }

      // Clerks start tracking - assign to officer
      if (userRole === 'clerk') {
        loadAvailableUsers('officer');
      } else {
        // Fallback for other roles (shouldn't happen normally)
        loadAvailableUsers('officer');
      }
      setActionMode('forward');
    } catch (err) {
      console.error('Error starting tracking:', err);
      setError('Failed to start file tracking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitialAssignment = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Determine the initial level based on who is starting
      const initialLevel = userRole === 'clerk' ? 'officer' : 'officer';

      const { error: insertTrackingError } = await ermsClient
        .from('retirement_file_tracking')
        .insert({
          retirement_id: retirementId,
          assigned_to_user_id: selectedUser,
          assigned_by_user_id: currentUser.id,
          current_level: initialLevel,
          status: 'assigned',
          comments: comments || null
        });

      if (insertTrackingError) throw insertTrackingError;

      const { error: insertHistoryError } = await ermsClient
        .from('retirement_file_history')
        .insert({
          retirement_id: retirementId,
          from_user_id: currentUser.id,
          to_user_id: selectedUser,
          from_level: userRole,
          to_level: initialLevel,
          action: 'assigned',
          comments: comments || null
        });

      if (insertHistoryError) throw insertHistoryError;

      setComments('');
      setSelectedUser('');
      setActionMode('view');
      await loadFileTracking();
      await loadFileHistory();
    } catch (err) {
      console.error('Error assigning file:', err);
      setError('Failed to assign file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'clerk': return 'bg-blue-100 text-blue-800';
      case 'officer': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'superadmin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'forwarded': return <ArrowRight className="h-4 w-4" />;
      case 'reverted': return <ArrowLeft className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'assigned': return <Send className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">File Tracking</h3>
              <p className="text-sm text-gray-600">{employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !currentTracking && actionMode === 'view' ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Active File Tracking</h4>
              <p className="text-gray-600 mb-6">This file has not been assigned for tracking yet.</p>
              {userRole === 'clerk' && (
                <button
                  onClick={handleStartTracking}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Start File Tracking
                </button>
              )}
            </div>
          ) : actionMode === 'view' && currentTracking ? (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Current Assignment</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      currentTracking.status === 'assigned' ? 'bg-green-100 text-green-800' :
                      currentTracking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {currentTracking.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <UserIcon className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Assigned To</p>
                      <p className="font-semibold text-gray-900">{currentTracking.assigned_to_name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(currentTracking.current_level)}`}>
                          {currentTracking.current_level.toUpperCase()}
                        </span>
                        {isAssignedToCurrentUser && (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <UserIcon className="h-5 w-5 text-purple-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Assigned By</p>
                      <p className="font-semibold text-gray-900">{currentTracking.assigned_by_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Assigned On</p>
                      <p className="font-semibold text-gray-900">{formatDate(currentTracking.assigned_at)}</p>
                      <p className="text-sm text-orange-600 mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {currentTracking.days_held} days held
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className={`h-5 w-5 rounded-full mt-1 flex items-center justify-center ${
                      userRole === 'clerk' ? 'bg-blue-500' :
                      userRole === 'officer' ? 'bg-green-500' :
                      userRole === 'admin' ? 'bg-purple-500' :
                      'bg-red-500'
                    }`}>
                      <UserIcon className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Your Role</p>
                      <p className="font-semibold text-gray-900">{userRole?.toUpperCase() || 'UNKNOWN'}</p>
                    </div>
                  </div>
                  {currentTracking.comments && (
                    <div className="md:col-span-2 flex items-start space-x-3">
                      <MessageSquare className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Comments</p>
                        <p className="text-gray-900">{currentTracking.comments}</p>
                      </div>
                    </div>
                  )}
                </div>

                {currentTracking.status === 'completed' ? (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-lg font-semibold text-green-900">File Processing Completed</h5>
                          <p className="text-sm text-green-700 mt-1">
                            This file was completed by <span className="font-semibold">{currentTracking.assigned_to_name}</span> ({currentTracking.current_level.toUpperCase()})
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Completed on: {formatDate(currentTracking.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isAssignedToCurrentUser && (
                  <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                    {(currentTracking.current_level === 'admin' || currentTracking.current_level === 'superadmin') && (
                      <button
                        onClick={async () => {
                          try {
                            setIsSubmitting(true);
                            await ermsClient
                              .from('retirement_file_tracking')
                              .update({ status: 'completed' })
                              .eq('id', currentTracking.id);

                            await ermsClient
                              .from('retirement_file_history')
                              .insert({
                                retirement_id: retirementId,
                                from_user_id: currentUser.id,
                                to_user_id: null,
                                from_level: currentTracking.current_level,
                                to_level: null,
                                action: 'completed',
                                comments: 'File processing completed'
                              });

                            await loadFileTracking();
                            await loadFileHistory();
                          } catch (err) {
                            console.error('Error completing file:', err);
                            setError('Failed to complete file');
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete File Processing</span>
                      </button>
                    )}
                    <button
                      onClick={handleReassign}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                    >
                      <UserIcon className="h-4 w-4" />
                      <span>Reassign</span>
                    </button>
                    {currentTracking.current_level !== 'superadmin' && (
                      <button
                        onClick={handleForward}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                      >
                        <Send className="h-4 w-4" />
                        <span>Forward to Next Level</span>
                      </button>
                    )}
                    <button
                      onClick={handleRevert}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Revert to Previous Level</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <History className="h-5 w-5 text-gray-600" />
                  <h4 className="text-lg font-semibold text-gray-900">File Movement History</h4>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {fileHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No history available</p>
                  ) : (
                    fileHistory.map((history) => (
                      <div key={history.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1">
                              {getActionIcon(history.action)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900">{history.from_user_name}</span>
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                <span className="font-medium text-gray-900">{history.to_user_name}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                {history.from_level && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(history.from_level)}`}>
                                    {history.from_level}
                                  </span>
                                )}
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                {history.to_level && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(history.to_level)}`}>
                                    {history.to_level}
                                  </span>
                                )}
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-600 capitalize">{history.action}</span>
                              </div>
                              {history.comments && (
                                <p className="text-sm text-gray-600 mt-2">{history.comments}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 ml-4">{formatDate(history.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {currentTracking ? (
                    actionMode === 'forward' ? 'Forward File' :
                    actionMode === 'revert' ? 'Revert File' :
                    'Reassign File'
                  ) : 'Assign File'}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select {currentTracking ? (
                        actionMode === 'forward' ? getNextLevel(currentTracking.current_level) :
                        actionMode === 'revert' ? getPreviousLevel(currentTracking.current_level) :
                        currentTracking.current_level
                      ) : 'Officer'}
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a user</option>
                      {availableUsers.map((user) => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.name} ({user.role_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any comments or instructions..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setActionMode('view');
                    setSelectedUser('');
                    setComments('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={currentTracking ? handleSubmitAction : handleInitialAssignment}
                  disabled={!selectedUser || isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : currentTracking ? (
                    actionMode === 'forward' ? 'Forward File' :
                    actionMode === 'revert' ? 'Revert File' :
                    'Reassign File'
                  ) : 'Assign File'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
