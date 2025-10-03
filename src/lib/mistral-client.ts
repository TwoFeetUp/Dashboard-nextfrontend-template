import { Mistral } from '@mistralai/mistralai'

export interface OCROptions {
  includeImageBase64?: boolean
  language?: string
}

export interface OCRResponse {
  pages?: Array<{
    markdown?: string
    images?: Array<{
      base64?: string
      bbox?: [number, number, number, number]
    }>
  }>
  usageInfo?: any
}

export interface OCRResult {
  text: string
  pages?: number
  characterCount: number
  images?: Array<{
    base64?: string
    bbox?: [number, number, number, number]
  }>
  metadata?: {
    format?: string
    pages?: number
    language?: string
    directPassThrough?: boolean
  }
}

export interface DocumentInput {
  type?: 'document_url' | 'image_url' | 'file'
  document_url?: string
  image_url?: string
  fileId?: string
  content?: string // Base64 content
  filename?: string
  mimeType?: string
}

export class MistralClient {
  private client: Mistral
  private apiKey: string
  
  constructor(apiKey: string) {
    const normalizedKey = typeof apiKey === 'string' ? apiKey.trim() : ''
    if (!normalizedKey) {
      throw new Error('Mistral API key is required')
    }

    if (normalizedKey !== apiKey) {
      console.warn('dY"? Mistral API key contained leading/trailing whitespace; trimmed before use.')
    }

    this.apiKey = normalizedKey
    this.client = new Mistral({ apiKey: normalizedKey })
  }
  
  // Helper to check if a file should be processed as text (no OCR needed)
  // ONLY check for .txt and .md files - let everything else go to Mistral
  isTextFile(mimeType: string | undefined, filename: string | undefined): boolean {
    // Only handle plain text and markdown files
    // Everything else goes to Mistral OCR for them to handle
    
    // Check MIME type for text/markdown only
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'application/x-markdown') {
      return true
    }
    
    // Check file extension as fallback
    if (filename) {
      const lowerFilename = filename.toLowerCase()
      return lowerFilename.endsWith('.txt') || lowerFilename.endsWith('.md') || lowerFilename.endsWith('.markdown')
    }
    
    return false
  }
  
  // Process a document (text files directly, others via OCR)
  async processDocument(document: DocumentInput, options: OCROptions = {}): Promise<OCRResult> {
    // Check if this is a text file that should be passed through
    if (this.isTextFile(document.mimeType, document.filename)) {
      return this.processTextFile(document, options)
    }
    
    // Otherwise, use OCR
    return this.processOCR(document, options)
  }
  
  // Process text files directly without OCR
  private async processTextFile(document: DocumentInput, options: OCROptions = {}): Promise<OCRResult> {
    // Handle empty files (empty base64 string is valid)
    if (document.content === null || document.content === undefined) {
      throw new Error('Text file requires base64 content')
    }
    
    // Empty string is valid for empty files
    const textContent = document.content === '' ? '' : Buffer.from(document.content, 'base64').toString('utf-8')
    
    console.log('📝 Text/Markdown file detected, passing through directly:', {
      filename: document.filename,
      mimeType: document.mimeType,
      textLength: textContent.length
    })
    
    // Return the text directly as an OCRResult
    return {
      text: textContent,
      characterCount: textContent.length,
      pages: 1, // Text files are considered 1 page
      metadata: {
        format: document.mimeType || 'text/plain',
        pages: 1,
        language: options.language || 'auto',
        directPassThrough: true // Flag to indicate this was not OCR'd
      }
    }
  }
  
  // OCR processing for documents (non-text files)
  async processOCR(document: DocumentInput, options: OCROptions = {}): Promise<OCRResult> {
    try {
      // If this is a text file, redirect to the text file handler
      if (this.isTextFile(document.mimeType, document.filename)) {
        return this.processTextFile(document, options)
      }
      
      // Prepare the document data for SDK
      let documentData: any = {}
      
      if (document.content) {
        // Base64 content provided
        const mimeType = document.mimeType || this.getMimeType(document.filename || 'document')
        
        // Simple check: if it starts with 'image/', use base64 directly
        // For EVERYTHING else (including unknown types), upload to Mistral
        if (mimeType.startsWith('image/')) {
          // Images can use base64 directly
          const dataUrl = `data:${mimeType};base64,${document.content}`
          documentData = {
            imageUrl: dataUrl
          }
        } else {
          // For ALL non-image files (PDF, Word, ZIP, unknown, etc), upload to Mistral
          // Let Mistral decide if it's supported or not
          try {
            const buffer = Buffer.from(document.content, 'base64')
            
            // Ensure we have a proper filename with extension for DOCX files
            let filename = document.filename || 'document'
            if (mimeType.includes('wordprocessingml') && !filename.endsWith('.docx')) {
              filename = filename + '.docx'
            }
            
            // Fix MIME type for DOCX files to avoid application/zip issue
            let correctedMimeType = mimeType
            if (filename.endsWith('.docx')) {
              correctedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            } else if (filename.endsWith('.pptx')) {
              correctedMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            }
            
            // Upload file content directly to Mistral without relying on browser File APIs
            const uploadPayload = {
              file: {
                fileName: filename,
                content: buffer
              },
              purpose: 'ocr' as const
            }

            console.log('dY" Uploading file to Mistral:', {
              filename,
              mimeType: correctedMimeType,
              size: buffer.length
            })

            const uploadedFile = await this.client.files.upload(uploadPayload)

            // Use the uploaded file reference for OCR to avoid signed URL auth issues
            documentData = {
              type: 'file',
              fileId: uploadedFile.id
            }
          } catch (uploadError: any) {
            // If Mistral rejects the file type, return a user-friendly error
            if (uploadError.message?.includes('Invalid file format') || uploadError.statusCode === 422) {
              throw new Error(`Mistral OCR does not support this file type (${mimeType}). ${uploadError.body || uploadError.message || ''}`)
            }
            throw uploadError
          }
        }
      } else if (document.document_url) {
        documentData = {
          documentUrl: document.document_url
        }
      } else if (document.image_url) {
        documentData = {
          imageUrl: document.image_url
        }
      } else {
        throw new Error('No document content provided')
      }
      
      // Use the SDK to process OCR
      // For docx files, we need to either include images as base64 or set imageLimit to 0
      const ocrParams: any = {
        model: 'mistral-ocr-latest',
        document: documentData
      }
      
      // Check if it's a docx file
      const isDocx = document.filename?.endsWith('.docx') || 
                     document.mimeType?.includes('wordprocessingml')
      
      if (isDocx) {
        // For docx, either include images as base64 or don't extract them
        if (options.includeImageBase64) {
          ocrParams.includeImageBase64 = true
        } else {
          ocrParams.imageLimit = 0
        }
      } else {
        // For other files, use the option as-is
        ocrParams.includeImageBase64 = options.includeImageBase64 || false
      }
      
      const response = await this.client.ocr.process(ocrParams) as OCRResponse
      
      // Debug: Log the response structure
      console.log('📊 OCR Response structure:', {
        hasPages: !!response.pages,
        pagesLength: response.pages?.length,
        responseKeys: Object.keys(response)
      })
      
      // Extract text from pages array (Mistral returns text in pages[].markdown)
      let extractedText = ''
      let pageCount = 0
      
      if (response.pages && Array.isArray(response.pages)) {
        console.log(`📄 Processing ${response.pages.length} pages`)
        response.pages.forEach((page: any, index: number) => {
          const pageText = page.markdown || ''
          console.log(`   Page ${index + 1}: ${pageText.length} characters`)
        })
        extractedText = response.pages
          .map((page: any) => page.markdown || '')
          .join('\n\n')
        pageCount = response.pages.length
      }
      
      // Parse the response
      const result: OCRResult = {
        text: extractedText,
        characterCount: extractedText.length,
        pages: pageCount,
        metadata: response.usageInfo
      }
      
      // Add images if requested
      if (options.includeImageBase64 && response.pages) {
        // Extract images from pages
        const allImages: any[] = []
        response.pages.forEach((page: any) => {
          if (page.images && Array.isArray(page.images)) {
            allImages.push(...page.images)
          }
        })
        if (allImages.length > 0) {
          result.images = allImages
        }
      }
      
      return result
    } catch (error: any) {
      console.error('OCR processing error:', error)
      throw error
    }
  }
  
  // Voice transcription using Voxtral
  async transcribeAudio(audioData: string, format: string = 'webm'): Promise<string> {
    try {
      // Convert base64 to blob for API
      const audioBlob = Buffer.from(audioData, 'base64')
      
      // Create FormData for the request
      const formData = new FormData()
      const audioFile = new File([audioBlob], `audio.${format}`, { type: `audio/${format}` })
      formData.append('file', audioFile)
      formData.append('model', 'voxtral-mini-latest')
      formData.append('language', 'nl') // Dutch
      
      const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Mistral Voxtral API error:', errorText)
        throw new Error(`Failed to transcribe audio: ${response.status}`)
      }
      
      const data = await response.json() as { text?: string }
      return data.text || ''
    } catch (error: any) {
      console.error('Voice transcription error:', error)
      throw error
    }
  }
  
  // Helper to determine MIME type
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'ppt': 'application/vnd.ms-powerpoint',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'markdown': 'text/markdown'
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}



