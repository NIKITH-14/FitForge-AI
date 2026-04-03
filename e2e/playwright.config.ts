import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run serially, makes mocking DB state easier
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Optional: automatically start backend and frontend servers
  // webServer: [
  //   {
  //     command: 'npm run dev --prefix ../backend',
  //     url: 'http://localhost:5000',
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'npm run dev --prefix ../frontend',
  //     url: 'http://localhost:3000',
  //     reuseExistingServer: !process.env.CI,
  //   }
  // ]
});
