import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from './lib/supabase';  

interface SignInFormProps {
  onSignInSuccess: () => void;
  forceResetMode?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
}

export const SignInForm: React.FC<SignInFormProps> = ({ 
  onSignInSuccess, 
  forceResetMode = false,
  accessToken = null,
  refreshToken = null 
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    // Force reset mode if prop is true (from parent detection)
    if (forceResetMode && accessToken && refreshToken) {
      handleRecoveryTokens(accessToken, refreshToken);
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('Auth event:', event);  // Debug log
      if (event === 'PASSWORD_RECOVERY') {
        setResetMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [forceResetMode, accessToken, refreshToken]);

  const handleRecoveryTokens = async (accessToken: string, refreshToken: string) => {
    setIsLoading(true);
    try {
      // Set the recovery session using tokens from URL
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      console.log('Recovery session established:', data);  // Debug log
      setResetMode(true);
    } catch (err) {
      setError('Invalid or expired reset link. Please request a new one.');
      console.error('Recovery session error:', err);
    } finally {
      setIsLoading(false);
    }
  };

 const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  
  // Basic validation
  if (!email || !password) {
    setError(t('auth.fillAllFields'));
    return;
  }

  if (!validateEmail(email)) {
    setError(t('auth.invalidEmail'));
    return;
  }

  if (password.length < 6) {
    setError(t('auth.passwordTooShort'));
    return;
  }

  setIsLoading(true);

  if (!supabase) {
    setError('Application not properly configured. Please contact administrator.');
    setIsLoading(false);
    return;
  }

  try {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else if (data.user) {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', data.user.id)
        .single();

      if (roleError) {
        console.error('Role fetch error:', roleError);
        setIsLoading(false);
        return;
      }

      const roleId = roleData?.role_id ?? null;

      if (roleId !== null) {
        const { data: accessData, error: accessError } = await supabase
          .from('application_permissions')
          .select('id')
          .eq('role_id', roleId)
          .eq('application_name', 'erms')
          .maybeSingle();

        if (!accessData) {
          alert('You do not have access to ERMS application');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
      }

      onSignInSuccess();
    }
  } catch (err) {
    setError('An unexpected error occurred. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const handlePasswordReset = async () => {
    if (!email) {
      setError(t('auth.enterEmail'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }

    setError('');
    setIsLoading(true);

    // Use root URL for redirectTo (no separate route needed). Adjust for production domain via env vars.
    const redirectUrl = process.env.NODE_ENV === 'development'
      ? `${window.location.origin}/`
      : 'https://your-app-domain.com/';  // Replace with your actual production domain (or use process.env.REACT_APP_BASE_URL)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setResetEmailSent(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError(t('auth.fillAllFields'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        // Password updated successfully - sign out to force re-login
        await supabase.auth.signOut();
        onSignInSuccess();
        // Redirect after success (change to your desired path)
        window.location.href = '/sign-in';
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (resetEmailSent) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <Mail className="h-16 w-16 text-teal-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('auth.checkEmail')}</h3>
          <p className="text-gray-600 mb-4">
            {t('auth.resetEmailMessage')} <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            {t('auth.didntReceiveEmail', "Didn't receive the email? Check your spam folder or try again.")}
          </p>
        </div>
        <button
          onClick={() => setResetEmailSent(false)}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {t('auth.backToSignIn')}
        </button>
      </div>
    );
  }

  if (resetMode) {
    return (
      <div>
        <form onSubmit={handleResetSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.newPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder={t('auth.enterNewPassword')}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder={t('auth.confirmNewPassword')}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>{t('auth.resetPassword')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSignIn} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            {t('auth.email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder={t('auth.enterEmail')}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            {t('auth.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder={t('auth.enterPassword')}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePasswordReset}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            disabled={isLoading}
          >
            {t('auth.forgotPassword')}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              <span>{t('auth.signIn')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
