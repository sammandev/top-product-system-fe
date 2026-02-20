/**
 * Pagination Composable
 *
 * Manages pagination state for data tables and lists
 */

import { computed, ref } from 'vue'

export interface PaginationOptions {
  initialPage?: number
  initialPerPage?: number
  pageSizeOptions?: number[]
}

/**
 * Pagination composable
 *
 * @example
 * ```ts
 * const { page, perPage, totalItems, totalPages, paginatedItems, setTotalItems } = usePagination({
 *   initialPage: 1,
 *   initialPerPage: 25
 * })
 *
 * // Set total after fetching data
 * setTotalItems(100)
 *
 * // Use in v-data-table
 * <v-data-table
 *   :items="paginatedItems"
 *   :page="page"
 *   :items-per-page="perPage"
 *   @update:page="page = $event"
 *   @update:items-per-page="perPage = $event"
 * />
 * ```
 */
export function usePagination<T>(items: T[] | (() => T[]), options: PaginationOptions = {}) {
  const page = ref(options.initialPage || 1)
  const perPage = ref(options.initialPerPage || 25)
  const totalItems = ref(0)
  const pageSizeOptions = options.pageSizeOptions || [10, 25, 50, 100]

  const itemsArray = computed(() => {
    return typeof items === 'function' ? items() : items
  })

  const totalPages = computed(() => {
    return Math.ceil(totalItems.value / perPage.value)
  })

  const startIndex = computed(() => {
    return (page.value - 1) * perPage.value
  })

  const endIndex = computed(() => {
    return Math.min(startIndex.value + perPage.value, totalItems.value)
  })

  const paginatedItems = computed(() => {
    const start = startIndex.value
    const end = start + perPage.value
    return itemsArray.value.slice(start, end)
  })

  function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
    }
  }

  function nextPage() {
    if (page.value < totalPages.value) {
      page.value++
    }
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--
    }
  }

  function setPerPage(newPerPage: number) {
    perPage.value = newPerPage
    page.value = 1 // Reset to first page
  }

  function setTotalItems(total: number) {
    totalItems.value = total
  }

  function reset() {
    page.value = options.initialPage || 1
    perPage.value = options.initialPerPage || 25
    totalItems.value = 0
  }

  return {
    page,
    perPage,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    pageSizeOptions,
    setPage,
    nextPage,
    prevPage,
    setPerPage,
    setTotalItems,
    reset,
  }
}
