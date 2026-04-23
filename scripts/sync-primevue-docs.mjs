/**
 * sync-primevue-docs.mjs
 *
 * Download a local PrimeVue docs bundle into .dev-resources/docs-primevue.
 *
 * Usage:
 *   node scripts/sync-primevue-docs.mjs
 *   node scripts/sync-primevue-docs.mjs button dialog datatable
 *   node scripts/sync-primevue-docs.mjs --dry-run
 *   node scripts/sync-primevue-docs.mjs --list
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { join, relative } from 'node:path'

const repoRoot = process.cwd()
const outputDir = join(repoRoot, '.dev-resources', 'docs-primevue')

const recommendedDocs = [
  'configuration',
  'button',
  'datatable',
  'dialog',
  'drawer',
  'tabs',
  'toast',
]

const componentAliases = new Map([
  ['config', 'configuration'],
  ['primevue', 'configuration'],
  ['button', 'button'],
  ['buttons', 'button'],
  ['column', 'datatable'],
  ['datatable', 'datatable'],
  ['dialog', 'dialog'],
  ['drawer', 'drawer'],
  ['tab', 'tabs'],
  ['tablist', 'tabs'],
  ['tabpanel', 'tabs'],
  ['tabpanels', 'tabs'],
  ['tabs', 'tabs'],
  ['toast', 'toast'],
  ['toastservice', 'toast'],
  ['usetoast', 'toast'],
])

const rawArgs = process.argv.slice(2)
const dryRun = rawArgs.includes('--dry-run')
const listOnly = rawArgs.includes('--list')
const includeIndexes = !rawArgs.includes('--no-index')

const requestedDocs = rawArgs
  .filter((arg) => !arg.startsWith('--'))
  .map((arg) => arg.trim().toLowerCase())
  .filter(Boolean)

const docsToDownload = normalizeDocs(requestedDocs)
const indexesToDownload = includeIndexes ? ['llms.txt', 'llms-full.txt'] : []

if (listOnly) {
  console.log('Recommended PrimeVue docs bundle:')
  for (const doc of recommendedDocs) {
    console.log(`  - ${doc}`)
  }

  console.log('\nKnown aliases:')
  for (const [alias, target] of componentAliases.entries()) {
    console.log(`  - ${alias} -> ${target}`)
  }

  process.exit(0)
}

mkdirSync(outputDir, { recursive: true })

console.log(
  `${dryRun ? '[DRY RUN] ' : ''}Syncing PrimeVue docs bundle to ${relative(repoRoot, outputDir) || outputDir}`,
)

for (const fileName of indexesToDownload) {
  const url = `https://primevue.org/${fileName}`
  await downloadFile(url, join(outputDir, fileName), fileName)
}

for (const doc of docsToDownload) {
  const fileName = `${doc}.md`
  const url = `https://primevue.org/${fileName}`
  await downloadFile(url, join(outputDir, fileName), fileName)
}

console.log(
  `${dryRun ? '[DRY RUN] ' : ''}Done: ${indexesToDownload.length} indexes and ${docsToDownload.length} markdown pages`,
)

function normalizeDocs(docs) {
  if (docs.length === 0) {
    return [...recommendedDocs]
  }

  const normalized = []

  for (const doc of docs) {
    const mappedDoc = componentAliases.get(doc) ?? doc
    if (!normalized.includes(mappedDoc)) {
      normalized.push(mappedDoc)
    }
  }

  return normalized
}

async function downloadFile(url, destinationPath, label) {
  console.log(`  ${label} <- ${url}`)

  if (dryRun) {
    return
  }

  let lastError = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const content = await requestText(url)
      writeFileSync(destinationPath, content, 'utf-8')
      return
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        console.warn(`    retry ${attempt}/2 after download failure`)
      }
    }
  }

  throw lastError
}

function requestText(url, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error(`Too many redirects while downloading ${url}`)
  }

  const client = url.startsWith('https:') ? https : http

  return new Promise((resolve, reject) => {
    const request = client.get(
      url,
      {
        headers: {
          Accept: 'text/plain, text/markdown;q=0.9, */*;q=0.8',
          'User-Agent': 'top-product-system-fe/local-primevue-doc-sync',
          Connection: 'close',
        },
      },
      (response) => {
        const statusCode = response.statusCode ?? 0

        if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
          response.resume()
          const nextUrl = new URL(response.headers.location, url).toString()
          resolve(requestText(nextUrl, redirectCount + 1))
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume()
          reject(new Error(`Failed to download ${url}: ${statusCode} ${response.statusMessage ?? ''}`.trim()))
          return
        }

        const chunks = []
        response.setEncoding('utf8')
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => resolve(chunks.join('')))
      },
    )

    request.setTimeout(20_000, () => {
      request.destroy(new Error(`Timed out while downloading ${url}`))
    })

    request.on('error', reject)
  })
}