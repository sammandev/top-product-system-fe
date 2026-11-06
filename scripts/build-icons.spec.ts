// @vitest-environment node
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

it('generates formatted offline icons without Git metadata or an ignore file', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'build-icons-'))
  try {
    mkdirSync(join(fixture, 'scripts'))
    mkdirSync(join(fixture, 'src', 'core'), { recursive: true })
    copyFileSync(join(root, 'scripts', 'build-icons.mjs'), join(fixture, 'scripts', 'build-icons.mjs'))
    copyFileSync(join(root, 'biome.json'), join(fixture, 'biome.json'))
    symlinkSync(
      join(root, 'node_modules'),
      join(fixture, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    writeFileSync(
      join(fixture, 'src', 'icons.ts'),
      "export const icons = ['mdi:home', 'solar:heart-bold']\n",
    )

    const result = spawnSync(process.execPath, [join(fixture, 'scripts', 'build-icons.mjs')], {
      cwd: fixture,
      encoding: 'utf8',
    })
    expect(result.error).toBeUndefined()
    expect(result.status, result.stdout + result.stderr).toBe(0)
    const generated = readFileSync(join(fixture, 'src', 'core', 'icons.generated.ts'), 'utf8')
    expect(generated).toContain("import { addCollection } from '@iconify/vue'\n")
    expect(generated).toContain("prefix: 'mdi'")
    expect(generated).toContain("prefix: 'solar'")
    expect(generated).toContain('home:')
    expect(generated).toContain("'heart-bold':")
    expect(generated).toContain('export function registerOfflineIcons(): void')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
