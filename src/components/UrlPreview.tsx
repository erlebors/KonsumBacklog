'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface UrlMetadata {
  title: string;
  description: string;
  image: string | null;
  favicon: string | null;
  domain: string;
}

interface UrlPreviewProps {
  url: string;
}

export default function UrlPreview({ url }: UrlPreviewProps) {
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const response = await fetch(`/api/url-metadata?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchMetadata();
    }
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        <span className="text-sm">{new URL(url).hostname}</span>
      </a>
    );
  }

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-start space-x-3">
        {metadata.favicon && (
          <img 
            src={metadata.favicon} 
            alt=""
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
              {metadata.title}
            </h4>
            <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
          </div>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-1">
            {metadata.description}
          </p>
          
          <p className="text-xs text-gray-500">
            {metadata.domain}
          </p>
        </div>
        
        {metadata.image && (
          <img 
            src={metadata.image} 
            alt=""
            className="w-16 h-16 object-cover rounded flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
    </a>
  );
} 