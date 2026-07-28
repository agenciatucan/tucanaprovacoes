# WhatsApp — Evolution API (runbook)

Este documento registra como o envio de WhatsApp do Portal Tucan está configurado hoje, o histórico de
tentativas até chegar aqui, e o passo a passo para reconectar ou recriar o servidor do zero se um dia
for necessário. Nenhum segredo real (chaves, senhas) fica neste arquivo — só onde encontrá-los.

## Como funciona no código

- `src/lib/zapi.ts` — função `sendWhatsApp(phone, message)`, faz a chamada HTTP para a Evolution API
- `src/lib/whatsapp-notifications.ts` — monta as 6 mensagens de notificação (planejamento pronto, cronograma
  enviado, aprovação confirmada, cronograma atualizado, lembrete de pendência, ajuste solicitado) e chama `sendWhatsApp`
- Se as variáveis de ambiente não estiverem configuradas, `sendWhatsApp` só loga o erro e retorna — nunca
  quebra o restante do app

## Infraestrutura atual

| Item | Valor |
|---|---|
| Provedor | Google Cloud (Always Free) |
| Projeto | `portal-tucan-whatsapp` |
| Instância (VM) | `evolution-api` |
| Região/zona | `us-central1-a` (dentro das regiões elegíveis ao Always Free) |
| Tipo de máquina | `e2-micro` (grátis para sempre, sem trial) |
| IP externo | `34.9.209.108` |
| Pasta do projeto na VM | `~/evolution-api/` (`docker-compose.yml` + `.env`) |
| Instância Evolution (canal) | `portal-tucan` (modo **Baileys** — conexão via QR code) |
| Manager | `http://34.9.209.108:8080/manager` |

**Onde estão os segredos reais** (não estão neste arquivo nem no Git):
- `AUTHENTICATION_API_KEY` e a senha do Postgres → arquivo `~/evolution-api/.env` **dentro da própria VM**
- As mesmas 3 variáveis (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`) → `.env.local` (local) e
  Vercel → Project Settings → Environment Variables (Production + Preview)

## Como acessar a VM

1. [console.cloud.google.com](https://console.cloud.google.com) → login com a conta usada na criação
2. Selecione o projeto **portal-tucan-whatsapp** (canto superior esquerdo)
3. Menu → **Compute Engine → Instâncias de VM**
4. Na linha `evolution-api`, clique em **SSH** — abre um terminal direto no navegador, sem precisar de chave/senha local

## Runbook — reconectar (QR expirou / WhatsApp desconectou)

Sintoma: lembretes param de sair; `docker-compose logs` mostra a sessão do Baileys caindo, ou o Manager mostra
a instância como `close`/`disconnected`.

1. Acesse a VM por SSH (passo acima)
2. Confira se os containers estão rodando:
   ```bash
   cd ~/evolution-api
   sudo docker-compose ps
   ```
3. Se não estiverem `Up`, suba de novo: `sudo docker-compose up -d`
4. Acesse `http://34.9.209.108:8080/manager`, faça login com a `AUTHENTICATION_API_KEY` (está no `.env` da VM)
5. Abra a instância `portal-tucan` → gere um novo QR code
6. No celular da Tucan: WhatsApp → Aparelhos conectados → Conectar um aparelho → escaneie
7. Não é necessário mudar nada na Vercel — a URL, a key e o nome da instância continuam os mesmos

## Runbook — recriar a VM do zero (se a atual for perdida)

Já aconteceu duas vezes (uma VPS sem credenciais salvas, depois um trial do Railway expirado) — por isso este
passo a passo existe.

### 1. Criar a VM (Google Cloud Console)

- Compute Engine → Criar instância
- Nome: `evolution-api`
- Região: **uma destas três** (únicas elegíveis ao Always Free): `us-west1`, `us-central1` ou `us-east1`
- Série/tipo: **E2 / e2-micro**
- Disco de inicialização: Ubuntu 22.04 LTS, Standard persistent disk, 30 GB
- Marque "Permitir tráfego HTTP/HTTPS"
- Criar

> A tela de estimativa de custo mostra um valor (~US$6/mês) — isso é normal, é o preço de tabela. O Always
> Free aplica um crédito que zera a fatura, desde que a região/tipo/disco estejam dentro dos limites acima.

### 2. Abrir a porta 8080 no firewall

VPC network → Firewall → Criar regra de firewall:
- Nome: `permitir-8080`
- Origem: `0.0.0.0/0`
- Protocolo/porta: TCP `8080`

### 3. Instalar Docker (via SSH no navegador)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker --now
```

### 4. Configurar e subir a Evolution API

```bash
mkdir ~/evolution-api && cd ~/evolution-api
openssl rand -hex 24   # gera uma nova AUTHENTICATION_API_KEY — copie o resultado
openssl rand -hex 16   # gera uma nova senha do Postgres — copie o resultado
```

Crie o `.env` (substitua `NOVA_CHAVE` e `NOVA_SENHA` pelos valores gerados acima):

```bash
cat > .env << 'ENV_EOF'
AUTHENTICATION_API_KEY=NOVA_CHAVE
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:NOVA_SENHA@postgres:5432/evolution_db?schema=evolution_api
DATABASE_CONNECTION_CLIENT_NAME=evolution
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=false
DATABASE_SAVE_MESSAGE_UPDATE=false
DATABASE_SAVE_DATA_CONTACTS=false
DATABASE_SAVE_DATA_CHATS=false
DATABASE_SAVE_DATA_LABELS=false
DATABASE_SAVE_DATA_HISTORIC=false
DATABASE_SAVE_IS_ON_WHATSAPP=true
DATABASE_SAVE_IS_ON_WHATSAPP_DAYS=7
DATABASE_DELETE_MESSAGE=false
CACHE_REDIS_ENABLED=false
CACHE_LOCAL_ENABLED=true
POSTGRES_USER=evolution
POSTGRES_PASSWORD=NOVA_SENHA
POSTGRES_DB=evolution_db
ENV_EOF
```

Crie o `docker-compose.yml`:

```bash
cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: evolution-postgres
    restart: always
    env_file:
      - .env
    volumes:
      - evolution_postgres_data:/var/lib/postgresql/data

  evolution-api:
    image: evoapicloud/evolution-api:latest
    container_name: evolution-api
    restart: always
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    env_file:
      - .env
    volumes:
      - evolution_instances:/evolution/instances

volumes:
  evolution_instances:
  evolution_postgres_data:
COMPOSE_EOF
```

Suba tudo:

```bash
sudo docker-compose up -d
sudo docker-compose logs -f    # confirme "HTTP - ON: 8080" sem erros, depois Ctrl+C
```

### 5. Criar a instância e escanear o QR

`http://SEU_NOVO_IP:8080/manager` → login com a `AUTHENTICATION_API_KEY` → New instance → nome `portal-tucan`
→ Channel **Baileys** → Save → escaneie o QR no celular da Tucan.

### 6. Atualizar as variáveis no app

- `.env.local`: `EVOLUTION_API_URL` (novo IP), `EVOLUTION_API_KEY` (a chave gerada), `EVOLUTION_INSTANCE=portal-tucan`
- Vercel → Environment Variables → apagar as 3 antigas (são "Sensitive", não dá pra sobrescrever, só recriar) e
  adicionar de novo com os valores atuais, em **Production** e **Preview**
- Fazer um redeploy (`vercel redeploy <url-do-último-deploy>` ou um novo push) para as novas variáveis valerem

## Pegadinhas conhecidas (perdemos tempo com isso — não repetir)

1. **Nome da imagem Docker mudou**: o projeto trocou de dono no Docker Hub. `atendai/evolution-api` **não existe
   mais** — o certo hoje é `evoapicloud/evolution-api`.
2. **Banco de dados agora é obrigatório**: versões recentes exigem Postgres de verdade (`DATABASE_PROVIDER=postgresql`
   + `DATABASE_CONNECTION_URI`). Não existe mais rodar "sem banco".
3. **Use `env_file`, não `environment:` inline**: o `docker-compose` (versão antiga, 1.29, instalada via `apt`)
   tem bugs com a lista `environment:` direto no YAML — as variáveis chegavam vazias no container mesmo definidas
   corretamente. Colocar tudo em um arquivo `.env` e referenciar com `env_file: - .env` resolveu.
4. **Warning inofensivo nos logs**: ao rodar `docker-compose logs -f`, pode aparecer um traceback Python
   (`KeyError: 'id'` em `log_printer.py`) — é um bug conhecido do `docker-compose` 1.29 com o Docker Engine mais
   novo, não afeta o funcionamento.

## Alternativas já tentadas (e por que não vingaram)

| Opção | Resultado |
|---|---|
| VPS original (provedor esquecido) | Credenciais perdidas, sem SSH salvo — irrecuperável |
| Railway | Trial gratuito expirou; plano Hobby exige cartão (~US$5/mês) |
| Oracle Cloud Always Free | Cadastro travou na verificação de cartão |
| Google Cloud Always Free | ✅ Funcionou — é a opção atual |
| Whapi.Cloud (serviço hospedado, não precisa de VPS) | Configurado e testado, mas plano grátis é "sandbox" — só entrega mensagem para números que mandaram "Start" primeiro. Token `WHAPI_TOKEN` continua salvo na Vercel, sem uso, caso queiram reativar pagando (remove o limite do sandbox) |

## Se precisar trocar de provedor de novo

O código só depende da função `sendWhatsApp(phone, message)` em `src/lib/zapi.ts` — trocar de provedor é
reescrever só esse arquivo, sem tocar em `whatsapp-notifications.ts` nem nas actions que o chamam.
