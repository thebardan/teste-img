export interface SyncStatusDto {
  isRunning: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  stats: {
    totalFolders: number
    matchedFolders: number
    unmatchedFolders: number
    totalImages: number
    syncedImages: number
  }
  lastError: string | null
}

export interface UnmatchedFolderDto {
  id: string
  driveId: string
  name: string
  matchScore: number | null
  suggestedProduct: {
    id: string
    name: string
    sku: string
  } | null
  imageCount: number
  createdAt: string
}
