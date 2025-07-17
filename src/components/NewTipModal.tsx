'use client';

import { useState } from 'react';
import { X, Link, FileText, Brain } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewTipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTipModal({ isOpen, onClose }: NewTipModalProps) {
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !url.trim()) {
      toast.error('Please provide some content or a URL');
      return;
    }

    setIsSubmitting(true);
    setAiProcessing(true);

    try {
      const tipData = {
        content: content.trim(),
        url: url.trim(),
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

      if (result.aiProcessed) {
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

  const handleClose = () => {
    setContent('');
    setUrl('');
    setAiProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
              Content (optional)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quick note, tip, or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Link className="w-4 h-4 inline mr-1" />
              URL (optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* AI Processing Indicator */}
          {aiProcessing && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">AI is analyzing your tip...</span>
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
              disabled={isSubmitting || (!content.trim() && !url.trim())}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Tip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 