import { ref, computed, unref, type Ref } from 'vue'

export interface StickyColumnOptions {
  initialLocked?: string[]
}

export interface HeaderWithPosition extends Record<string, any> {
  key?: string
  value?: string
  fixed?: boolean
  cellClass?: string
  left?: number
}

export function useStickyColumns(
  headersInput: Ref<any[]> | (() => any[]),
  options: StickyColumnOptions = {}
) {
  const lockedColumns = ref<string[]>(options.initialLocked || [])
  const columnWidths = ref<Record<string, number>>({})

  const headers = computed(() => {
    const rawHeaders = typeof headersInput === 'function' ? headersInput() : unref(headersInput)
    // Ensure we always have an array to work with, even if input is initially undefined
    return Array.isArray(rawHeaders) ? rawHeaders : []
  })

  const columnOptions = computed(() => {
    return headers.value.map((h: any) => ({
      title: h.title,
      value: h.key ?? h.value
    }))
  })

  const stickyHeaders = computed<HeaderWithPosition[]>(() => {
    let cumulativeLeft = 0
    
    return headers.value.map((h: any) => {
      const key = h.key ?? h.value
      const isLocked = lockedColumns.value.includes(key)
      
      if (isLocked) {
        const header: HeaderWithPosition = {
          ...h,
          fixed: true,
          cellClass: 'v-data-table-column--sticky',
          left: cumulativeLeft
        }
        
        // Add width to cumulative position for next locked column
        const width = columnWidths.value[key] || 0
        if (width > 0) {
          cumulativeLeft += width
        }
        
        return header
      }
      
      return h
    })
  })

  /**
   * Update the width of a specific column
   * This is used to calculate proper left positioning for sticky columns
   */
  function setColumnWidth(key: string, width: number) {
    columnWidths.value[key] = width
  }

  /**
   * Update widths for multiple columns at once
   */
  function setColumnWidths(widths: Record<string, number>) {
    columnWidths.value = { ...widths }
  }

  return {
    lockedColumns,
    columnOptions,
    stickyHeaders,
    columnWidths,
    setColumnWidth,
    setColumnWidths
  }
}
