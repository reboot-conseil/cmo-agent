// scripts/migrate-to-blob.ts
// Migrates local content/ files to Vercel Blob, namespaced by userId.
// Usage:
//   npx tsx scripts/migrate-to-blob.ts --dry-run
//   ADMIN_USER_ID=user_xxx npx tsx scripts/migrate-to-blob.ts --dry-run
//   ADMIN_USER_ID=user_xxx npx tsx scripts/migrate-to-blob.ts
//   ADMIN_USER_ID=user_xxx npx tsx scripts/migrate-to-blob.ts --force
//   npx tsx scripts/migrate-to-blob.ts --userId=user_xxx --dry-run

import fs from 'fs'
import path from 'path'
import { put } from '@vercel/blob'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const ADMIN_USER_ID = process.env.ADMIN_USER_ID
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

// Support --userId=user_xxx pour migrer un user autre que ADMIN_USER_ID
const userIdArg = process.argv.find(a => a.startsWith('--userId='))
const TARGET_USER_ID = userIdArg ? userIdArg.split('=')[1] : ADMIN_USER_ID

if (!TARGET_USER_ID) {
  console.error('ERROR: ADMIN_USER_ID env var or --userId=user_xxx flag is required')
  process.exit(1)
}

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

async function main() {
  const contentDir = path.join(CMO_BASE, 'content')
  const files = walkDir(contentDir)

  console.log(`Target user: ${TARGET_USER_ID}`)
  console.log(`Content dir: ${contentDir}`)
  console.log(`Found ${files.length} files to migrate`)
  if (DRY_RUN) console.log('--- DRY RUN — no writes ---')
  if (FORCE) console.log('--- FORCE — will overwrite existing blobs ---')
  console.log()

  let success = 0
  let errors = 0

  for (const filePath of files) {
    const relativePath = path.relative(CMO_BASE, filePath)
    const blobPath = `${TARGET_USER_ID}/${relativePath}`

    console.log(`${DRY_RUN ? '[DRY]' : '[PUT]'} ${blobPath}`)

    if (!DRY_RUN) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        await put(blobPath, content, {
          access: 'private',
          contentType: 'text/markdown; charset=utf-8',
          addRandomSuffix: false,
          allowOverwrite: FORCE,
        })
        success++
      } catch (e) {
        console.error(`  ERROR: ${e}`)
        errors++
      }
    }
  }

  console.log()
  if (DRY_RUN) {
    console.log(`Would upload ${files.length} files. Run without --dry-run to actually upload.`)
  } else {
    console.log(`Done: ${success} uploaded, ${errors} errors`)
  }
}

main().catch(console.error)
