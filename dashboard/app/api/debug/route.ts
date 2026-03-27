import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { list } from '@vercel/blob'
import { storageList, storageGet } from '@/lib/storage'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN

  // 1. List blobs directly via Vercel Blob API
  let rawBlobs: string[] = []
  let rawBlobsError: string | null = null
  try {
    const prefix = `${userId}/`
    const { blobs } = await list({ prefix })
    rawBlobs = blobs.map(b => b.pathname)
  } catch (e) {
    rawBlobsError = String(e)
  }

  // 2. storageList for ideas
  let ideasList: string[] = []
  let ideasListError: string | null = null
  try {
    ideasList = await storageList(userId, 'content/ideas/')
  } catch (e) {
    ideasListError = String(e)
  }

  // 3. storageList for campagnes
  let campagnesList: string[] = []
  let campagnesListError: string | null = null
  try {
    campagnesList = await storageList(userId, 'content/campagnes/')
  } catch (e) {
    campagnesListError = String(e)
  }

  // 4. Try reading first idea if any
  let firstIdeaContent: string | null = null
  let firstIdeaError: string | null = null
  if (ideasList.length > 0) {
    try {
      firstIdeaContent = await storageGet(userId, ideasList[0])
      if (firstIdeaContent) firstIdeaContent = firstIdeaContent.slice(0, 200) + '...'
    } catch (e) {
      firstIdeaError = String(e)
    }
  }

  return NextResponse.json({
    userId,
    USE_BLOB,
    rawBlobs: { count: rawBlobs.length, files: rawBlobs, error: rawBlobsError },
    ideasList: { count: ideasList.length, files: ideasList, error: ideasListError },
    campagnesList: { count: campagnesList.length, files: campagnesList, error: campagnesListError },
    firstIdea: { content: firstIdeaContent, error: firstIdeaError },
  })
}
