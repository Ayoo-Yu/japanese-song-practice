import { SONGS_STORAGE_KEY } from './song-service'
import { SAVED_LINES_STORAGE_KEY, SAVED_WORDS_STORAGE_KEY } from './collections-service'
import { LEARNING_STORAGE_KEY } from './learning-service'
import { UI_STORAGE_KEY } from '../stores/ui-store'

const APP_ID = 'japanese-song-practice'
const BACKUP_VERSION = 1

export const BACKUP_STORAGE_KEYS = [
  SONGS_STORAGE_KEY,
  SAVED_WORDS_STORAGE_KEY,
  SAVED_LINES_STORAGE_KEY,
  LEARNING_STORAGE_KEY,
  UI_STORAGE_KEY,
] as const

interface BackupFile {
  app: typeof APP_ID
  schemaVersion: typeof BACKUP_VERSION
  exportedAt: string
  data: Record<string, unknown>
}

export function createBackupJson(): string {
  const data: Record<string, unknown> = {}
  for (const key of BACKUP_STORAGE_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw
    }
  }

  const backup: BackupFile = {
    app: APP_ID,
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
  return JSON.stringify(backup, null, 2)
}

export function restoreBackupJson(json: string): { restoredKeys: number; exportedAt: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('备份文件不是有效的 JSON。')
  }

  if (!isBackupFile(parsed)) {
    throw new Error('备份文件格式或版本不受支持。')
  }

  let restoredKeys = 0
  for (const key of BACKUP_STORAGE_KEYS) {
    if (!(key in parsed.data)) continue
    localStorage.setItem(key, JSON.stringify(parsed.data[key]))
    restoredKeys++
  }
  if (restoredKeys === 0) throw new Error('备份中没有可恢复的数据。')
  return { restoredKeys, exportedAt: parsed.exportedAt }
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<BackupFile>
  return candidate.app === APP_ID &&
    candidate.schemaVersion === BACKUP_VERSION &&
    typeof candidate.exportedAt === 'string' &&
    !!candidate.data &&
    typeof candidate.data === 'object' &&
    !Array.isArray(candidate.data)
}
