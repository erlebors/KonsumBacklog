'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Bell } from 'lucide-react';
import NewTipModal from '@/components/NewTipModal';
import Link from 'next/link';

export default function Home() {
  const [showNewTip, setShowNewTip] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    checkNotifications();
  }, []);

  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span>Organ</span>
            <span className="text-blue-600">AI</span>
            <span>ze</span>
          </h1>
          <p className="text-gray-600">
            Save and organize your tips, links, and useful information
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
      </div>

      {showNewTip && (
        <NewTipModal
          isOpen={showNewTip}
          onClose={() => {
            setShowNewTip(false);
            checkNotifications(); // Refresh notifications after adding a tip
          }}
        />
      )}
    </div>
  );
}
