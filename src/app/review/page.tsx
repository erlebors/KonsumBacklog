'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  Clock, 
  Plus, 
  Edit3, 
  CheckCircle, 
  Trash2,
  Calendar,
  Brain,
  Info,
  ChevronDown,
  ChevronRight,
  Settings,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import UrlPreview from '@/components/UrlPreview';
import FolderModal from '@/components/FolderModal';

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

interface FolderGroup {
  name: string;
  tips: Tip[];
  urgentCount: number;
  totalCount: number;
  isExpanded?: boolean;
  subFolders?: TipSubFolder[];
}

interface TipSubFolder {
  name: string;
  tip: Tip;
  isExpanded?: boolean;
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
  const [showFolderModal, setShowFolderModal] = useState(false);
  
  // Drag and drop state
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combineData, setCombineData] = useState<{
    sourceFolder: string;
    targetFolder: string;
    combinedTips: Tip[];
  } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const response = await fetch('/api/tips');
      if (response.ok) {
        const data = await response.json();
        setTips(data || []);
      }
    } catch (error) {
      console.error('Error fetching tips:', error);
      toast.error('Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  const handleFoldersChange = () => {
    // Refresh tips to show any changes in folder organization
    fetchTips();
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

  const getFilteredTips = () => {
    switch (filter) {
      case 'completed':
        return tips.filter(tip => tip.isProcessed);
      default:
        return tips.filter(tip => !tip.isProcessed); // Only show active tips in "All" view
    }
  };

  const organizeByFolder = (tips: Tip[]): FolderGroup[] => {
    const folders: { [key: string]: Tip[] } = {};
    
    tips.forEach(tip => {
      // For completed tips, use their original folder name
      if (tip.isProcessed) {
        const folder = tip.folder || 'Uncategorized';
        if (!folders[folder]) {
          folders[folder] = [];
        }
        folders[folder].push(tip);
      } else {
        // For active tips, use their assigned folder
        const folder = tip.folder || 'Uncategorized';
        if (!folders[folder]) {
          folders[folder] = [];
        }
        folders[folder].push(tip);
      }
    });

    return Object.entries(folders).map(([name, folderTips]) => {
      // Create subfolders for each tip
      const subFolders: TipSubFolder[] = folderTips.map(tip => {
        // Get title from tip.title, URL metadata, or use content
        let subFolderName = 'Untitled';
        
        if (tip.title) {
          subFolderName = generateShortTitle(tip.title);
        } else if (tip.url) {
          // Try to extract title from URL or use domain
          try {
            const url = new URL(tip.url);
            subFolderName = url.hostname.replace('www.', '');
          } catch {
            subFolderName = generateShortTitle(tip.content);
          }
        } else if (tip.content) {
          subFolderName = generateShortTitle(tip.content);
        }
        
        return {
          name: subFolderName,
          tip: tip,
          isExpanded: expandedSubFolders.has(tip.id)
        };
      });

      return {
        name,
        tips: [], // No direct tips, only subfolders
        urgentCount: 0, // No longer used
        totalCount: folderTips.length,
        isExpanded: expandedFolders.has(name),
        subFolders: subFolders
      };
    }).sort((a, b) => {
      // Sort folders alphabetically
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

  const toggleSubFolder = (tipId: string) => {
    const newExpandedSubFolders = new Set(expandedSubFolders);
    if (newExpandedSubFolders.has(tipId)) {
      newExpandedSubFolders.delete(tipId);
    } else {
      newExpandedSubFolders.add(tipId);
    }
    setExpandedSubFolders(newExpandedSubFolders);
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

  // Helper function to generate shorter, more concise titles
  const generateShortTitle = (text: string): string => {
    if (!text) return 'Untitled';
    
    // Remove common prefixes and phrases
    const cleaned = text
      .toLowerCase()
      .replace(/^(visit|go to|check out|see|explore|look at|read about|learn about|research|find|get|buy|order|book|schedule|plan|prepare for|work on|study|review|analyze|investigate|examine|consider|think about|remember to|don't forget to|make sure to|try to|attempt to|start|begin|continue|finish|complete|do|work on|focus on|concentrate on|spend time on|dedicate time to|allocate time for|set aside time for|make time for|find time for|take time to|spend time|invest time in|put time into|devote time to|commit time to|allocate|dedicate|devote|commit|invest|put|take|make|find|set|spend|focus|concentrate|work|start|begin|continue|finish|complete|do|try|attempt|remember|don't forget|make sure|think|consider|examine|investigate|analyze|review|study|plan|prepare|schedule|book|order|buy|get|find|research|learn|read|see|explore|look|check|go|visit)\s+/i, '')
      .replace(/\s+(on my way to|while traveling to|during trip to|when going to|en route to|heading to|traveling to|going to|visiting|stopping by|passing through|driving through|flying to|taking train to|taking bus to|walking to|cycling to|sailing to|flying over|passing by|near|around|in|at|to|for|about|regarding|concerning|related to|connected to|associated with|linked to|tied to|bound to|destined for|headed for|aimed at|targeted at|focused on|centered on|based on|built on|founded on|established on|created for|designed for|intended for|meant for|planned for|scheduled for|booked for|reserved for|set for|arranged for|organized for|prepared for|ready for|geared toward|oriented toward|directed toward|pointed toward|aimed toward|targeted toward|focused toward|centered toward|based toward|built toward|founded toward|established toward|created toward|designed toward|intended toward|meant toward|planned toward|scheduled toward|booked toward|reserved toward|set toward|arranged toward|organized toward|prepared toward|ready toward|geared for|oriented for|directed for|pointed for|aimed for|targeted for|focused for|centered for|based for|built for|founded for|established for|created for|designed for|intended for|meant for|planned for|scheduled for|booked for|reserved for|set for|arranged for|organized for|prepared for|ready for)\s+/i, ' ')
      .trim();

    // Extract key words (capitalize first letter of each word)
    const words = cleaned.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return 'Untitled';
    
    // If it's just one or two words, use as is
    if (words.length <= 2) {
      return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    
    // For longer phrases, try to extract the most important part
    // Look for location names, proper nouns, or key concepts
    const importantWords = words.filter(word => 
      word.length > 2 && 
      !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'through', 'during', 'before', 'after', 'while', 'since', 'until', 'unless', 'although', 'because', 'if', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'a', 'an'].includes(word)
    );
    
    if (importantWords.length > 0) {
      // Take up to 3 important words
      const selectedWords = importantWords.slice(0, 3);
      return selectedWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    
    // Fallback: take first 2-3 words and capitalize
    const selectedWords = words.slice(0, Math.min(3, words.length));
    return selectedWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, folderName: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFolder(folderName);
  };

  const handleDragOver = (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    if (draggedFolder && draggedFolder !== folderName) {
      setDragOverFolder(folderName);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    
    if (!draggedFolder || draggedFolder === targetFolder) {
      setDraggedFolder(null);
      setDragOverFolder(null);
      return;
    }

    // Get all tips from both folders
    const sourceTips = tips.filter(tip => tip.folder === draggedFolder);
    const targetTips = tips.filter(tip => tip.folder === targetFolder);
    const combinedTips = [...sourceTips, ...targetTips];

    // Set up combine modal data
    setCombineData({
      sourceFolder: draggedFolder,
      targetFolder: targetFolder,
      combinedTips: combinedTips
    });
    setNewFolderName(targetFolder); // Default to target folder name
    setShowCombineModal(true);

    setDraggedFolder(null);
    setDragOverFolder(null);
  };

  const handleCombineFolders = async () => {
    if (!combineData || !newFolderName.trim()) return;

    try {
      // Update all tips to use the new folder name
      const updatedTips = tips.map(tip => {
        if (tip.folder === combineData.sourceFolder || tip.folder === combineData.targetFolder) {
          return { ...tip, folder: newFolderName };
        }
        return tip;
      });

      // Update tips in the API
      for (const tip of combineData.combinedTips) {
        await fetch(`/api/tips/${tip.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ folder: newFolderName }),
        });
      }

      // Update local state
      setTips(updatedTips);
      toast.success(`Folders combined into "${newFolderName}"`);
      setShowCombineModal(false);
      setCombineData(null);
      setNewFolderName('');
    } catch (error) {
      console.error('Error combining folders:', error);
      toast.error('Failed to combine folders');
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
                onClick={() => setShowFolderModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
                title="Manage custom folders"
              >
                <Settings className="w-4 h-4" />
                <span>Manage Folders</span>
              </button>
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
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'completed' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Completed ({tips.filter(t => t.isProcessed).length})
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folderGroups.map((group) => (
              <div 
                key={group.name} 
                className={`bg-white rounded-lg shadow-sm border ${expandedFolders.has(group.name) ? '' : 'h-[120px]'} ${
                  draggedFolder === group.name ? 'opacity-50' : ''
                } ${
                  dragOverFolder === group.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, group.name)}
                onDragOver={(e) => handleDragOver(e, group.name)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, group.name)}
              >
                {/* Folder Header */}
                <div 
                  className="px-4 py-4 border-b bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors h-[120px]"
                  onClick={() => toggleFolder(group.name)}
                >
                  <div className="flex items-center justify-between h-full">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {expandedFolders.has(group.name) ? (
                        <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      )}
                      <Folder className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <h2 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1">{group.name}</h2>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {group.totalCount}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Folder Content - Only show when expanded */}
                {expandedFolders.has(group.name) && (
                  <div className="p-2 space-y-2">
                    {group.subFolders?.map((subFolder) => (
                      <div 
                        key={subFolder.tip.id} 
                        className="bg-white border border-gray-200 rounded-md overflow-hidden"
                        data-subfolder-id={subFolder.tip.id}
                        data-subfolder-name={subFolder.name}
                      >
                        {/* Subfolder Header - Always visible with fixed height when collapsed */}
                        <div 
                          className="px-3 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors h-[60px]"
                          onClick={() => toggleSubFolder(subFolder.tip.id)}
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {expandedSubFolders.has(subFolder.tip.id) ? (
                                <ChevronDown className="w-3 h-3 text-gray-600 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                              )}
                              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{subFolder.name}</h3>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {(!subFolder.tip.userContext || subFolder.tip.needsMoreInfo) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTip(subFolder.tip);
                                    setShowContextModal(true);
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Add context"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              
                              {!subFolder.tip.isProcessed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsProcessed(subFolder.tip.id);
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                  title="Mark as processed"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTip(subFolder.tip.id);
                                }}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Delete tip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Subfolder Content - Only show when expanded */}
                        {expandedSubFolders.has(subFolder.tip.id) && (
                          <div className="p-4 border-t border-gray-200">
                            {subFolder.tip.summary && (
                              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                                <div className="flex items-center space-x-1 mb-1">
                                  <Brain className="w-3 h-3 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">AI Summary</span>
                                </div>
                                <ul className="text-sm text-blue-800 space-y-1">
                                  {String(subFolder.tip.summary).split('•').filter(point => point.trim()).map((point, index) => (
                                    <li key={index} className="flex items-start">
                                      <span className="mr-2 text-blue-600">•</span>
                                      <span>{point.trim()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {subFolder.tip.url && (
                              <div className="mb-3">
                                <button
                                  onClick={() => toggleUrlPreview(subFolder.tip.id)}
                                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 mb-2"
                                >
                                  {expandedUrlPreviews.has(subFolder.tip.id) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                  <span>URL Preview</span>
                                </button>
                                {expandedUrlPreviews.has(subFolder.tip.id) && (
                                  <UrlPreview url={subFolder.tip.url} />
                                )}
                              </div>
                            )}

                            {subFolder.tip.userContext && (
                              <div className="mb-3 p-2 bg-green-50 rounded-md">
                                <div className="flex items-center space-x-1 mb-1">
                                  <Info className="w-3 h-3 text-green-600" />
                                  <span className="text-sm font-medium text-green-900">Context</span>
                                </div>
                                <p className="text-sm text-green-800 line-clamp-2">{subFolder.tip.userContext}</p>
                              </div>
                            )}

                            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                              {subFolder.tip.relevanceDate && (
                                <div className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {format(new Date(subFolder.tip.relevanceDate), 'MMM dd')}
                                </div>
                              )}
                              
                              {subFolder.tip.relevanceEvent && (
                                <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded-full text-xs truncate">
                                  {subFolder.tip.relevanceEvent}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              
                            </div>
                          </div>
                        )}
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

      {/* Folder Modal */}
      <FolderModal 
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onFoldersChange={handleFoldersChange}
      />

      {/* Combine Folders Modal */}
      {showCombineModal && combineData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Combine Folders</h2>
              <button
                onClick={() => {
                  setShowCombineModal(false);
                  setCombineData(null);
                  setNewFolderName('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600 mb-4">
                  Combining <strong>{combineData.sourceFolder}</strong> and <strong>{combineData.targetFolder}</strong> 
                  ({combineData.combinedTips.length} tips total)
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New folder name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => setNewFolderName(combineData.sourceFolder)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Use &quot;{combineData.sourceFolder}&quot;
                  </button>
                  <button
                    onClick={() => setNewFolderName(combineData.targetFolder)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Use &quot;{combineData.targetFolder}&quot;
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCombineModal(false);
                    setCombineData(null);
                    setNewFolderName('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCombineFolders}
                  disabled={!newFolderName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Combine Folders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 