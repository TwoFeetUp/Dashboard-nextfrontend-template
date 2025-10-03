import { NextRequest, NextResponse } from 'next/server'
import { MistralClient, DocumentInput } from '../../../lib/mistral-client'

export async function POST(req: NextRequest) {
  try {
    const { 
      document, // Base64 content
      filename,
      mimeType,
      includeImageBase64 = false 
    } = await req.json()

    // Allow empty string for text files (empty files are valid)
    if (document === null || document === undefined) {
      return NextResponse.json(
        { error: 'Document data is required' },
        { status: 400 }
      )
    }

    // Initialize Mistral client
    const apiKey = process.env.MISTRAL_API_KEY

    if (!apiKey || !apiKey.trim()) {
      console.error('dY"? Mistral API key missing for OCR route')
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
          message: 'OCR service API key is not configured'
        },
        { status: 500 }
      )
    }

    console.log('dY"? OCR route using Mistral key length:', apiKey.trim().length)
    const mistralClient = new MistralClient(apiKey)

    // Process OCR using Mistral's OCR model
    console.log('🔄 Starting OCR processing for:', {
      filename,
      mimeType,
      documentSize: document.length,
      includeImageBase64
    })

    // Prepare document input
    const documentInput: DocumentInput = {
      type: mimeType?.includes('image') ? 'image_url' : 'document_url',
      content: document,
      filename,
      mimeType
    }

    const result = await mistralClient.processOCR(documentInput, {
      includeImageBase64,
      language: 'nl' // Default to Dutch, can be made configurable
    })

    console.log('📊 OCR Result:', {
      filename,
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      pages: result.pages,
      characterCount: result.characterCount
    })

    // Check character and page limits
    const MAX_CHARACTERS = 100000
    const MAX_PAGES = 100

    if (result.characterCount > MAX_CHARACTERS) {
      return NextResponse.json(
        { 
          error: 'Document exceeds character limit',
          message: `Document has ${result.characterCount} characters, maximum is ${MAX_CHARACTERS}`,
          characterCount: result.characterCount
        },
        { status: 413 }
      )
    }

    if (result.pages && result.pages > MAX_PAGES) {
      return NextResponse.json(
        { 
          error: 'Document exceeds page limit',
          message: `Document has ${result.pages} pages, maximum is ${MAX_PAGES}`,
          pageCount: result.pages
        },
        { status: 413 }
      )
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      characterCount: result.characterCount,
      pageCount: result.pages,
      metadata: result.metadata
    })
  } catch (error: any) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process document',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

// Max file size: 10MB
export const maxDuration = 60 // 60 seconds timeout for OCR processing