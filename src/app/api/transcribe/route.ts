import { NextRequest, NextResponse } from 'next/server'
import { MistralClient } from '../../../lib/mistral-client'

export async function POST(req: NextRequest) {
  try {
    const { audio, language = 'nl', model = 'voxtral-mini-latest' } = await req.json()

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      )
    }

    // Initialize Mistral client
    const mistralClient = new MistralClient(process.env.MISTRAL_API_KEY!)

    // Transcribe audio using Mistral's Voxtral model
    const text = await mistralClient.transcribeAudio(audio, 'webm')

    return NextResponse.json({
      text: text,
      language: language
    })
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        message: error.message 
      },
      { status: 500 }
    )
  }
}