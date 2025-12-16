import { test, expect } from '@playwright/test'

/**
 * Navigation & Routing E2E Tests
 * 
 * Test Coverage:
 * - Route guards and authentication checks
 * - Navigation menu interactions
 * - Protected route redirects
 * - Breadcrumb navigation
 * - Dashboard navigation
 */

test.describe('Navigation & Routing', () => {
  test.describe('Route Guards', () => {
    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = [
        '/dashboard',
        '/parsing',
        '/compare',
        '/dut/top-products',
        '/dut/analysis'
      ]
      
      for (const route of protectedRoutes) {
        await page.goto(route)
        
        // Should redirect to login page with redirect query
        // Note: URL uses unencoded '/' in redirect parameter
        await expect(page).toHaveURL(new RegExp(`/login.*redirect=${route.replace(/\//g, '\\/')}`))
      }
    })

    test('should allow access to protected routes when authenticated', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      
      // Wait for navigation
      await expect(page).toHaveURL('/dashboard')
      
      // Should be able to access protected routes
      await page.goto('/parsing')
      await expect(page).toHaveURL('/parsing')
      
      await page.goto('/compare')
      await expect(page).toHaveURL('/compare')
      
      await page.goto('/dut/top-products')
      await expect(page).toHaveURL('/dut/top-products')
      
      await page.goto('/dut/analysis')
      await expect(page).toHaveURL('/dut/analysis')
    })

    test('should redirect authenticated users from login to dashboard', async ({ page }) => {
      // Login
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      
      // Wait for dashboard
      await expect(page).toHaveURL('/dashboard')
      
      // Try to access login page
      await page.goto('/login')
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
    })

    test('should handle 404 for non-existent routes', async ({ page }) => {
      await page.goto('/this-route-does-not-exist')
      
      // Should show 404 page content
      await expect(page.getByText(/404/i)).toBeVisible()
      await expect(page.getByText(/page not found/i)).toBeVisible()
      
      // Should have button to go to dashboard
      await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible()
    })
  })

  test.describe('Navigation Menu', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      await expect(page).toHaveURL('/dashboard')
    })

    test('should navigate to File Parsing from menu', async ({ page }) => {
      // Click on File Parsing menu item in navigation drawer (not dashboard card)
      await page.locator('nav').getByRole('link', { name: /upload|parsing/i }).first().click()
      
      // Should navigate to parsing page
      await expect(page).toHaveURL('/parsing')
      
      // Should show parsing page content (heading is unique)
      await expect(page.getByRole('heading', { name: /file upload.*parsing/i })).toBeVisible()
    })

    test('should navigate to File Compare from menu', async ({ page }) => {
      // Click on File Compare menu item in navigation drawer (not dashboard card)
      await page.locator('nav').getByRole('link', { name: /compare/i }).click()
      
      // Should navigate to compare page
      await expect(page).toHaveURL('/compare')
      
      // Should show compare page content
      await expect(page.getByRole('heading', { name: /compare/i })).toBeVisible()
    })

    test('should navigate to Top Products from menu', async ({ page }) => {
      // Click on Top Products menu item
      await page.getByRole('link', { name: /top products/i }).click()
      
      // Should navigate to top products page
      await expect(page).toHaveURL('/dut/top-products')
      
      // Should show top products page content
      await expect(page.getByText(/top products/i)).toBeVisible()
    })

    test('should navigate to DUT Analysis from menu', async ({ page }) => {
      // Click on DUT Analysis menu item
      await page.getByRole('link', { name: /dut analysis|analysis/i }).click()
      
      // Should navigate to analysis page
      await expect(page).toHaveURL('/dut/analysis')
      
      // Should show analysis page content
      await expect(page.getByText(/dut analysis|analysis/i)).toBeVisible()
    })

    test('should highlight active menu item', async ({ page }) => {
      // Navigate to parsing page
      await page.goto('/parsing')
      
      // Parsing menu item should be active
      const parsingLink = page.getByRole('link', { name: /file parsing|parse/i })
      await expect(parsingLink).toHaveClass(/active|selected/)
    })

    test('should toggle drawer on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Drawer should be hidden on mobile
      const drawer = page.locator('.v-navigation-drawer')
      
      // Open drawer
      await page.getByRole('button', { name: /menu/i }).click()
      await expect(drawer).toBeVisible()
      
      // Close drawer
      await page.getByRole('button', { name: /close|menu/i }).click()
      await expect(drawer).not.toBeVisible()
    })
  })

  test.describe('Dashboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      await expect(page).toHaveURL('/dashboard')
    })

    test('should show dashboard welcome message', async ({ page }) => {
      // Should show welcome or dashboard content
      await expect(page.getByText(/dashboard|welcome/i)).toBeVisible()
    })

    test('should show user information', async ({ page }) => {
      // Should display logged-in user info (if implemented)
      // Adjust based on your dashboard implementation
      await expect(page.getByText(/testuser/i)).toBeVisible()
    })

    test('should have working navigation cards/links', async ({ page }) => {
      // If dashboard has quick access cards, test them
      // This will depend on your dashboard implementation
      
      // Example: Click on File Parsing card
      const parsingCard = page.locator('[data-testid="parsing-card"]')
      if (await parsingCard.isVisible()) {
        await parsingCard.click()
        await expect(page).toHaveURL('/parsing')
      }
    })

    test('should show logout button', async ({ page }) => {
      // Logout button should be visible
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
    })
  })

  test.describe('Browser Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      await expect(page).toHaveURL('/dashboard')
    })

    test('should support browser back button', async ({ page }) => {
      // Navigate to parsing
      await page.goto('/parsing')
      await expect(page).toHaveURL('/parsing')
      
      // Navigate to compare
      await page.goto('/compare')
      await expect(page).toHaveURL('/compare')
      
      // Go back
      await page.goBack()
      await expect(page).toHaveURL('/parsing')
      
      // Go back again
      await page.goBack()
      await expect(page).toHaveURL('/dashboard')
    })

    test('should support browser forward button', async ({ page }) => {
      // Navigate forward through pages
      await page.goto('/parsing')
      await page.goto('/compare')
      
      // Go back twice
      await page.goBack()
      await page.goBack()
      await expect(page).toHaveURL('/dashboard')
      
      // Go forward
      await page.goForward()
      await expect(page).toHaveURL('/parsing')
      
      // Go forward again
      await page.goForward()
      await expect(page).toHaveURL('/compare')
    })

    test('should maintain authentication state on page reload', async ({ page }) => {
      // Should be on dashboard
      await expect(page).toHaveURL('/dashboard')
      
      // Reload page
      await page.reload()
      
      // Should still be on dashboard (not redirected to login)
      await expect(page).toHaveURL('/dashboard')
      
      // Navigate to another protected route
      await page.goto('/parsing')
      await expect(page).toHaveURL('/parsing')
      
      // Reload again
      await page.reload()
      
      // Should still be on parsing page
      await expect(page).toHaveURL('/parsing')
    })
  })

  test.describe('Deep Linking', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      await expect(page).toHaveURL('/dashboard')
    })

    test('should support direct navigation to nested routes', async ({ page }) => {
      // Navigate directly to nested route
      await page.goto('/dut/top-products')
      await expect(page).toHaveURL('/dut/top-products')
      
      // Page should load correctly
      await expect(page.getByText(/top products/i)).toBeVisible()
    })

    test('should preserve query parameters in URLs', async ({ page }) => {
      // Navigate with query parameters
      await page.goto('/parsing?file=test.csv')
      
      // Should preserve query parameters
      await expect(page).toHaveURL(/\?file=test\.csv/)
    })

    test('should handle hash fragments in URLs', async ({ page }) => {
      // Navigate with hash fragment
      await page.goto('/dashboard#section')
      
      // Should preserve hash
      await expect(page).toHaveURL(/#section/)
    })
  })

  test.describe('Navigation Performance', () => {
    test('should navigate between pages quickly', async ({ page }) => {
      // Login
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      await expect(page).toHaveURL('/dashboard')
      
      // Measure navigation time
      const startTime = Date.now()
      await page.goto('/parsing')
      const navigationTime = Date.now() - startTime
      
      // Navigation should be fast (under 2 seconds)
      expect(navigationTime).toBeLessThan(2000)
    })

    test('should not show loading flicker on instant navigation', async ({ page }) => {
      // Login
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      await expect(page).toHaveURL('/dashboard')
      
      // Navigate between pages - should be smooth
      await page.goto('/parsing')
      await page.goto('/compare')
      await page.goto('/dashboard')
      
      // No errors should occur
      page.on('pageerror', error => {
        throw error
      })
    })
  })

  test.describe('Navigation Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByLabel('Username').fill('testuser')
      await page.locator('input[type="password"]').fill('testpassword')
      await page.getByRole('button', { name: /login/i }).click()
      await expect(page).toHaveURL('/dashboard')
    })

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through navigation elements
      await page.keyboard.press('Tab')
      
      // Should be able to activate links with Enter
      const firstLink = page.getByRole('link').first()
      await firstLink.focus()
      await page.keyboard.press('Enter')
      
      // Should navigate
      const url = page.url()
      expect(url).not.toBe('/dashboard')
    })

    test('should have proper focus indicators', async ({ page }) => {
      // Tab to navigation links
      await page.keyboard.press('Tab')
      
      // Focused element should have visible focus indicator
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
      
      // Should have focus styling (outline, border, etc.)
      const focusStyle = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outline
      )
      expect(focusStyle).not.toBe('none')
    })

    test('should announce page changes to screen readers', async ({ page }) => {
      // Navigate to different page
      await page.goto('/parsing')
      
      // Page should have proper title and heading
      await expect(page).toHaveTitle(/parsing/i)
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })
  })
})
