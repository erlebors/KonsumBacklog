'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface UrlPreviewProps {
  url: string;
}

interface UrlMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

export default function UrlPreview({ url }: UrlPreviewProps) {
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/url-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch metadata');
        }

        setMetadata(data.metadata);
      } catch (err) {
        console.error('Error fetching URL metadata:', err);
        setError('Failed to load preview');
        
        // Set fallback metadata instead of showing error
        try {
          const urlObj = new URL(url);
          setMetadata({
            title: urlObj.hostname.replace('www.', ''),
            description: `Link to ${urlObj.hostname}`,
            image: undefined,
            siteName: urlObj.hostname.replace('www.', ''),
            favicon: `${urlObj.protocol}//${urlObj.host}/favicon.ico`,
          });
          setError(null); // Clear error since we have fallback
        } catch {
          // If URL parsing fails, keep the error state
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading) {
    return (
      <div className="mb-3 p-3 bg-gray-50 rounded-md border">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return null;
  }

  const domain = (() => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown site';
    }
  })();

  return (
    <div className="mb-3 p-3 bg-gray-50 rounded-md border hover:bg-gray-100 transition-colors">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex items-start space-x-3">
          {/* Favicon or default icon */}
          <div className="flex-shrink-0 mt-1">
            {metadata.favicon ? (
              <img
                src={metadata.favicon}
                alt=""
                className="w-4 h-4 rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-4 h-4 text-gray-500" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Domain */}
            <div className="text-xs text-gray-500 mb-1">{domain}</div>
            
            {/* Title */}
            {metadata.title && (
              <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {metadata.title}
              </div>
            )}
            
            {/* Description */}
            {metadata.description && (
              <div className="text-sm text-gray-600 line-clamp-2">
                {metadata.description}
              </div>
            )}
          </div>

          {/* External link icon */}
          <div className="flex-shrink-0 mt-1">
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Image preview */}
        {metadata.image && (
          <div className="mt-3">
            <img
              src={metadata.image}
              alt=""
              className="w-full h-32 object-cover rounded-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </a>
    </div>
  );
} 