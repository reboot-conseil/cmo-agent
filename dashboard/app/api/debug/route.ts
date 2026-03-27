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

  // 4. Deep debug: trace storageGet step by step for first idea
  let deepDebug: Record<string, unknown> = {}
  if (ideasList.length > 0) {
    const relativePath = ideasList[0]
    const fullPathname = `${userId}/${relativePath}`
    deepDebug.relativePath = relativePath
    deepDebug.fullPathname = fullPathname

    try {
      // Step 1: list with exact prefix
      const { blobs: exactBlobs } = await list({ prefix: fullPathname, limit: 1 })
      deepDebug.exactListCount = exactBlobs.length
      deepDebug.exactListFirst = exactBlobs[0]
        ? { pathname: exactBlobs[0].pathname, hasDownloadUrl: !!exactBlobs[0].downloadUrl, downloadUrl: exactBlobs[0].downloadUrl?.slice(0, 80) + '...' }
        : null

      if (exactBlobs.length > 0) {
        const blob = exactBlobs.find(b => b.pathname === fullPathname)
        deepDebug.blobFound = !!blob
        deepDebug.pathnameMatch = blob ? blob.pathname === fullPathname : false
        deepDebug.pathnameFromList = exactBlobs[0]?.pathname
        deepDebug.pathnameExpected = fullPathname

        if (blob?.downloadUrl) {
          // Step 2: try fetching downloadUrl
          try {
            const res = await fetch(blob.downloadUrl)
            deepDebug.fetchStatus = res.status
            deepDebug.fetchOk = res.ok
            if (res.ok) {
              const text = await res.text()
              deepDebug.contentLength = text.length
              deepDebug.contentPreview = text.slice(0, 200)
            }
          } catch (e) {
            deepDebug.fetchError = String(e)
          }
        }
      }
    } catch (e) {
      deepDebug.error = String(e)
    }
  }

  return NextResponse.json({
    userId,
    USE_BLOB,
    rawBlobs: { count: rawBlobs.length, error: rawBlobsError },
    ideasList: { count: ideasList.length, error: ideasListError },
    campagnesList: { count: campagnesList.length, error: campagnesListError },
    deepDebug,
  })
}
