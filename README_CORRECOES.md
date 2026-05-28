# Correções sugeridas — Portal Tucan

Substitua os arquivos do seu projeto pelos arquivos deste pacote respeitando os mesmos caminhos.

## Arquivos para substituir/criar

1. `src/lib/constants/status.ts`
   - Novo arquivo com status compartilhados.

2. `src/app/(cliente)/cliente/page.tsx`
   - Área do cliente agora mostra apenas cronogramas visíveis.
   - Esconde `rascunho` e `arquivado`.

3. `src/app/(cliente)/cliente/cronogramas/[id]/page.tsx`
   - Bloqueia acesso direto a cronograma em `rascunho` ou `arquivado`.

4. `src/app/(cliente)/cliente/posts/[id]/page.tsx`
   - Bloqueia acesso direto a posts de campanhas em `rascunho` ou `arquivado`.

5. `src/components/auth/SetPasswordForm.tsx`
   - Corrige criação de senha quando o Supabase envia `#access_token` na URL.

6. `src/app/auth/callback/page.tsx`
   - Callback client-side para ler `code` ou `#access_token`.

7. `src/actions/invite.ts`
   - Padroniza todos os convites/reset para `/auth/callback?next=/definir-senha`.
   - Remove excesso de logs.

8. `package.json`
   - Mantém `npm run dev` com localhost e adiciona `npm run dev:lan` para teste no celular.

9. `supabase/migrations/006_client_visibility_guard.sql`
   - Opcional: reforço de segurança no banco via RLS.

## Arquivo para apagar

Apague este arquivo do projeto original:

`src/app/auth/callback/route.ts`

No PowerShell:

```powershell
del "src\app\auth\callback\route.ts"
```

## Depois de substituir

```powershell
npm run dev
```

Teste:

1. Criar cronograma em rascunho.
2. Entrar como cliente e confirmar que o rascunho não aparece.
3. Tentar abrir link direto do rascunho como cliente: deve dar 404.
4. Enviar cronograma para aprovação.
5. Confirmar que agora aparece para cliente.
6. Enviar convite para cliente em janela anônima.
7. Criar senha.

## Git

```powershell
git status
git add .
git commit -m "corrige seguranca da area do cliente e fluxo de convite"
git push origin main
```
