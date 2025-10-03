'use client'

import { FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { DocumentAttachment } from '../lib/types'

interface DocumentAttachmentsListProps {
  documents: DocumentAttachment[]
  onRemove: (id: string) => void
}

export function DocumentAttachmentsList({ documents, onRemove }: DocumentAttachmentsListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const getFileIcon = (doc: DocumentAttachment) => {
    if (doc.type.includes('pdf')) return 'PDF'
    if (doc.type.includes('image')) return 'IMG'
    if (doc.type.includes('word')) return 'DOC'
    if (doc.type.includes('powerpoint')) return 'PPT'
    return 'FILE'
  }

  const getStatusIcon = (doc: DocumentAttachment) => {
    switch (doc.status) {
      case 'uploading':
        return <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-500" />
      case 'processing':
        return <Loader2 className="h-2.5 w-2.5 animate-spin text-yellow-500" />
      case 'ready':
        return <CheckCircle className="h-2.5 w-2.5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-2.5 w-2.5 text-red-500" />
    }
  }

  return (
    <div className="space-y-2">
      {/* Header with document count */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="flex items-center gap-1.5 text-gray-600">
          <FileText className="h-3.5 w-3.5" />
          <span>{documents.length} file{documents.length !== 1 ? 's' : ''}</span>
          {documents.filter(d => d.status === 'processing' || d.status === 'uploading').length > 0 && (
            <span className="text-yellow-600">
              ({documents.filter(d => d.status === 'processing' || d.status === 'uploading').length} processing...)
            </span>
          )}
        </span>
      </div>

      {/* Document grid - 4 cards per row for compact display */}
      <div className="grid grid-cols-4 gap-1.5">
        {documents.map((doc) => (
          <div key={doc.id} className="relative group bg-white border border-gray-200 rounded-md p-2 hover:border-gray-300 hover:shadow-sm transition-all">
            {/* Remove button - only visible on hover */}
            <button
              onClick={() => onRemove(doc.id)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex hover:bg-red-600 transition-colors z-10"
              title="Remove"
              disabled={doc.status === 'uploading' || doc.status === 'processing'}
            >
              <X className="h-2.5 w-2.5" />
            </button>

            {/* File type badge in corner */}
            <div className="absolute top-1 right-1 text-[8px] font-bold text-gray-400">
              {getFileIcon(doc)}
            </div>
            
            <div className="space-y-1">
              {/* Filename - can wrap to 2 lines */}
              <div className="text-[10px] font-medium text-gray-900 leading-tight break-words line-clamp-2" title={doc.name}>
                {doc.name}
              </div>
              
              {/* Size and status on same line */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] text-gray-500">
                  {formatFileSize(doc.size)}
                </span>
                
                <div className="flex items-center gap-0.5">
                  {getStatusIcon(doc)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}