/**
 * Fix missing error utility imports in Vue/TS files.
 * Adds `import { getErrorMessage, getApiErrorDetail, getErrorStatus } from '@/shared/utils'`
 * only for functions actually used in each file.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')

const filesToFix = [
  { path: 'src/features/admin/views/MenuAccessView.vue', needs: ['getApiErrorDetail'] },
  { path: 'src/features/admin/views/RBACManagementView.vue', needs: ['getApiErrorDetail', 'getErrorMessage'] },
  { path: 'src/features/admin/views/SystemCleanupView.vue', needs: ['getErrorStatus', 'getApiErrorDetail', 'getErrorMessage'] },
  { path: 'src/features/admin/views/UserManagementView.vue', needs: ['getApiErrorDetail', 'getErrorStatus'] },
  { path: 'src/features/comparison/views/DvtMc2CompareView.vue', needs: ['getApiErrorDetail', 'getErrorMessage'] },
  { path: 'src/features/dut/components/InternalDataContent.vue', needs: ['getErrorStatus'] },
  { path: 'src/features/dut/components/SiteModelStationSelector.vue', needs: ['getErrorMessage'] },
  { path: 'src/features/dut/components/TopProductIplasIsnContent.vue', needs: ['getErrorMessage'] },
  { path: 'src/features/dut/components/TopProductIplasStationContent.vue', needs: ['getErrorMessage'] },
  { path: 'src/features/dut/components/TopProductsByISNTab.vue', needs: ['getApiErrorDetail', 'getErrorMessage'] },
  { path: 'src/features/dut/views/TestLogDownloadView.vue', needs: ['getErrorStatus'] },
  { path: 'src/features/parsing/views/ParseDownloadView.vue', needs: ['getApiErrorDetail', 'getErrorMessage'] },
  { path: 'src/features/top-products/views/TopProductDatabaseView.vue', needs: ['getApiErrorDetail'] },
]

let totalFixed = 0

for (const { path: relPath, needs } of filesToFix) {
  const absPath = resolve(ROOT, relPath)
  let content = readFileSync(absPath, 'utf8')

  // Check if import already exists
  if (content.includes("from '@/shared/utils'") || content.includes('from "@/shared/utils"')) {
    console.log(`SKIP ${relPath} — already has @/shared/utils import`)
    continue
  }

  const importLine = `import { ${needs.join(', ')} } from '@/shared/utils'`

  // For Vue files, insert after <script setup lang="ts">
  if (relPath.endsWith('.vue')) {
    const scriptSetupMatch = content.match(/<script\s+setup\s+lang="ts"\s*>/)
    if (!scriptSetupMatch) {
      console.log(`SKIP ${relPath} — no <script setup lang="ts"> found`)
      continue
    }
    const insertPos = content.indexOf(scriptSetupMatch[0]) + scriptSetupMatch[0].length
    content = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos)
  } else {
    // For TS files, insert at the top
    content = importLine + '\n' + content
  }

  writeFileSync(absPath, content, 'utf8')
  console.log(`FIXED ${relPath} — added: ${importLine}`)
  totalFixed++
}

console.log(`\nDone. Fixed ${totalFixed} files.`)
