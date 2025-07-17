'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Brain, Folder, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewTipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TipPreview {
  content: string;
  title: string;
  category: string;
  url: string;
}

export default function NewTipModal({ isOpen, onClose }: NewTipModalProps) {
  const [content, setContent] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [tipPreviews, setTipPreviews] = useState<TipPreview[]>([]);
  const [showPreviews, setShowPreviews] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);

  // Fetch available folders when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableFolders();
    }
  }, [isOpen]);

  const fetchAvailableFolders = async () => {
    try {
      const response = await fetch('/api/folders/available');
      if (response.ok) {
        const data = await response.json();
        setAvailableFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching available folders:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Please provide some content');
      return;
    }

    setIsSubmitting(true);
    setAiProcessing(true);

    try {
      const tipData = {
        content: content.trim(),
        selectedFolder: selectedFolder.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tipData),
      });

      const result = await response.json();

      if (!response.ok || !result || typeof result !== 'object') {
        throw new Error(result?.error || 'Failed to save tip');
      }

      if (result.tips && result.tips.length > 1) {
        // Multiple tips were created
        toast.success(`${result.tips.length} tips saved and processed with AI!`);
      } else if (result.aiProcessed) {
        toast.success('Tip saved and processed with AI!');
      } else if (result.aiError) {
        toast.success('Tip saved! (AI processing failed)');
      } else {
        toast.success('Tip saved successfully!');
      }
      handleClose();
    } catch (error) {
      console.error('Error saving tip:', error);
      toast.error('Failed to save tip. Please try again.');
    } finally {
      setIsSubmitting(false);
      setAiProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (!content.trim()) {
      toast.error('Please provide some content');
      return;
    }

    setAiProcessing(true);
    try {
      const response = await fetch('/api/tips/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          selectedFolder: selectedFolder.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (response.ok && result.tips) {
        setTipPreviews(result.tips);
        setShowPreviews(true);
      }
    } catch (error) {
      console.error('Error previewing tips:', error);
      toast.error('Failed to preview tips');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setSelectedFolder('');
    setAiProcessing(false);
    setTipPreviews([]);
    setShowPreviews(false);
    setShowFolderDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">New Tip</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter tips, URLs, or descriptions... You can include multiple items separated by commas, like: 'https://example.com, smithsonian institute, museum of spies'"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: You can include multiple items (text or URLs) separated by commas, &quot;and&quot;, or &quot;or&quot;. Each will be created as a separate tip in the same folder.
            </p>
          </div>

          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Folder className="w-4 h-4 inline mr-1" />
              Choose Folder (Optional)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
              >
                <span className={selectedFolder ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedFolder || 'Let AI choose the best folder'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFolderDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showFolderDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolder('');
                      setShowFolderDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-700 border-b border-gray-200"
                  >
                    Let AI choose the best folder
                  </button>
                  {availableFolders.map((folder) => (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => {
                        setSelectedFolder(folder);
                        setShowFolderDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-900"
                    >
                      {folder}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose a specific folder or let AI automatically categorize your tips.
            </p>
          </div>

          {/* Preview Button */}
          {content.trim() && (
            <button
              type="button"
              onClick={handlePreview}
              disabled={aiProcessing}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {aiProcessing ? 'Analyzing...' : 'Preview Tips'}
            </button>
          )}

          {/* Tip Previews */}
          {showPreviews && tipPreviews.length > 0 && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Preview: {tipPreviews.length} tip{tipPreviews.length !== 1 ? 's' : ''} will be created
              </h3>
              <div className="space-y-2">
                {tipPreviews.map((tip, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Folder className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{tip.title}</span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {tip.category}
                    </span>
                    {tip.url && (
                      <span className="text-green-600 text-xs">(URL detected)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Processing Indicator */}
          {aiProcessing && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {showPreviews ? 'Analyzing your content...' : 'AI is analyzing your tip...'}
              </span>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Tip' + (tipPreviews.length > 1 ? 's' : '')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 