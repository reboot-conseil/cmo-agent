#!/usr/bin/env node
/**
 * migrate-to-blob.mjs
 *
 * Uploads all local content files to Vercel Blob for a given userId.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx USER_ID=user_xxx node scripts/migrate-to-blob.mjs
 *
 * Options:
 *   --dry-run   List files without uploading
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { put } from '@vercel/blob'

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const USER_ID = process.env.USER_ID
const DRY_RUN = process.argv.includes('--dry-run')

if (!BLOB_TOKEN) {
  console.error('❌  BLOB_READ_WRITE_TOKEN manquant')
  console.error('   Récupère-le sur : Vercel dashboard → projet → Settings → Environment Variables')
  process.exit(1)
}
if (!USER_ID) {
  console.error('❌  USER_ID manquant')
  console.error('   Récupère-le sur l\'app déployée : ouvre /api/me après connexion')
  process.exit(1)
}

// CMO_BASE = racine du monorepo (parent de dashboard/)
const CMO_BASE = new URL('../..', import.meta.url).pathname.replace(/\/$/, '')

function walkDir(dir) {
  if (!existsSync(dir)) return []
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full))
    else files.push(full)
  }
  return files
}

// Fichiers à migrer
const filesToMigrate = []

// 1. Tout le dossier content/
const contentDir = join(CMO_BASE, 'content')
for (const file of walkDir(contentDir)) {
  const relPath = relative(CMO_BASE, file) // ex: "content/ideas/foo.md"
  filesToMigrate.push({ localPath: file, blobKey: `${USER_ID}/${relPath}` })
}

// 2. CLAUDE.md → identity.md
const claudeMd = join(CMO_BASE, 'CLAUDE.md')
if (existsSync(claudeMd)) {
  filesToMigrate.push({ localPath: claudeMd, blobKey: `${USER_ID}/identity.md` })
}

console.log(`\n📦  ${filesToMigrate.length} fichiers à migrer vers Vercel Blob`)
console.log(`   userId : ${USER_ID}`)
console.log(`   CMO_BASE : ${CMO_BASE}`)
if (DRY_RUN) console.log('   Mode : DRY RUN (aucun upload)\n')
else console.log()

let ok = 0
let errors = 0

for (const { localPath, blobKey } of filesToMigrate) {
  if (DRY_RUN) {
    console.log(`  [dry] ${blobKey}`)
    ok++
    continue
  }

  try {
    const content = readFileSync(localPath, 'utf-8')
    await put(blobKey, content, {
      access: 'private',
      contentType: 'text/markdown; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: BLOB_TOKEN,
    })
    console.log(`  ✅  ${blobKey}`)
    ok++
  } catch (err) {
    console.error(`  ❌  ${blobKey}  →  ${err.message}`)
    errors++
  }
}

console.log(`\n─────────────────────────────────`)
if (DRY_RUN) {
  console.log(`✅  Dry run terminé — ${ok} fichiers listés`)
} else {
  console.log(`✅  ${ok} fichiers uploadés`)
  if (errors > 0) console.log(`❌  ${errors} erreurs`)
}
console.log()
