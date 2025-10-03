'use client'

import { useState } from 'react'
import { DocumentAttachmentsList } from './document-attachment'
import { Paperclip, AlertCircle } from 'lucide-react'
import type { DocumentAttachment } from '../lib/types'

interface DragDropZoneProps {
  onFilesDropped: (files: FileList) => void
  uploadError: string | null
  documents: DocumentAttachment[]
  onRemoveDocument: (id: string) => void
  children: React.ReactNode
}

export default function DragDropZone({
  onFilesDropped,
  uploadError,
  documents,
  onRemoveDocument,
  children
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      onFilesDropped(files)
    }
  }

  return (
    <div
      className="flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg z-10 pointer-events-none flex items-center justify-center">
          <div className="text-center bg-white/90 p-4 rounded-lg">
            <Paperclip className="h-10 w-10 text-blue-500 mx-auto mb-2" />
            <p className="text-base font-medium text-blue-700">Drop files here</p>
            <p className="text-xs text-gray-600 mt-1">PDF, images, Word documents</p>
          </div>
        </div>
      )}
      
      {uploadError && (
        <div className="flex-shrink-0 bg-red-50 border-t border-red-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        </div>
      )}
      
      {documents.length > 0 && (
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
          <DocumentAttachmentsList 
            documents={documents}
            onRemove={onRemoveDocument}
          />
        </div>
      )}
      
      {children}
    </div>
  )
}