/**
 * Attachment persistence service for conversation files
 * Handles upload, retrieval, and deletion of file attachments in PocketBase
 */
import pb from './pocketbase'

export interface PersistedAttachment {
  id: string
  collectionId: string
  collectionName: string
  conversationId: string
  userId: string
  file: string
  originalName: string
  mimeType: string
  fileSize: number
  status: 'uploading' | 'ready' | 'error'
  created: string
  updated: string
}

/**
 * Upload a file to PocketBase for a specific conversation
 */
export async function uploadAttachment(
  conversationId: string,
  userId: string,
  file: File
): Promise<PersistedAttachment> {
  const formData = new FormData()
  formData.append('conversationId', conversationId)
  formData.append('userId', userId)
  formData.append('file', file)
  formData.append('originalName', file.name)
  formData.append('mimeType', file.type || 'application/octet-stream')
  formData.append('fileSize', file.size.toString())
  formData.append('status', 'ready')

  return await pb.collection('conversation_attachments').create<PersistedAttachment>(formData)
}

/**
 * Get all attachments for a conversation
 */
export async function getConversationAttachments(
  conversationId: string
): Promise<PersistedAttachment[]> {
  return await pb.collection('conversation_attachments').getFullList<PersistedAttachment>({
    filter: `conversationId = "${conversationId}"`,
    sort: '-created'
  })
}

/**
 * Delete an attachment by ID
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  await pb.collection('conversation_attachments').delete(attachmentId)
}

/**
 * Get the URL for accessing an attachment file from PocketBase
 */
export function getAttachmentUrl(attachment: PersistedAttachment): string {
  return pb.files.getURL(attachment, attachment.file)
}

/**
 * Fetch an attachment by ID
 */
export async function getAttachmentById(attachmentId: string): Promise<PersistedAttachment> {
  return await pb.collection('conversation_attachments').getOne<PersistedAttachment>(attachmentId)
}

/**
 * Fetch file content as base64 (for sending to agent)
 * This is needed when the file content is no longer in memory
 */
export async function getAttachmentBase64(attachment: PersistedAttachment): Promise<string> {
  const url = getAttachmentUrl(attachment)
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
