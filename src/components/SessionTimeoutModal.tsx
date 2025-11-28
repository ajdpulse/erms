import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { SESSION_CONFIG } from '../utils/security';

interface SessionTimeoutModalProps {
  isVisible: boolean;
  remainingTime: number;
  onExtendSession: () => void;
  onSignOut: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isVisible,
  remainingTime,
  onExtendSession,
  onSignOut
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          onSignOut();
          return 0;
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVisible, onSignOut]);

  useEffect(() => {
    setTimeLeft(remainingTime);
  }, [remainingTime]);

  if (!isVisible) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-full">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Session Timeout Warning</h3>
              <p className="text-sm text-white/90">Your session will expire soon</p>
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-4 rounded-2xl inline-block mb-4">
              <Clock className="h-12 w-12 text-amber-600" />
            </div>
            <p className="text-gray-700 mb-4">
              Your session will automatically expire in:
            </p>
            <div className="text-3xl font-bold text-red-600 mb-1">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-red-500">minutes remaining</div>
          </div>
          <p className="text-sm text-gray-600">
            Click "Extend Session" to continue working, or you'll be automatically signed out for security.
          </p>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(0, (timeLeft / SESSION_CONFIG.WARNING_DURATION) * 100)}%`
                }}
              />
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onExtendSession}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Extend Session</span>
            </button>
            <button
              onClick={onSignOut}
              className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};