'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Bell, User, LogOut, LogIn } from 'lucide-react';
import NewTipModal from '@/components/NewTipModal';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Home() {
  const [showNewTip, setShowNewTip] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      checkNotifications();
    }
  }, [user]);

  const checkNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setUrgentCount(data.count);
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              <span>Organ</span>
              <span className="text-blue-600">AI</span>
              <span>ze</span>
            </h1>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {user ? 'Welcome back!' : 'Welcome to OrganAIze'}
              </h2>
              <p className="text-gray-600">
                {user 
                  ? 'Save and organize your tips, links, and useful information'
                  : 'Sign in to save your tips or continue in demo mode'
                }
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setShowNewTip(true)}
                className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-6 h-6" />
                <span>New Tip</span>
              </button>

              <Link
                href="/review"
                className="w-full flex items-center justify-center space-x-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl relative"
              >
                <Clock className="w-6 h-6" />
                <span>Review Later</span>
                {urgentCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                    {urgentCount > 9 ? '9+' : urgentCount}
                  </div>
                )}
              </Link>
            </div>

            {urgentCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 font-medium">
                    {urgentCount} tip{urgentCount !== 1 ? 's' : ''} need{urgentCount !== 1 ? '' : 's'} attention soon
                  </span>
                </div>
              </div>
            )}

            {!user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-blue-800 text-sm mb-3">
                    Create an account to save your tips permanently and access them from anywhere.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <User className="w-4 h-4" />
                    <span>Create Account</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {showNewTip && (
          <NewTipModal
            isOpen={showNewTip}
            onClose={() => {
              setShowNewTip(false);
              if (user) {
                checkNotifications(); // Refresh notifications after adding a tip
              }
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
