'use client';

import { useState, useEffect } from 'react';
import { X, Folder, Edit3, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAuthenticatedRequest } from '@/lib/clientAuth';

interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoldersChange: () => void;
}

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

export default function FolderModal({ isOpen, onClose, onFoldersChange }: FolderModalProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    try {
      const requestOptions = await createAuthenticatedRequest('/api/folders');
      const response = await fetch('/api/folders', requestOptions);
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      const url = editingFolder ? '/api/folders' : '/api/folders';
      const method = editingFolder ? 'PUT' : 'POST';
      const body = editingFolder 
        ? { id: editingFolder.id, ...formData }
        : formData;

      const requestOptions = await createAuthenticatedRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const response = await fetch(url, requestOptions);

      if (response.ok) {
        toast.success(editingFolder ? 'Folder updated!' : 'Folder created!');
        onFoldersChange();
        handleClose();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save folder');
      }
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error('Failed to save folder');
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Tips in this folder will be moved to "Uncategorized".')) {
      return;
    }

    try {
      const requestOptions = await createAuthenticatedRequest(`/api/folders?id=${folderId}`, {
        method: 'DELETE',
      });

      const response = await fetch(`/api/folders?id=${folderId}`, requestOptions);

      if (response.ok) {
        toast.success('Folder deleted!');
        onFoldersChange();
        fetchFolders();
      } else {
        throw new Error('Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const handleEdit = (folder: Folder) => {
    setEditingFolder(folder);
    setFormData({
      name: folder.name,
      description: folder.description || '',
      color: folder.color || '#3B82F6'
    });
    setShowCreateForm(true);
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setEditingFolder(null);
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {showCreateForm ? (editingFolder ? 'Edit Folder' : 'Create New Folder') : 'Manage Folders'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      formData.color === color
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
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingFolder ? 'Update Folder' : 'Create Folder'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                Create custom folders to organize your tips. The AI will use these folders when categorizing new tips.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Folder className="w-4 h-4" />
                <span>New Folder</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading folders...</p>
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No custom folders yet</h3>
                <p className="text-gray-600 mb-4">Create your first folder to start organizing tips.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create First Folder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: folder.color || '#3B82F6' }}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{folder.name}</h3>
                        {folder.description && (
                          <p className="text-sm text-gray-600">{folder.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(folder)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="Edit folder"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(folder.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                        title="Delete folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 