/**
 * fix-vue-underscores.mjs
 *
 * Removes incorrect `_` prefixes from top-level declarations in Vue <script setup> blocks.
 *
 * Problem: Biome can't see Vue template references, so it falsely reports template-used
 * variables as "unused". Previous fixes added `_` prefixes which BROKE template bindings
 * (template says `emit(...)` but script defines `_emit`).
 *
 * This script:
 * 1. Finds all Vue files with `_`-prefixed top-level declarations in <script setup>
 * 2. Renames them back (removes `_`) so templates work correctly
 * 3. Updates ALL references to the old name within the script block
 *
 * Does NOT touch:
 * - Function parameters (e.g., `_event`, `_unused`) which legitimately signal unused params
 * - Variables inside nested scopes (only top-level script setup declarations)
 *
 * Usage: node scripts/fix-vue-underscores.mjs [--dry-run]
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

function extractScriptSetup(content) {
  // Match <script setup lang="ts"> ... </script>
  const match = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return null
  return {
    full: match[0],
    body: match[1],
    startIndex: match.index,
    endIndex: match.index + match[0].length,
  }
}

function findTopLevelUnderscoreDeclarations(scriptBody) {
  const declarations = []

  // Match patterns at top level (not indented by function bodies)
  // const _varName = ...
  const constPattern = /^(const|let)\s+(_[a-zA-Z]\w*)\s*=/gm
  let m
  while ((m = constPattern.exec(scriptBody)) !== null) {
    const name = m[2]
    // Skip if it looks like a destructuring target inside a function
    // Only process truly top-level declarations (check indentation)
    const lineStart = scriptBody.lastIndexOf('\n', m.index) + 1
    const indent = m.index - lineStart
    // Top-level in <script setup> is 0 indent (no nesting)
    if (indent === 0) {
      declarations.push(name)
    }
  }

  // function _funcName(...) or async function _funcName(...)
  const funcPattern = /^(async\s+)?function\s+(_[a-zA-Z]\w*)\s*\(/gm
  while ((m = funcPattern.exec(scriptBody)) !== null) {
    const name = m[2]
    const lineStart = scriptBody.lastIndexOf('\n', m.index) + 1
    const indent = m.index - lineStart
    if (indent === 0) {
      declarations.push(name)
    }
  }

  return [...new Set(declarations)]
}

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const scriptSetup = extractScriptSetup(content)
  if (!scriptSetup) return null

  const declarations = findTopLevelUnderscoreDeclarations(scriptSetup.body)
  if (declarations.length === 0) return null

  let newContent = content
  const renames = []

  for (const oldName of declarations) {
    const newName = oldName.slice(1) // Remove leading _

    // Check we won't cause a collision with an existing declaration
    const existingPattern = new RegExp(`\\b(?:const|let|var|function)\\s+${newName}\\b`)
    if (existingPattern.test(scriptSetup.body)) {
      // Name collision - skip this one
      continue
    }

    // Replace all occurrences of _name with name in the ENTIRE file
    // (covers both script references and any template references that might use _name)
    // Use word boundary to avoid partial matches
    const replacePattern = new RegExp(`\\b${oldName.replace('$', '\\$')}\\b`, 'g')
    const beforeCount = (newContent.match(replacePattern) || []).length
    if (beforeCount > 0) {
      newContent = newContent.replace(replacePattern, newName)
      renames.push({ from: oldName, to: newName, count: beforeCount })
    }
  }

  if (renames.length === 0) return null

  if (!DRY_RUN) {
    writeFileSync(filePath, newContent, 'utf-8')
  }

  return renames
}

// Main
console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Scanning Vue files in src/...`)
const vueFiles = findVueFiles(srcDir)
console.log(`Found ${vueFiles.length} Vue files`)

let totalFiles = 0
let totalRenames = 0

for (const file of vueFiles) {
  const renames = processFile(file)
  if (renames && renames.length > 0) {
    totalFiles++
    const relPath = relative(process.cwd(), file)
    console.log(`\n${relPath}:`)
    for (const r of renames) {
      console.log(`  ${r.from} → ${r.to} (${r.count} occurrences)`)
      totalRenames += r.count
    }
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}Done: ${totalFiles} files, ${totalRenames} total replacements`,
)
