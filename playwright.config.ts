import { defineConfig, devices } from '@playwright/test';

// Testes E2E de fumaça. ATENÇÃO: o .env.local aponta para o Supabase de produção,
// então os testes em e2e/ são somente leitura — não fazem login nem enviam
// formulários que gravam dados ou disparam e-mails/WhatsApp.
//
// Usa o servidor já em execução (npm run dev) em E2E_BASE_URL ou localhost:3000.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
