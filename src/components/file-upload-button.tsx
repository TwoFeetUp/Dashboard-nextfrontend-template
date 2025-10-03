'use client'

import { useRef } from 'react'
import { Paperclip } from 'lucide-react'
import { Button } from './ui/button'

interface FileUploadButtonProps {
  onFileSelect: (files: FileList) => void
  disabled?: boolean
  multiple?: boolean
}

export function FileUploadButton({ 
  onFileSelect, 
  disabled = false,
  multiple = true 
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files)
      // Reset input to allow selecting the same file again
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
        multiple={multiple}
        disabled={disabled}
      />
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        size="icon"
        variant="secondary"
        title="Upload file"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  )
}