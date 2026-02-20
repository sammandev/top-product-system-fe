/**
 * fix-catch-any.mjs
 *
 * Replaces `catch (err: any)` with `catch (err: unknown)` and updates error access patterns.
 * Adds import for shared error utilities when needed.
 *
 * Usage: node scripts/fix-catch-any.mjs [--dry-run]
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const DRY_RUN = process.argv.includes('--dry-run')
const srcDir = join(process.cwd(), 'src')

function findFiles(dir, extensions) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results.push(...findFiles(fullPath, extensions))
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')

  // Only process files with catch (xxx: any)
  if (!/catch\s*\(\w+:\s*any\)/.test(content)) return null

  let newContent = content
  const changes = []

  // Step 1: Replace catch (err: any) -> catch (err: unknown)
  newContent = newContent.replace(/catch\s*\((\w+):\s*any\)/g, (_match, varName) => {
    changes.push(varName)
    return `catch (${varName}: unknown)`
  })

  if (changes.length === 0) return null

  // Step 2: Track which helpers we need
  let needsGetErrorMessage = false
  let needsGetApiErrorDetail = false
  let needsGetErrorStatus = false

  // Find all catch variable names
  const catchVarNames = new Set()
  let m
  const catchVarPattern = /catch\s*\((\w+):\s*unknown\)/g
  while ((m = catchVarPattern.exec(newContent)) !== null) {
    catchVarNames.add(m[1])
  }

  for (const varName of catchVarNames) {
    const esc = varName.replace(/\$/g, '\\$')

    // Pattern: varName.response?.data?.detail || 'fallback'
    const detailFallbackRe = new RegExp(
      esc +
        '\\.response\\?\\.data\\?\\.detail\\s*\\|\\|\\s*(' +
        "'[^']*'" +
        '|"[^"]*"' +
        '|`[^`]*`' +
        ')',
      'g',
    )
    newContent = newContent.replace(detailFallbackRe, (_m, fallback) => {
      needsGetApiErrorDetail = true
      return `getApiErrorDetail(${varName}, ${fallback})`
    })

    // Pattern: varName.response?.data?.detail (standalone, not already replaced)
    const detailRe = new RegExp(`${esc}\\.response\\?\\.data\\?\\.detail`, 'g')
    if (detailRe.test(newContent)) {
      newContent = newContent.replace(
        new RegExp(`${esc}\\.response\\?\\.data\\?\\.detail`, 'g'),
        `getApiErrorDetail(${varName})`,
      )
      needsGetApiErrorDetail = true
    }

    // Pattern: varName.response?.status
    const statusRe = new RegExp(`${esc}\\.response\\?\\.status`, 'g')
    if (statusRe.test(newContent)) {
      newContent = newContent.replace(
        new RegExp(`${esc}\\.response\\?\\.status`, 'g'),
        `getErrorStatus(${varName})`,
      )
      needsGetErrorStatus = true
    }

    // Pattern: varName.message || 'fallback'
    const msgFallbackRe = new RegExp(
      `${esc}\\.message\\s*\\|\\|\\s*('[^']*'|"[^"]*"|\`[^\`]*\`)`,
      'g',
    )
    newContent = newContent.replace(msgFallbackRe, (_m, fallback) => {
      needsGetErrorMessage = true
      return `getErrorMessage(${varName}) || ${fallback}`
    })

    // Pattern: standalone varName.message (not followed by ||)
    const standaloneMsg = new RegExp(`(?<![\\w.])${esc}\\.message(?![\\w])`, 'g')
    if (standaloneMsg.test(newContent)) {
      newContent = newContent.replace(
        new RegExp(`(?<![\\w.])${esc}\\.message(?![\\w])`, 'g'),
        `getErrorMessage(${varName})`,
      )
      needsGetErrorMessage = true
    }
  }

  // Step 3: Add import if needed
  const neededImports = []
  if (needsGetErrorMessage) neededImports.push('getErrorMessage')
  if (needsGetApiErrorDetail) neededImports.push('getApiErrorDetail')
  if (needsGetErrorStatus) neededImports.push('getErrorStatus')

  if (neededImports.length > 0) {
    const existingImport = newContent.match(
      /import\s*\{([^}]*)\}\s*from\s*['"]@\/shared\/utils(?:\/error)?['"]/,
    )

    if (existingImport) {
      const existingNames = existingImport[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const missing = neededImports.filter((name) => !existingNames.includes(name))
      if (missing.length > 0) {
        const allNames = [...existingNames, ...missing].sort().join(', ')
        newContent = newContent.replace(
          existingImport[0],
          `import { ${allNames} } from '@/shared/utils'`,
        )
      }
    } else {
      const importLine = `import { ${neededImports.sort().join(', ')} } from '@/shared/utils'`

      if (filePath.endsWith('.vue')) {
        const scriptStart = newContent.match(/<script\s+setup[^>]*>\n/)
        if (scriptStart) {
          const pos = scriptStart.index + scriptStart[0].length
          const rest = newContent.slice(pos)
          const imports = [...rest.matchAll(/^import\s+.+$/gm)]
          if (imports.length > 0) {
            const last = imports[imports.length - 1]
            const insertAt = pos + last.index + last[0].length
            newContent = `${newContent.slice(0, insertAt)}\n${importLine}${newContent.slice(insertAt)}`
          } else {
            newContent = `${newContent.slice(0, pos) + importLine}\n${newContent.slice(pos)}`
          }
        }
      } else {
        const imports = [...newContent.matchAll(/^import\s+.+$/gm)]
        if (imports.length > 0) {
          const last = imports[imports.length - 1]
          const insertAt = last.index + last[0].length
          newContent = `${newContent.slice(0, insertAt)}\n${importLine}${newContent.slice(insertAt)}`
        } else {
          newContent = `${importLine}\n${newContent}`
        }
      }
    }
  }

  if (newContent === content) return null

  if (!DRY_RUN) {
    writeFileSync(filePath, newContent, 'utf-8')
  }

  return {
    catchBlocks: changes.length,
    needsImport: neededImports,
  }
}

// Main
console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Fixing catch(err: any) + error access patterns...`)
const files = findFiles(srcDir, ['.ts', '.vue'])

let totalFiles = 0
let totalCatchBlocks = 0

for (const file of files) {
  const result = processFile(file)
  if (result) {
    totalFiles++
    totalCatchBlocks += result.catchBlocks
    const relPath = relative(process.cwd(), file)
    const imports =
      result.needsImport.length > 0 ? ` [+import: ${result.needsImport.join(', ')}]` : ''
    console.log(`  ${relPath}: ${result.catchBlocks} catch block(s)${imports}`)
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}Done: ${totalFiles} files, ${totalCatchBlocks} catch blocks updated`,
)
