'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Folder,
  Tag,
  Clock,
  ExternalLink
} from 'lucide-react';
import { firestoreService, Tip } from '@/lib/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function FirestoreTestPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [newTip, setNewTip] = useState({
    content: '',
    url: '',
    folder: 'General Tips'
  });
  const { user } = useAuth();

  useEffect(() => {
    testConnection();
    if (user) {
      fetchTips();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const isConnected = await firestoreService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'error');
      if (isConnected) {
        toast.success('Firestore connection successful!');
      } else {
        toast.error('Firestore connection failed!');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('Firestore connection failed:', error);
      toast.error('Firestore connection failed!');
    }
  };

  const fetchTips = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const fetchedTips = await firestoreService.getAllTips(user.uid);
      setTips(fetchedTips);
      toast.success(`Loaded ${fetchedTips.length} tips`);
    } catch (error) {
      console.error('Error fetching tips:', error);
      toast.error('Failed to fetch tips');
    } finally {
      setLoading(false);
    }
  };

  const createTestData = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    setLoading(true);
    try {
      const createdTips = await firestoreService.createTestData(user.uid);
      setTips(createdTips);
      toast.success(`Created ${createdTips.length} test tips`);
    } catch (error) {
      console.error('Error creating test data:', error);
      toast.error('Failed to create test data');
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    if (!confirm('Are you sure you want to delete all test data?')) {
      return;
    }

    setLoading(true);
    try {
      await firestoreService.clearTestData(user.uid);
      setTips([]);
      toast.success('All test data cleared');
    } catch (error) {
      console.error('Error clearing test data:', error);
      toast.error('Failed to clear test data');
    } finally {
      setLoading(false);
    }
  };

  const addTip = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    if (!newTip.content.trim()) {
      toast.error('Please enter tip content');
      return;
    }

    setLoading(true);
    try {
      const tipData: Omit<Tip, 'id'> = {
        content: newTip.content,
        url: newTip.url,
        title: newTip.content.substring(0, 50) + (newTip.content.length > 50 ? '...' : ''),
        relevanceDate: null,
        relevanceEvent: null,
        createdAt: new Date().toISOString(),
        folder: newTip.folder,
        priority: '5',
        summary: '• Manual tip entry\n• Requires review and categorization\n• Consider adding more details',
        tags: [],
        actionRequired: false,
        estimatedTime: '',
        isProcessed: false,
        aiProcessed: false,
        urgencyLevel: 'medium'
      };

      const createdTip = await firestoreService.addTip(user.uid, tipData);
      setTips([createdTip, ...tips]);
      setNewTip({ content: '', url: '', folder: 'General Tips' });
      toast.success('Tip added successfully');
    } catch (error) {
      console.error('Error adding tip:', error);
      toast.error('Failed to add tip');
    } finally {
      setLoading(false);
    }
  };

  const deleteTip = async (tipId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this tip?')) {
      return;
    }

    try {
      await firestoreService.deleteTip(user.uid, tipId);
      setTips(tips.filter(tip => tip.id !== tipId));
      toast.success('Tip deleted successfully');
    } catch (error) {
      console.error('Error deleting tip:', error);
      toast.error('Failed to delete tip');
    }
  };

  const updateTip = async (tipId: string, updates: Partial<Tip>) => {
    if (!user) return;

    try {
      await firestoreService.updateTip(user.uid, tipId, updates);
      setTips(tips.map(tip => 
        tip.id === tipId ? { ...tip, ...updates } : tip
      ));
      toast.success('Tip updated successfully');
    } catch (error) {
      console.error('Error updating tip:', error);
      toast.error('Failed to update tip');
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Testing Connection...';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Required</h2>
          <p className="text-gray-500">Please log in to test Firestore functionality.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Firestore Test Page</h1>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={testConnection}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Test Connection</span>
            </button>
            
            <button
              onClick={fetchTips}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Tips</span>
            </button>
            
            <button
              onClick={createTestData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Create Test Data</span>
            </button>
            
            <button
              onClick={clearTestData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>

        {/* Add New Tip */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Tip</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={newTip.content}
                onChange={(e) => setNewTip({ ...newTip, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter tip content..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL (optional)
                </label>
                <input
                  type="url"
                  value={newTip.url}
                  onChange={(e) => setNewTip({ ...newTip, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder
                </label>
                <select
                  value={newTip.folder}
                  onChange={(e) => setNewTip({ ...newTip, folder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="General Tips">General Tips</option>
                  <option value="Programming">Programming</option>
                  <option value="UI/UX">UI/UX</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Backend">Backend</option>
                </select>
              </div>
            </div>
            <button
              onClick={addTip}
              disabled={loading || !newTip.content.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Tip</span>
            </button>
          </div>
        </div>

        {/* Tips List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Tips ({tips.length})
            </h2>
            {loading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>
          
          {tips.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No tips found. Create some test data to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tips.map((tip) => (
                <div key={tip.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{tip.title}</h3>
                        <div className="flex items-center space-x-1">
                          <Folder className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">{tip.folder}</span>
                        </div>
                        {tip.url && (
                          <a
                            href={tip.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      
                      {tip.summary && (
                        <div className="text-sm text-gray-600 mb-2 whitespace-pre-line">
                          {tip.summary}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(tip.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Tag className="w-4 h-4" />
                          <span>Priority: {tip.priority}</span>
                        </div>
                        {tip.urgencyLevel && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tip.urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                            tip.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {tip.urgencyLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => updateTip(tip.id, { isProcessed: !tip.isProcessed })}
                        className={`p-2 rounded-lg ${
                          tip.isProcessed 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={tip.isProcessed ? 'Mark as unprocessed' : 'Mark as processed'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTip(tip.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                        title="Delete tip"
                      >
                        <Trash2 className="w-4 h-4" />
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