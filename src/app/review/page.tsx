'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  Clock, 
  Edit3, 
  CheckCircle, 
  Trash2,
  Calendar,
  Brain,
  Info,
  X,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import UrlPreview from '@/components/UrlPreview';
import { createAuthenticatedRequest } from '@/lib/clientAuth';
import { useAuth } from '@/contexts/AuthContext';

interface Tip {
  id: string;
  content: string;
  url: string;
  title?: string;
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

export default function ReviewPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed'>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedSubFolders, setExpandedSubFolders] = useState<Set<string>>(new Set());
  const [expandedUrlPreviews, setExpandedUrlPreviews] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sidebar navigation state
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  
  // Folder management state
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderData, setNewFolderData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const { user, loading: authLoading } = useAuth();
  
  console.log('ReviewPage render - user:', user, 'authLoading:', authLoading, 'localLoading:', loading);

  useEffect(() => {
    console.log('ReviewPage useEffect - user:', user, 'authLoading:', authLoading);
    if (user && !authLoading) {
      console.log('User is authenticated, fetching data...');
      fetchTips();
      fetchAvailableFolders();
    } else if (!user && !authLoading) {
      console.log('User is not authenticated');
    } else {
      console.log('Still loading authentication state...');
    }
  }, [user, authLoading]); // Only fetch when user is authenticated and auth loading is complete

  const fetchTips = async () => {
    if (!user) {
      console.log('No user authenticated, skipping fetchTips');
      return;
    }
    
    try {
      setLoading(true);
      const requestOptions = await createAuthenticatedRequest('/api/tips');
      const response = await fetch('/api/tips', requestOptions);
      if (response.ok) {
        const data = await response.json();
        setTips(data || []);
        
        // Auto-expand URL previews for tips that have URLs
        const tipsWithUrls = (data || []).filter((tip: Tip) => tip.url && tip.url.trim());
        const urlPreviewIds = new Set<string>(tipsWithUrls.map((tip: Tip) => tip.id));
        setExpandedUrlPreviews(urlPreviewIds);
      }
    } catch (error) {
      console.error('Error fetching tips:', error);
      toast.error('Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableFolders = async () => {
    if (!user) {
      console.log('No user authenticated, skipping fetchAvailableFolders');
      return;
    }
    
    try {
      const requestOptions = await createAuthenticatedRequest('/api/folders/available');
      const response = await fetch('/api/folders/available', requestOptions);
      if (response.ok) {
        const data = await response.json();
        // Combine user folders and AI-generated folders
        const userFolderNames = data.userFolders || [];
        const aiGeneratedFolderNames = data.aiGeneratedFolders || [];
        const allFolderNames = [...userFolderNames, ...aiGeneratedFolderNames];
        setAvailableFolders(allFolderNames);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to create folders');
      return;
    }
    
    if (!newFolderData.name.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      const requestOptions = await createAuthenticatedRequest('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFolderData),
      });

      const response = await fetch('/api/folders', requestOptions);

      if (response.ok) {
        toast.success('Folder created!');
        setShowNewFolderModal(false);
        setNewFolderData({ name: '', description: '', color: '#3B82F6' });
        fetchAvailableFolders(); // Refresh the folder list
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const deleteFolder = async (folderName: string) => {
    if (!user) {
      toast.error('Please sign in to delete folders');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"? This will move all tips in this folder to "General Tips".`)) {
      return;
    }

    try {
      // First, get all folders to find the folder ID
      const requestOptions = await createAuthenticatedRequest('/api/folders');
      const response = await fetch('/api/folders', requestOptions);
      
      if (response.ok) {
        const folders = await response.json();
        const folder = folders.find((f: any) => f.name === folderName);
        
        if (folder) {
          // Delete the folder
          const deleteRequestOptions = await createAuthenticatedRequest(`/api/folders`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: folder.id }),
          });
          
          const deleteResponse = await fetch('/api/folders', deleteRequestOptions);
          
          if (deleteResponse.ok) {
            toast.success('Folder deleted!');
            fetchAvailableFolders(); // Refresh the folder list
            if (selectedFolder === folderName) {
              setSelectedFolder(null); // Clear selection if deleted folder was selected
            }
          } else {
            throw new Error('Failed to delete folder');
          }
        }
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#6B7280', // Gray
  ];

  const handleFoldersChange = () => {
    // Refresh tips and folders to show any changes
    fetchTips();
    fetchAvailableFolders();
  };

  const markAsProcessed = async (tipId: string) => {
    if (!user) {
      toast.error('Please sign in to mark tips as processed');
      return;
    }
    
    try {
      const requestOptions = await createAuthenticatedRequest(`/api/tips/${tipId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isProcessed: true }),
      });

      const response = await fetch(`/api/tips/${tipId}`, requestOptions);

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
    if (!user) {
      toast.error('Please sign in to delete tips');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this tip?')) return;

    try {
      const requestOptions = await createAuthenticatedRequest(`/api/tips/${tipId}`, {
        method: 'DELETE',
      });

      const response = await fetch(`/api/tips/${tipId}`, requestOptions);

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
    if (!user) {
      toast.error('Please sign in to add context to tips');
      return;
    }
    
    try {
      const requestOptions = await createAuthenticatedRequest(`/api/tips/${tipId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userContext: context,
          needsMoreInfo: false 
        }),
      });

      const response = await fetch(`/api/tips/${tipId}`, requestOptions);

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

  const getFilteredTips = () => {
    let filteredTips = tips;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTips = filteredTips.filter(tip => {
        // Search in folder name
        const folderMatch = typeof tip.folder === 'string' && tip.folder.toLowerCase().includes(query);
        
        // Search in tip title
        const titleMatch = typeof tip.title === 'string' && tip.title.toLowerCase().includes(query);
        
        // Search in tip content
        const contentMatch = typeof tip.content === 'string' && tip.content.toLowerCase().includes(query);
        
        // Search in tip summary
        const summaryMatch = typeof tip.summary === 'string' && tip.summary.toLowerCase().includes(query);
        
        // Search in user context
        const contextMatch = typeof tip.userContext === 'string' && tip.userContext.toLowerCase().includes(query);
        
        // Search in URL
        const urlMatch = typeof tip.url === 'string' && tip.url.toLowerCase().includes(query);
        
        // Search in relevance event
        const eventMatch = typeof tip.relevanceEvent === 'string' && tip.relevanceEvent.toLowerCase().includes(query);
        
        return folderMatch || titleMatch || contentMatch || summaryMatch || contextMatch || urlMatch || eventMatch;
      });
    }
    
    // Apply folder filter
    if (selectedFolder) {
      filteredTips = filteredTips.filter(tip => tip.folder === selectedFolder);
    }
    
    // Apply status filter
    switch (filter) {
      case 'completed':
        return filteredTips.filter(tip => tip.isProcessed);
      default:
        return filteredTips.filter(tip => !tip.isProcessed); // Only show active tips in "All" view
    }
  };

  // Helper function to highlight search matches
  const highlightSearchMatch = (text: string | any, query: string) => {
    if (!query.trim() || !text) return text;
    
    // Convert to string if it's not already
    const textString = typeof text === 'string' ? text : String(text);
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = textString.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const toggleUrlPreview = (tipId: string) => {
    const newExpandedUrlPreviews = new Set(expandedUrlPreviews);
    if (newExpandedUrlPreviews.has(tipId)) {
      newExpandedUrlPreviews.delete(tipId);
    } else {
      newExpandedUrlPreviews.add(tipId);
    }
    setExpandedUrlPreviews(newExpandedUrlPreviews);
  };

  if (authLoading) {
    console.log('Showing loading screen - authLoading:', authLoading);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('Showing sign in screen - user:', user);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to view and manage your tips.</p>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Show data loading state if user is authenticated but data is still loading
  if (loading) {
    console.log('Showing data loading screen - loading:', loading);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tips...</p>
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
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <Link 
                href="/"
                className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Review Tips</h1>
            </div>
            
            {/* Search Bar */}
            <div className="hidden sm:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search your saved content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Filter Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    filter === 'all' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    filter === 'completed' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile Search Bar */}
          <div className="sm:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your saved content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
            
            {/* All Items Button */}
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedFolder === null
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All Items ({getFilteredTips().length})
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {availableFolders.map((folder) => (
                <div key={folder} className="flex items-center justify-between group">
                  <button
                    onClick={() => setSelectedFolder(folder)}
                    className={`flex-1 text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedFolder === folder
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {folder}
                  </button>
                  <button
                    onClick={() => deleteFolder(folder)}
                    className="text-red-600 hover:text-red-700 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Delete folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* New Folder Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <Folder className="w-4 h-4" />
                <span>New folder</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {/* Mobile Folder Selector */}
            <div className="sm:hidden mb-4">
              <select
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Items</option>
                {availableFolders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </div>

            {/* Tips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredTips().map((tip) => (
                <div
                  key={tip.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Tip Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {tip.title || 'Untitled Tip'}
                      </h3>
                      {tip.folder && (
                        <p className="text-xs text-gray-500 mt-1">{tip.folder}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {!tip.isProcessed && (
                        <button
                          onClick={() => markAsProcessed(tip.id)}
                          className="text-green-600 hover:text-green-700 transition-colors p-1"
                          title="Mark as processed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTip(tip.id)}
                        className="text-red-600 hover:text-red-700 transition-colors p-1"
                        title="Delete tip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tip Content */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {searchQuery.trim() ? highlightSearchMatch(tip.content, searchQuery) : tip.content}
                    </p>
                  </div>

                  {/* AI Summary */}
                  {tip.summary && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-md">
                      <div className="flex items-center space-x-1 mb-1">
                        <Brain className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-900">AI Summary</span>
                      </div>
                      <ul className="text-xs text-blue-800 space-y-1">
                        {String(tip.summary).split('•').filter(point => point.trim()).map((point, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2 text-blue-600">•</span>
                            <span>
                              {searchQuery.trim() ? highlightSearchMatch(point.trim(), searchQuery) : point.trim()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* URL Preview */}
                  {tip.url && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleUrlPreview(tip.id)}
                        className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-700 mb-2"
                      >
                        <span>{expandedUrlPreviews.has(tip.id) ? 'Hide' : 'Show'} URL Preview</span>
                      </button>
                      {expandedUrlPreviews.has(tip.id) && (
                        <UrlPreview url={tip.url} />
                      )}
                    </div>
                  )}

                  {/* Tip Metadata */}
                  <div className="space-y-1 text-xs text-gray-500">
                    {tip.relevanceDate && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Relevant: {format(new Date(tip.relevanceDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {tip.relevanceEvent && (
                      <div className="flex items-center space-x-1">
                        <Info className="w-3 h-3" />
                        <span>Event: {tip.relevanceEvent}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Created: {format(new Date(tip.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {/* User Context */}
                  {tip.userContext && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                      <div className="flex items-center space-x-1 mb-1">
                        <Info className="w-3 h-3 text-yellow-600" />
                        <span className="text-xs font-medium text-yellow-900">Your Notes</span>
                      </div>
                      <p className="text-xs text-yellow-800">
                        {searchQuery.trim() ? highlightSearchMatch(tip.userContext, searchQuery) : tip.userContext}
                      </p>
                    </div>
                  )}

                  {/* Add Context Button */}
                  {!tip.userContext && (
                    <button
                      onClick={() => {
                        setSelectedTip(tip);
                        setShowContextModal(true);
                      }}
                      className="mt-3 w-full text-xs text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Add notes</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {getFilteredTips().length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tips to review</h3>
                <p className="text-gray-600">
                  {selectedFolder 
                    ? `No tips found in "${selectedFolder}" folder.`
                    : 'All tips have been processed or there are no tips matching the current filter.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
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
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                placeholder="Add your notes or context about this tip..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
              <div className="flex space-x-3 mt-4">
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
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Folder Management Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create New Folder</h2>
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderData({ name: '', description: '', color: '#3B82F6' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={createFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={newFolderData.name}
                  onChange={(e) => setNewFolderData({ ...newFolderData, name: e.target.value })}
                  placeholder="e.g., Work Projects, Personal Goals, Reading List"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newFolderData.description}
                  onChange={(e) => setNewFolderData({ ...newFolderData, description: e.target.value })}
                  placeholder="Brief description of what this folder is for..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderData({ ...newFolderData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        newFolderData.color === color
                          ? 'border-gray-900'
                          : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFolderModal(false);
                    setNewFolderData({ name: '', description: '', color: '#3B82F6' });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 