/**
 * fix-multiline-mustache.mjs
 *
 * Collapses multi-line Vue mustache interpolations {{ ... \n ... }} onto single lines.
 * This works around a Biome parser bug (assertion failed: start.raw <= end.raw)
 * that crashes when mustache expressions span multiple lines in Vue SFC templates.
 *
 * Usage: node scripts/fix-multiline-mustache.mjs [--dry-run]
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const DRY_RUN = process.argv.includes('--dry-run')
const srcDir = join(process.cwd(), 'src')

function findVueFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results.push(...findVueFiles(fullPath))
    } else if (entry.endsWith('.vue')) {
      results.push(fullPath)
    }
  }
  return results
}

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')

  // Only process the template section (before <script)
  const scriptIndex = content.indexOf('<script')
  if (scriptIndex === -1) return null

  const template = content.slice(0, scriptIndex)
  const rest = content.slice(scriptIndex)

  // Find multi-line mustache patterns: {{ ... \n ... }}
  const pattern = /\{\{([^}]*\n[^}]*)\}\}/g
  let fixCount = 0

  const fixedTemplate = template.replace(pattern, (_match, inner) => {
    fixCount++
    // Collapse whitespace: replace newlines and surrounding spaces with a single space
    const collapsed = inner.replace(/\s*\n\s*/g, ' ').trim()
    return `{{ ${collapsed} }}`
  })

  if (fixCount === 0) return null

  const newContent = fixedTemplate + rest

  if (!DRY_RUN) {
    writeFileSync(filePath, newContent, 'utf-8')
  }

  return fixCount
}

// Main
console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Fixing multi-line mustache interpolations...`)
const vueFiles = findVueFiles(srcDir)

let totalFiles = 0
let totalFixes = 0

for (const file of vueFiles) {
  const fixes = processFile(file)
  if (fixes) {
    totalFiles++
    totalFixes += fixes
    console.log(`  ${relative(process.cwd(), file)}: ${fixes} mustache(s) collapsed`)
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}Done: ${totalFiles} files, ${totalFixes} multi-line mustaches fixed`,
)
