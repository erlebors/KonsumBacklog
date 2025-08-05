'use client';

import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, Trash2, Calendar, Tag, AlertCircle, Timer, Link } from 'lucide-react';
import { format, isAfter, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createAuthenticatedRequest } from '@/lib/clientAuth';

interface Tip {
  id: string;
  content: string;
  url: string;
  relevanceDate: string | null;
  relevanceEvent: string | null;
  createdAt: string;
  category?: string;
  priority?: string;
  summary?: string;
  tags?: string[];
  actionRequired?: boolean;
  estimatedTime?: string;
  isProcessed?: boolean;
  aiProcessed?: boolean;
  aiError?: string;
}

interface ReviewLaterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewLaterModal({ isOpen, onClose }: ReviewLaterModalProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'urgent' | 'upcoming'>('urgent');
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchTips();
    }
  }, [isOpen, user]);

  const fetchTips = async () => {
    try {
      setLoading(true);
      const requestOptions = await createAuthenticatedRequest('/api/tips');
      const response = await fetch('/api/tips', requestOptions);
      if (response.ok) {
        const data = await response.json();
        setTips(data);
      }
    } catch (error) {
      console.error('Error fetching tips:', error);
      toast.error('Failed to fetch tips');
    } finally {
      setLoading(false);
    }
  };

  const markAsProcessed = async (tipId: string) => {
    try {
      const requestOptions = await createAuthenticatedRequest(`/api/tips/${tipId}/process`, {
        method: 'PUT',
      });
      const response = await fetch(`/api/tips/${tipId}/process`, requestOptions);
      
      if (response.ok) {
        setTips(prevTips => 
          prevTips.map(tip => 
            tip.id === tipId 
              ? { ...tip, isProcessed: true }
              : tip
          )
        );
        toast.success('Tip marked as processed');
      }
    } catch (error) {
      console.error('Error marking tip as processed:', error);
      toast.error('Failed to mark tip as processed');
    }
  };

  const deleteTip = async (tipId: string) => {
    try {
      const requestOptions = await createAuthenticatedRequest(`/api/tips?id=${tipId}`, {
        method: 'DELETE',
      });
      const response = await fetch(`/api/tips?id=${tipId}`, requestOptions);
      
      if (response.ok) {
        setTips(prevTips => prevTips.filter(tip => tip.id !== tipId));
        toast.success('Tip deleted');
      }
    } catch (error) {
      console.error('Error deleting tip:', error);
      toast.error('Failed to delete tip');
    }
  };

  const getUrgentTips = () => {
    const today = new Date();
    return tips.filter(tip => {
      if (!tip.relevanceDate) return false;
      const relevanceDate = new Date(tip.relevanceDate);
      return isAfter(relevanceDate, today) && isAfter(addDays(today, 7), relevanceDate);
    });
  };

  const getUpcomingTips = () => {
    const today = new Date();
    return tips.filter(tip => {
      if (!tip.relevanceDate) return false;
      const relevanceDate = new Date(tip.relevanceDate);
      return isAfter(relevanceDate, addDays(today, 7));
    });
  };

  const getFilteredTips = () => {
    if (activeTab === 'urgent') {
      return getUrgentTips();
    } else {
      return getUpcomingTips();
    }
  };

  const getPriorityColor = (tip: Tip) => {
    const priority = parseInt(tip.priority || '5');
    if (priority <= 3) return 'text-red-600';
    if (priority <= 6) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getPriorityBadgeColor = (priority: string) => {
    const priorityNum = parseInt(priority);
    if (priorityNum <= 3) return 'bg-red-100 text-red-800';
    if (priorityNum <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getEstimatedTimeColor = (time: string) => {
    if (time.includes('min')) return 'bg-green-100 text-green-800';
    if (time.includes('hour')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Review Later</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('urgent')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'urgent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Urgent ({getUrgentTips().length})
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Upcoming ({getUpcomingTips().length})
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredTips().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No {activeTab} tips to review.
                </div>
              ) : (
                getFilteredTips().map((tip) => (
                  <div
                    key={tip.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* AI Summary */}
                        {tip.summary && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-md">
                            <p className="text-sm text-blue-900 font-medium">{tip.summary}</p>
                          </div>
                        )}
                        
                        {/* URL */}
                        {tip.url && (
                          <a
                            href={tip.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2"
                          >
                            <Link className="w-4 h-4 mr-1" />
                            {tip.url}
                          </a>
                        )}

                        {/* AI Tags */}
                        {tip.tags && tip.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {tip.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Metadata Row */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          {tip.relevanceDate && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(tip.relevanceDate), 'MMM dd, yyyy')}
                            </div>
                          )}
                          
                          {tip.relevanceEvent && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              {tip.relevanceEvent}
                            </span>
                          )}
                        </div>

                        {/* AI Insights Row */}
                        <div className="flex items-center space-x-3 text-sm">
                          {tip.category && (
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                              {tip.category}
                            </span>
                          )}

                          {tip.priority && (
                            <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadgeColor(tip.priority)}`}>
                              {tip.priority} Priority
                            </span>
                          )}

                          {tip.estimatedTime && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getEstimatedTimeColor(tip.estimatedTime)}`}>
                              <Timer className="w-3 h-3 mr-1" />
                              {tip.estimatedTime}
                            </span>
                          )}

                          {tip.actionRequired && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Action Required
                            </span>
                          )}

                          {tip.aiError && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              AI Error
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!tip.isProcessed && (
                          <button
                            onClick={() => markAsProcessed(tip.id)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                            title="Mark as processed"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteTip(tip.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete tip"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Tip Content */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{tip.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 