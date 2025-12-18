import { NextRequest, NextResponse } from 'next/server'

const isTextFile = (mimeType: string | undefined, filename: string | undefined): boolean => {
  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'application/x-markdown') {
    return true
  }

  if (filename) {
    const lowerFilename = filename.toLowerCase()
    return lowerFilename.endsWith('.txt') || lowerFilename.endsWith('.md') || lowerFilename.endsWith('.markdown')
  }

  return false
}

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

    if (isTextFile(mimeType, filename)) {
      const text = document === '' ? '' : Buffer.from(document, 'base64').toString('utf-8')
      return NextResponse.json({
        success: true,
        text,
        characterCount: text.length,
        pageCount: 1,
        metadata: {
          format: mimeType ?? 'text/plain',
          directPassThrough: true,
        },
      })
    }

    // Initialize Mistral client
    const apiKey = process.env.MISTRAL_API_KEY?.trim()

    if (!apiKey || !apiKey.trim()) {
      console.error('Mistral API key missing for OCR route')
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
          message: 'OCR service API key is not configured'
        },
        { status: 500 }
      )
    }

    // Process OCR using Mistral's OCR model
    const effectiveMimeType = mimeType?.trim() || 'application/octet-stream'
    const dataUrl = `data:${effectiveMimeType};base64,${document}`
    const isImage = effectiveMimeType.startsWith('image/')

    const mistralPayload = {
      model: 'mistral-ocr-latest',
      document: isImage
        ? { type: 'image_url', image_url: dataUrl }
        : { type: 'document_url', document_url: dataUrl },
      include_image_base64: includeImageBase64,
    }

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(mistralPayload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Mistral OCR API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process document',
          message: errorText || response.statusText,
        },
        { status: 502 },
      )
    }

    const mistralResult = (await response.json()) as { pages?: Array<{ markdown?: string }> }
    const extractedText = mistralResult.pages?.map((page) => page.markdown || '').join('\n\n') ?? ''
    const pageCount = mistralResult.pages?.length ?? 0

    // Check character and page limits
    const MAX_CHARACTERS = 100000
    const MAX_PAGES = 100

    if (extractedText.length > MAX_CHARACTERS) {
      return NextResponse.json(
        { 
          error: 'Document exceeds character limit',
          message: `Document has ${extractedText.length} characters, maximum is ${MAX_CHARACTERS}`,
          characterCount: extractedText.length
        },
        { status: 413 }
      )
    }

    if (pageCount > MAX_PAGES) {
      return NextResponse.json(
        { 
          error: 'Document exceeds page limit',
          message: `Document has ${pageCount} pages, maximum is ${MAX_PAGES}`,
          pageCount
        },
        { status: 413 }
      )
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      characterCount: extractedText.length,
      pageCount,
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
