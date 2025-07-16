'use client';

import { useState, useEffect } from 'react';
import { X, Link, Calendar, FileText, Clock, CheckCircle, Trash2, AlertCircle, Timer, Tag } from 'lucide-react';
import { format, isAfter, addDays } from 'date-fns';
import toast from 'react-hot-toast';

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
  const [filter, setFilter] = useState<'all' | 'urgent' | 'upcoming' | 'processed'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchTips();
    }
  }, [isOpen]);

  const fetchTips = async () => {
    try {
      const response = await fetch('/api/tips');
      if (response.ok) {
        const data = await response.json();
        setTips(data.tips || []);
      }
    } catch (error) {
      console.error('Error fetching tips:', error);
      toast.error('Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  const markAsProcessed = async (tipId: string) => {
    try {
      const response = await fetch(`/api/tips/${tipId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isProcessed: true }),
      });

      if (response.ok) {
        setTips(tips.map(tip => 
          tip.id === tipId ? { ...tip, isProcessed: true } : tip
        ));
        toast.success('Marked as processed');
      }
    } catch (error) {
      console.error('Error updating tip:', error);
      toast.error('Failed to update tip');
    }
  };

  const deleteTip = async (tipId: string) => {
    if (!confirm('Are you sure you want to delete this tip?')) return;

    try {
      const response = await fetch(`/api/tips/${tipId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTips(tips.filter(tip => tip.id !== tipId));
        toast.success('Tip deleted');
      }
    } catch (error) {
      console.error('Error deleting tip:', error);
      toast.error('Failed to delete tip');
    }
  };

  const getUrgentTips = () => {
    const today = new Date();
    return tips.filter(tip => 
      tip.relevanceDate && 
      isAfter(new Date(tip.relevanceDate), today) &&
      isAfter(new Date(tip.relevanceDate), addDays(today, 7)) &&
      !tip.isProcessed
    );
  };

  const getUpcomingTips = () => {
    const today = new Date();
    return tips.filter(tip => 
      tip.relevanceDate && 
      isAfter(new Date(tip.relevanceDate), addDays(today, 7)) &&
      !tip.isProcessed
    );
  };

  const getFilteredTips = () => {
    switch (filter) {
      case 'urgent':
        return getUrgentTips();
      case 'upcoming':
        return getUpcomingTips();
      case 'processed':
        return tips.filter(tip => tip.isProcessed);
      default:
        return tips.filter(tip => !tip.isProcessed);
    }
  };

  const getPriorityColor = (tip: Tip) => {
    if (tip.isProcessed) return 'bg-green-50 border-green-200';
    if (tip.relevanceDate && isAfter(new Date(tip.relevanceDate), new Date())) {
      const daysUntil = Math.ceil((new Date(tip.relevanceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 3) return 'bg-red-50 border-red-200';
      if (daysUntil <= 7) return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-white border-gray-200';
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstimatedTimeColor = (time: string) => {
    switch (time?.toLowerCase()) {
      case 'quick': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'long': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Review Later</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({tips.filter(t => !t.isProcessed).length})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'urgent' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Urgent ({getUrgentTips().length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'upcoming' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming ({getUpcomingTips().length})
            </button>
            <button
              onClick={() => setFilter('processed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'processed' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Processed ({tips.filter(t => t.isProcessed).length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading tips...</p>
            </div>
          ) : getFilteredTips().length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No tips to review</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {getFilteredTips().map((tip) => (
                <div
                  key={tip.id}
                  className={`p-4 rounded-lg border ${getPriorityColor(tip)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* AI Summary */}
                      {tip.summary && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-900 font-medium">{tip.summary}</p>
                        </div>
                      )}

                      {/* Content */}
                      {tip.content && (
                        <p className="text-gray-900 mb-2">{tip.content}</p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 