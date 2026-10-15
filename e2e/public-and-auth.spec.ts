import { test, expect, type Page } from '@playwright/test';

// Somente leitura: ver aviso em playwright.config.ts.

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('rotas protegidas sem sessão', () => {
  for (const path of ['/admin', '/admin/clientes', '/admin/cronogramas', '/admin/configuracoes', '/cliente', '/cliente/historico']) {
    test(`${path} redireciona para /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });
  }

  test('rota inexistente não vaza para fora do login', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('login', () => {
  test('renderiza campos rotulados e navega por teclado', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/login');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await page.getByLabel('E-mail').focus();
    await page.keyboard.press('Tab');
    // próximo foco é o link "Esqueci a senha" e depois a senha
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Senha')).toBeFocused();
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });

  test('sem JavaScript o formulário faz POST (nunca GET com senha na URL)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/login');
    const form = page.locator('form').first();
    await expect(form).toHaveAttribute('method', /post/i);
    await expect(form).not.toHaveAttribute('action', '/api/auth/callback');
    await context.close();
  });

  test('link "Esqueci a senha" abre a recuperação sem login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Esqueci a senha' }).click();
    await expect(page).toHaveURL(/\/recuperar-senha$/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('mostra mensagem de erro vinda da URL', async ({ page }) => {
    await page.goto('/login?error=Link%20inv%C3%A1lido');
    await expect(page.getByText('Link inválido')).toBeVisible();
  });
});

test.describe('convite / redefinição de senha', () => {
  test('/auth/confirm com token inválido volta ao login com aviso', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=invalido&type=invite');
    await expect(page).toHaveURL(/\/login\?error=/);
    await expect(page.getByText(/Link inválido ou expirado/)).toBeVisible();
  });

  test('/auth/callback não aceita next externo', async ({ request }) => {
    const res = await request.get('/auth/callback?next=https://evil.example', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()['location']).not.toContain('evil.example');
  });

  test('/definir-senha sem sessão oferece novo link', async ({ page }) => {
    await page.goto('/definir-senha');
    await expect(page.getByRole('button', { name: 'Solicitar novo link' })).toBeVisible({ timeout: 15_000 });
  });

  test('APIs usadas por /definir-senha respondem sem sessão', async ({ request }) => {
    const session = await request.get('/api/auth/session', { maxRedirects: 0 });
    expect(session.status()).toBe(200);
    expect(await session.json()).toEqual({ hasSession: false });

    // corpo sem e-mail: valida sem disparar nenhum envio
    const resend = await request.post('/api/auth/resend', { data: {}, maxRedirects: 0 });
    expect(resend.status()).toBe(400);
  });
});

test.describe('links públicos de aprovação', () => {
  for (const token of ['token-inexistente', '%25', '_', 'A%25', '%25%25']) {
    test(`/acesso/${token} (inválido/curinga) responde 404`, async ({ request }) => {
      const res = await request.get(`/acesso/${token}`, { maxRedirects: 0 });
      expect(res.status()).toBe(404);
    });
  }

  test('/acesso/planejamento com token inválido responde 404', async ({ request }) => {
    const res = await request.get('/acesso/planejamento/token-inexistente', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test('post público com token inválido mostra erro amigável', async ({ page }) => {
    await page.goto('/acesso/token-inexistente/posts/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText('Não foi possível encontrar este post')).toBeVisible();
  });

  test('página de colar token é pública', async ({ page }) => {
    await page.goto('/acesso');
    await expect(page).toHaveURL(/\/acesso$/);
    await expectNoHorizontalScroll(page);
  });
});

test.describe('outros endpoints públicos', () => {
  test('imagem de preview (OG) acessível sem sessão', async ({ request }) => {
    const res = await request.get('/api/og', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('sync do Google exige CRON_SECRET', async ({ request }) => {
    const res = await request.get('/api/google/sync', { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
