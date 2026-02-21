import { expect, type Page } from '@playwright/test'

/**
 * E2E Test Helpers
 *
 * Reusable utilities for Playwright E2E tests
 */

/**
 * Authentication Helper
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Perform local login
   */
  async login(username: string = 'testuser', password: string = 'testpassword') {
    await this.page.goto('/login')
    await this.page.getByLabel('Username').fill(username)
    await this.page.locator('input[type="password"]').fill(password)
    await this.page.getByRole('button', { name: /login/i }).click()
    await expect(this.page).toHaveURL('/dashboard')
  }

  /**
   * Perform external login
   */
  async externalLogin(
    username: string = 'testuser',
    password: string = 'testpassword',
    dutUsername?: string,
    dutPassword?: string,
  ) {
    await this.page.goto('/login')
    await this.page.getByRole('tab', { name: /external login/i }).click()

    // Use .first() to get the first Username/Password fields (local credentials)
    await this.page.getByLabel('Username').first().fill(username)
    await this.page.locator('input[type="password"]').first().fill(password)

    if (dutUsername) {
      await this.page.getByLabel('DUT Username').fill(dutUsername)
    }
    if (dutPassword) {
      await this.page.getByLabel('DUT Password').fill(dutPassword)
    }

    await this.page.getByRole('button', { name: /external/i }).click()
    await expect(this.page).toHaveURL('/dashboard')
  }

  /**
   * Perform logout
   */
  async logout() {
    await this.page.getByRole('button', { name: /logout/i }).click()
    await expect(this.page).toHaveURL('/login')
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.page.evaluate(() => localStorage.getItem('access_token'))
    return !!token
  }

  /**
   * Clear authentication state
   */
  async clearAuth() {
    await this.page.evaluate(() => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('dut_access_token')
      localStorage.removeItem('dut_refresh_token')
      localStorage.removeItem('user')
      localStorage.removeItem('login_type')
    })
  }
}

/**
 * Navigation Helper
 */
export class NavigationHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to a route and verify
   */
  async navigateTo(route: string, expectedText?: string | RegExp) {
    await this.page.goto(route)
    await expect(this.page).toHaveURL(route)

    if (expectedText) {
      await expect(this.page.getByText(expectedText)).toBeVisible()
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Check if on correct page
   */
  async verifyPage(route: string) {
    await expect(this.page).toHaveURL(route)
  }

  /**
   * Open navigation drawer (mobile)
   */
  async openDrawer() {
    await this.page.getByRole('button', { name: /menu/i }).click()
    await expect(this.page.locator('.v-navigation-drawer')).toBeVisible()
  }

  /**
   * Close navigation drawer (mobile)
   */
  async closeDrawer() {
    await this.page.getByRole('button', { name: /close|menu/i }).click()
    await expect(this.page.locator('.v-navigation-drawer')).not.toBeVisible()
  }
}

/**
 * Form Helper
 */
export class FormHelper {
  constructor(private page: Page) {}

  /**
   * Fill a form field by label
   */
  async fillField(label: string, value: string) {
    await this.page.getByLabel(label).fill(value)
  }

  /**
   * Fill multiple form fields
   */
  async fillForm(fields: Record<string, string>) {
    for (const [label, value] of Object.entries(fields)) {
      await this.fillField(label, value)
    }
  }

  /**
   * Submit a form
   */
  async submit(buttonText: string | RegExp = /submit/i) {
    await this.page.getByRole('button', { name: buttonText }).click()
  }

  /**
   * Wait for form submission
   */
  async waitForSubmission() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Check if form is valid
   */
  async isFormValid(): Promise<boolean> {
    const submitButton = this.page.getByRole('button', { name: /submit|login/i })
    return !(await submitButton.isDisabled())
  }

  /**
   * Get form validation error
   */
  async getValidationError(fieldLabel: string): Promise<string | null> {
    const field = this.page.getByLabel(fieldLabel)
    const errorMessage = field.locator('+ .v-messages__message')

    if (await errorMessage.isVisible()) {
      return await errorMessage.textContent()
    }
    return null
  }
}

/**
 * Alert Helper
 */
export class AlertHelper {
  constructor(private page: Page) {}

  /**
   * Check if alert is visible
   */
  async isVisible(): Promise<boolean> {
    const alert = this.page.getByRole('alert')
    return await alert.isVisible()
  }

  /**
   * Get alert message
   */
  async getMessage(): Promise<string | null> {
    const alert = this.page.getByRole('alert')
    if (await alert.isVisible()) {
      return await alert.textContent()
    }
    return null
  }

  /**
   * Close alert
   */
  async close() {
    await this.page.getByRole('button', { name: /close/i }).click()
    await expect(this.page.getByRole('alert')).not.toBeVisible()
  }

  /**
   * Wait for alert to appear
   */
  async waitForAlert() {
    await expect(this.page.getByRole('alert')).toBeVisible()
  }

  /**
   * Verify alert message
   */
  async verifyMessage(expectedText: string | RegExp) {
    await this.waitForAlert()
    await expect(this.page.getByRole('alert')).toContainText(expectedText)
  }
}

/**
 * File Upload Helper
 */
export class FileUploadHelper {
  constructor(private page: Page) {}

  /**
   * Upload a single file
   */
  async uploadFile(inputLabel: string, filePath: string) {
    const fileInput = this.page.getByLabel(inputLabel)
    await fileInput.setInputFiles(filePath)
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(inputLabel: string, filePaths: string[]) {
    const fileInput = this.page.getByLabel(inputLabel)
    await fileInput.setInputFiles(filePaths)
  }

  /**
   * Remove uploaded file
   */
  async removeFile(fileIndex: number = 0) {
    const removeButtons = this.page.getByRole('button', { name: /remove|delete/i })
    await removeButtons.nth(fileIndex).click()
  }

  /**
   * Wait for upload progress
   */
  async waitForUpload() {
    await this.page.waitForSelector('.v-progress-linear', { state: 'hidden' })
  }

  /**
   * Verify file uploaded
   */
  async verifyFileUploaded(fileName: string) {
    await expect(this.page.getByText(fileName)).toBeVisible()
  }
}

/**
 * Data Table Helper
 */
export class DataTableHelper {
  constructor(private page: Page) {}

  /**
   * Get table row count
   */
  async getRowCount(): Promise<number> {
    const rows = this.page.locator('.v-data-table tbody tr')
    return await rows.count()
  }

  /**
   * Get cell value
   */
  async getCellValue(row: number, column: number): Promise<string | null> {
    const cell = this.page.locator('.v-data-table tbody tr').nth(row).locator('td').nth(column)
    return await cell.textContent()
  }

  /**
   * Sort by column
   */
  async sortByColumn(columnName: string) {
    await this.page.getByRole('columnheader', { name: columnName }).click()
  }

  /**
   * Search in table
   */
  async search(query: string) {
    await this.page.getByPlaceholder(/search/i).fill(query)
  }

  /**
   * Click row action button
   */
  async clickRowAction(row: number, actionName: string | RegExp) {
    const actionButton = this.page
      .locator('.v-data-table tbody tr')
      .nth(row)
      .getByRole('button', { name: actionName })
    await actionButton.click()
  }
}

/**
 * Network Helper
 */
export class NetworkHelper {
  constructor(private page: Page) {}

  /**
   * Wait for specific API call
   */
  async waitForApi(urlPattern: string | RegExp) {
    await this.page.waitForResponse(urlPattern)
  }

  /**
   * Mock API response
   */
  async mockApiResponse(urlPattern: string | RegExp, response: unknown, status: number = 200) {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })
  }

  /**
   * Simulate network error
   */
  async simulateNetworkError(urlPattern: string | RegExp) {
    await this.page.route(urlPattern, (route) => route.abort('failed'))
  }

  /**
   * Set offline mode
   */
  async setOffline(offline: boolean = true) {
    await this.page.context().setOffline(offline)
  }
}

/**
 * Viewport Helper
 */
export class ViewportHelper {
  constructor(private page: Page) {}

  /**
   * Set mobile viewport
   */
  async setMobile() {
    await this.page.setViewportSize({ width: 375, height: 667 })
  }

  /**
   * Set tablet viewport
   */
  async setTablet() {
    await this.page.setViewportSize({ width: 768, height: 1024 })
  }

  /**
   * Set desktop viewport
   */
  async setDesktop() {
    await this.page.setViewportSize({ width: 1920, height: 1080 })
  }

  /**
   * Check if mobile
   */
  async isMobile(): Promise<boolean> {
    const viewport = this.page.viewportSize()
    return viewport ? viewport.width < 768 : false
  }
}

/**
 * Screenshot Helper
 */
export class ScreenshotHelper {
  constructor(private page: Page) {}

  /**
   * Take full page screenshot
   */
  async takeFullPage(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    })
  }

  /**
   * Take element screenshot
   */
  async takeElement(selector: string, name: string) {
    const element = this.page.locator(selector)
    await element.screenshot({
      path: `test-results/screenshots/${name}.png`,
    })
  }
}

/**
 * Wait Helper
 */
export class WaitHelper {
  constructor(private page: Page) {}

  /**
   * Wait for element
   */
  async waitForElement(selector: string) {
    await this.page.waitForSelector(selector)
  }

  /**
   * Wait for text
   */
  async waitForText(text: string | RegExp) {
    await expect(this.page.getByText(text)).toBeVisible()
  }

  /**
   * Wait for URL
   */
  async waitForUrl(url: string | RegExp) {
    await expect(this.page).toHaveURL(url)
  }

  /**
   * Wait for loading to finish
   */
  async waitForLoading() {
    await this.page.waitForLoadState('networkidle')
  }
}
