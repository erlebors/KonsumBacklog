'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  Clock, 
  AlertCircle, 
  Plus, 
  Edit3, 
  CheckCircle, 
  Trash2,
  Calendar,
  Timer,
  Brain,
  Info,
  ChevronDown,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { format, isAfter, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import UrlPreview from '@/components/UrlPreview';

interface Tip {
  id: string;
  content: string;
  url: string;
  relevanceDate: string | null;
  relevanceEvent: string | null;
  createdAt: string;
  folder?: string;
  priority?: string;
  summary?: string;
  tags?: string[];
  actionRequired?: boolean;
  estimatedTime?: string;
  isProcessed?: boolean;
  aiProcessed?: boolean;
  aiError?: string;
  userContext?: string;
  needsMoreInfo?: boolean;
  urgencyLevel?: string;
}

interface FolderGroup {
  name: string;
  tips: Tip[];
  urgentCount: number;
  totalCount: number;
  isExpanded?: boolean;
}

export default function ReviewPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'needsInfo'>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTips();
  }, []);

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

  const addContext = async (tipId: string, context: string) => {
    try {
      const response = await fetch(`/api/tips/${tipId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userContext: context,
          needsMoreInfo: false 
        }),
      });

      if (response.ok) {
        setTips(tips.map(tip => 
          tip.id === tipId ? { 
            ...tip, 
            userContext: context, 
            needsMoreInfo: false 
          } : tip
        ));
        toast.success('Context added successfully');
        setShowContextModal(false);
        setSelectedTip(null);
        setContextInput('');
      }
    } catch (error) {
      console.error('Error updating tip:', error);
      toast.error('Failed to add context');
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

  const getTipsNeedingInfo = () => {
    return tips.filter(tip => 
      !tip.isProcessed && 
      (!tip.userContext || tip.needsMoreInfo)
    );
  };

  const getFilteredTips = () => {
    switch (filter) {
      case 'urgent':
        return getUrgentTips();
      case 'needsInfo':
        return getTipsNeedingInfo();
      default:
        return tips.filter(tip => !tip.isProcessed);
    }
  };

  const organizeByFolder = (tips: Tip[]): FolderGroup[] => {
    const folders: { [key: string]: Tip[] } = {};
    
    tips.forEach(tip => {
      const folder = tip.folder || 'Uncategorized';
      if (!folders[folder]) {
        folders[folder] = [];
      }
      folders[folder].push(tip);
    });

    return Object.entries(folders).map(([name, folderTips]) => {
      const urgentCount = folderTips.filter(tip => 
        tip.priority === 'High' || 
        (tip.relevanceDate && isAfter(new Date(tip.relevanceDate), addDays(new Date(), 3)))
      ).length;

      // Calculate folder urgency score
      const getUrgencyScore = (tip: Tip): number => {
        let score = 0;
        
        // Priority score
        if (tip.priority === 'High') score += 100;
        else if (tip.priority === 'Medium') score += 50;
        else score += 10;
        
        // Date urgency score
        if (tip.relevanceDate) {
          const tipDate = new Date(tip.relevanceDate);
          const today = new Date();
          const daysUntil = Math.ceil((tipDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil <= 0) score += 200; // Overdue
          else if (daysUntil <= 1) score += 150; // Today/tomorrow
          else if (daysUntil <= 3) score += 100; // This week
          else if (daysUntil <= 7) score += 75; // Next week
          else if (daysUntil <= 30) score += 25; // This month
        }
        
        // Urgency level score
        if (tip.urgencyLevel === 'Immediate') score += 200;
        else if (tip.urgencyLevel === 'This Week') score += 100;
        else if (tip.urgencyLevel === 'This Month') score += 50;
        
        return score;
      };

      return {
        name,
        tips: folderTips.sort((a, b) => {
          // Sort by urgency score first
          const aScore = getUrgencyScore(a);
          const bScore = getUrgencyScore(b);
          
          if (aScore !== bScore) return bScore - aScore;
          
          // Then by relevance date
          if (a.relevanceDate && b.relevanceDate) {
            return new Date(a.relevanceDate).getTime() - new Date(b.relevanceDate).getTime();
          }
          
          // Then by creation date
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
        urgentCount,
        totalCount: folderTips.length,
        isExpanded: expandedFolders.has(name)
      };
    }).sort((a, b) => {
      // Sort folders by their most urgent tip
      const getFolderUrgencyScore = (folder: FolderGroup): number => {
        if (folder.tips.length === 0) return 0;
        
        const getTipUrgencyScore = (tip: Tip): number => {
          let score = 0;
          
          // Priority score
          if (tip.priority === 'High') score += 100;
          else if (tip.priority === 'Medium') score += 50;
          else score += 10;
          
          // Date urgency score
          if (tip.relevanceDate) {
            const tipDate = new Date(tip.relevanceDate);
            const today = new Date();
            const daysUntil = Math.ceil((tipDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= 0) score += 200; // Overdue
            else if (daysUntil <= 1) score += 150; // Today/tomorrow
            else if (daysUntil <= 3) score += 100; // This week
            else if (daysUntil <= 7) score += 75; // Next week
            else if (daysUntil <= 30) score += 25; // This month
          }
          
          // Urgency level score
          if (tip.urgencyLevel === 'Immediate') score += 200;
          else if (tip.urgencyLevel === 'This Week') score += 100;
          else if (tip.urgencyLevel === 'This Month') score += 50;
          
          return score;
        };
        
        return Math.max(...folder.tips.map(getTipUrgencyScore));
      };
      
      const aScore = getFolderUrgencyScore(a);
      const bScore = getFolderUrgencyScore(b);
      
      if (aScore !== bScore) return bScore - aScore;
      
      // If urgency is the same, sort by urgent count
      if (a.urgentCount !== b.urgentCount) return b.urgentCount - a.urgentCount;
      
      // Finally, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getUrgencyLevelColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'Immediate': return 'bg-red-100 text-red-800 border-red-200';
      case 'This Week': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'This Month': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Later': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const folderGroups = organizeByFolder(getFilteredTips());

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Review Tips</h1>
            </div>
            
            <div className="flex space-x-2">
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
                onClick={() => setFilter('needsInfo')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'needsInfo' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Needs Info ({getTipsNeedingInfo().length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {folderGroups.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tips to review</h3>
            <p className="text-gray-600">All tips have been processed or there are no tips matching the current filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {folderGroups.map((group) => (
              <div key={group.name} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Folder Header */}
                <div 
                  className="px-6 py-4 border-b bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleFolder(group.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedFolders.has(group.name) ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                      <Folder className="w-5 h-5 text-gray-600" />
                      <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                        {group.totalCount} tip{group.totalCount !== 1 ? 's' : ''}
                      </span>
                      {group.urgentCount > 0 && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {group.urgentCount} urgent
                        </span>
                      )}
                    </div>
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Folder Content - Only show when expanded */}
                {expandedFolders.has(group.name) && (
                  <div className="divide-y divide-gray-200">
                    {group.tips.map((tip) => (
                      <div key={tip.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* AI Summary */}
                            {tip.summary && (
                              <div className="mb-3 p-3 bg-blue-50 rounded-md">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Brain className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">AI Summary</span>
                                </div>
                                <p className="text-sm text-blue-800">{tip.summary}</p>
                              </div>
                            )}

                            {/* Content */}
                            {tip.content && (
                              <p className="text-gray-900 mb-3">{tip.content}</p>
                            )}
                            
                            {/* URL */}
                            {tip.url && (
                              <div className="mb-3">
                                <UrlPreview url={tip.url} />
                              </div>
                            )}

                            {/* User Context */}
                            {tip.userContext && (
                              <div className="mb-3 p-3 bg-green-50 rounded-md">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Info className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-900">Your Context</span>
                                </div>
                                <p className="text-sm text-green-800">{tip.userContext}</p>
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
                              <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(tip.priority || '')}`}>
                                {tip.priority || 'Medium'} Priority
                              </span>

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

                              {(!tip.userContext || tip.needsMoreInfo) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                  <Info className="w-3 h-3 mr-1" />
                                  Needs Context
                                </span>
                              )}

                              {tip.urgencyLevel && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getUrgencyLevelColor(tip.urgencyLevel)}`}>
                                  <Info className="w-3 h-3 mr-1" />
                                  {tip.urgencyLevel}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {(!tip.userContext || tip.needsMoreInfo) && (
                              <button
                                onClick={() => {
                                  setSelectedTip(tip);
                                  setShowContextModal(true);
                                }}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                title="Add context"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                            )}
                            
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
            ))}
          </div>
        )}
      </div>

      {/* Context Modal */}
      {showContextModal && selectedTip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add Context</h2>
              <button
                onClick={() => {
                  setShowContextModal(false);
                  setSelectedTip(null);
                  setContextInput('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-6 h-6 transform rotate-45" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What is this tip about?
                </label>
                <textarea
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  placeholder="e.g., This is regarding the roadtrip we are going on this weekend, or this is regarding a meeting I will have in two weeks..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowContextModal(false);
                    setSelectedTip(null);
                    setContextInput('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addContext(selectedTip.id, contextInput)}
                  disabled={!contextInput.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Context
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 