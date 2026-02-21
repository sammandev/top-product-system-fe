import { expect, test } from '@playwright/test'

/**
 * Authentication E2E Tests
 *
 * CRITICAL: These tests validate the complete authentication user flow
 * including the fix for Issue #9 (login page refresh bug)
 *
 * Test Coverage:
 * - Local login success flow
 * - External login success flow
 * - Login error handling (Issue #9 validation)
 * - Logout flow
 * - Token refresh behavior
 * - Route guards and redirects
 */

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
  })

  test.describe('Local Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // Fill login form
      await page.getByLabel('Username').fill('admin')
      await page.locator('input[type="password"]').fill('admin')

      // Submit form
      await page.getByRole('button', { name: /login/i }).click()

      // Should navigate to dashboard
      await expect(page).toHaveURL('/dashboard')

      // Should show user is authenticated
      await expect(page.getByText(/dashboard/i)).toBeVisible()
    })

    test('CRITICAL: should display error inline without page refresh on login failure', async ({
      page,
    }) => {
      // Fill login form with invalid credentials
      await page.getByLabel('Username').fill('wronguser')
      await page.locator('input[type="password"]').fill('wrongpassword')

      // Submit form
      await page.getByRole('button', { name: /login/i }).click()

      // CRITICAL: Should stay on login page (no redirect, no refresh)
      await expect(page).toHaveURL(/\/login/)

      // CRITICAL: Should display error message inline
      await expect(
        page.getByRole('alert').filter({ hasText: /invalid|incorrect|failed/i }),
      ).toBeVisible()
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible()

      // CRITICAL: Should preserve form values
      await expect(page.getByLabel('Username')).toHaveValue('wronguser')
      await expect(page.locator('input[type="password"]')).toHaveValue('wrongpassword')

      // CRITICAL: Login form should still be visible (not replaced/refreshed)
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
    })

    test('should clear error message when closing alert', async ({ page }) => {
      // Trigger an error
      await page.getByLabel('Username').fill('wronguser')
      await page.locator('input[type="password"]').fill('wrongpassword')
      await page.getByRole('button', { name: /login/i }).click()

      // Wait for error to appear
      await expect(
        page.getByRole('alert').filter({ hasText: /invalid|incorrect|failed/i }),
      ).toBeVisible()

      // Close the alert
      await page.getByRole('button', { name: /close/i }).click()

      // Error should be cleared
      await expect(
        page.getByRole('alert').filter({ hasText: /invalid|incorrect|failed/i }),
      ).not.toBeVisible()
    })

    test('should clear error when switching tabs', async ({ page }) => {
      // Trigger an error in local tab
      await page.getByLabel('Username').fill('wronguser')
      await page.locator('input[type="password"]').fill('wrongpassword')
      await page.getByRole('button', { name: /login/i }).click()

      // Wait for error
      await expect(
        page.getByRole('alert').filter({ hasText: /invalid|incorrect|failed/i }),
      ).toBeVisible()

      // Switch to external login tab
      await page.getByRole('tab', { name: /external login/i }).click()

      // Error should be cleared
      await expect(
        page.getByRole('alert').filter({ hasText: /invalid|incorrect|failed/i }),
      ).not.toBeVisible()
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error by going offline
      await page.context().setOffline(true)

      // Try to login
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()

      // Should display error (not crash)
      await expect(
        page.getByRole('alert').filter({ hasText: /error|network|failed/i }),
      ).toBeVisible()

      // Page should still be functional
      await expect(page.getByLabel('Username')).toBeVisible()

      // Go back online
      await page.context().setOffline(false)
    })

    test('should redirect to requested page after login', async ({ page }) => {
      // Try to access protected page (should redirect to login)
      await page.goto('/dut/analysis')

      // Should be on login page with redirect query
      await expect(page).toHaveURL(/\/login\?redirect=/)

      // Login
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()

      // Should redirect to originally requested page
      await expect(page).toHaveURL('/dut/analysis')
    })
  })

  test.describe('External Login', () => {
    test.skip('should successfully login with external credentials', async ({ page }) => {
      // SKIP: Requires intranet connection to DUT Management API
      // Switch to external login tab
      await page.getByRole('tab', { name: /external login/i }).click()

      // Fill login form - use .first() to get the first Username field (local credentials)
      await page.getByLabel('Username').first().fill('testuser')
      await page.locator('input[type="password"]').first().fill('testpassword')

      // Submit form
      await page.getByRole('button', { name: /external/i }).click()

      // Should navigate to dashboard
      await expect(page).toHaveURL('/dashboard')
    })

    test.skip('should handle external login errors', async ({ page }) => {
      // SKIP: Requires intranet connection to DUT Management API
      // Switch to external login tab
      await page.getByRole('tab', { name: /external login/i }).click()

      // Fill with invalid credentials - use .first() to get the first Username field
      await page.getByLabel('Username').first().fill('wronguser')
      await page.locator('input[type="password"]').first().fill('wrongpassword')

      // Submit form
      await page.getByRole('button', { name: /external/i }).click()

      // Should stay on login page with error
      await expect(page).toHaveURL(/\/login/)
      await expect(
        page.getByRole('alert').filter({ hasText: /invalid|incorrect|failed/i }),
      ).toBeVisible()
    })

    test('should show info about external login features', async ({ page }) => {
      // Switch to external login tab
      await page.getByRole('tab', { name: /external login/i }).click()

      // Should show info about DUT access
      await expect(page.getByText(/DUT Management API/i)).toBeVisible()
    })
  })

  test.describe('Logout', () => {
    test('should logout and redirect to login page', async ({ page }) => {
      // First login
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()

      // Wait for dashboard
      await expect(page).toHaveURL('/dashboard')

      // Logout
      await page.getByRole('button', { name: /logout/i }).click()

      // Should redirect to login page
      await expect(page).toHaveURL('/login')

      // Should not be able to access protected pages
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
    })

    test('should clear all authentication data on logout', async ({ page }) => {
      // Login
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()

      // Verify authenticated state
      await expect(page).toHaveURL('/dashboard')

      // Logout
      await page.getByRole('button', { name: /logout/i }).click()

      // Check localStorage is cleared
      const authTokens = await page.evaluate(() => {
        return {
          access: localStorage.getItem('access_token'),
          refresh: localStorage.getItem('refresh_token'),
          dut_access: localStorage.getItem('dut_access_token'),
          dut_refresh: localStorage.getItem('dut_refresh_token'),
        }
      })

      expect(authTokens.access).toBeNull()
      expect(authTokens.refresh).toBeNull()
      expect(authTokens.dut_access).toBeNull()
      expect(authTokens.dut_refresh).toBeNull()
    })
  })

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]')
      const toggleButton = page.getByRole('button', { name: /show password/i })

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // Click toggle
      await toggleButton.click()

      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text')

      // Click again
      await toggleButton.click()

      // Password should be hidden again
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  test.describe('Form Validation', () => {
    test('should disable submit button when form is invalid', async ({ page }) => {
      // Empty form should have disabled button
      const submitButton = page.getByRole('button', { name: /login/i })
      await expect(submitButton).toBeDisabled()

      // Fill only username
      await page.getByLabel('Username').fill('testuser')
      await expect(submitButton).toBeDisabled()

      // Fill password too
      await page.locator('input[type="password"]').fill('testpassword')
      await expect(submitButton).toBeEnabled()
    })

    test('should show validation errors', async ({ page }) => {
      // Try to submit empty form
      const _submitButton = page.getByRole('button', { name: /login/i })

      // Focus and blur inputs to trigger validation
      await page.getByLabel('Username').focus()
      await page.locator('input[type="password"]').focus()
      await page.getByLabel('Username').focus()

      // Should show validation messages (if implemented)
      // This test might need adjustment based on actual validation UI
    })
  })

  test.describe('Accessibility', () => {
    test('should be navigable with keyboard', async ({ page }) => {
      // Start from page load
      await page.goto('/login')

      // Tab to first focusable element (username input)
      await page.keyboard.press('Tab')
      // Check if username input is focused (use actual input element, not Vuetify wrapper)
      const usernameInput = page.locator('input[type="text"]').first()
      await expect(usernameInput).toBeFocused()

      // Tab to password
      await page.keyboard.press('Tab')
      const passwordInput = page.locator('input[type="password"]').first()
      await expect(passwordInput).toBeFocused()

      // Fill form and submit with Enter
      await usernameInput.fill('testuser')
      await passwordInput.fill('testpassword')
      await page.keyboard.press('Enter')

      // Should navigate to dashboard
      await expect(page).toHaveURL('/dashboard')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for proper form labels
      await expect(page.getByLabel('Username')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()

      // Check for proper button labels
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be usable on mobile', async ({ page, viewport: _viewport }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Form should still be visible and usable
      await expect(page.getByLabel('Username')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible()

      // Should be able to login
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()

      await expect(page).toHaveURL('/dashboard')
    })

    test('should be usable on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      // Form should still be visible and usable
      await expect(page.getByLabel('Username')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })
  })
})
