# 🛠️ SuportCerto

Plataforma de suporte e operações da Certifica+ (atual Syngular). Ecossistema web full-stack que centraliza o **suporte técnico com inteligência artificial**, a **parametrização fiscal automatizada** (esteira do contador) e a **base de conhecimento de documentos fiscais**.

> Evolução do antigo *Certifica-Buddy* — de um chatbot simples para uma plataforma completa de operações.

## 🧩 Módulos

### 🤖 Chat de Suporte Inteligente com IA & RAG
- Atendimento em tempo real com IA generativa e streaming de respostas sobre os sistemas Certifica+ (ERP, Nota, Concilia, GED, Ponto, SST).
- RAG contextual: consulta dinâmica à base de conhecimento da empresa, regras de negócio de NF-e/NFS-e e base oficial de rejeições e eventos da SEFAZ.
- Mensagens de voz com transcrição via IA.
- Consulta de marcas (INPI) em tempo real via API da InfoSimples, direto no chat.
- Handoff humano: links diretos para atendimento via WhatsApp com os dados do cliente já formatados.

### 📑 Esteira de Parametrização Fiscal (Portal do Contador)
- Formulário público por token (`/p/:token`): o contador preenche as configurações tributárias sem precisar de conta.
- Módulos fiscais: NF-e (55), NFC-e (65), NFS-e, CT-e (57), MDF-e (58).
- Reforma Tributária: parâmetros de transição (IBS, CBS, Imposto Seletivo) em todos os módulos.
- Upload seguro de certificado digital A1 (.pfx) com armazenamento criptografado no Supabase Storage.

### 🏛️ Base de Conhecimento SEFAZ
- Catálogo de 164 códigos oficiais de rejeições, denegações e eventos (MOC 7.0 + NT 2026.002), incluindo Autorização com Alerta (cStat 120).
- Busca instantânea, filtros por categoria e botão "Copiar Guia de Resolução" (causa provável + diagnóstico + passo a passo no ERP).

### 👥 Gestão de Acessos (RBAC)
Níveis: `admin`, `franchisee`, `suporte`, `contador`, `client`.

## 💻 Stack

| Camada | Tecnologias |
|---|---|
| Framework | TanStack Start (SSR, file-based routing, TypeScript) |
| Frontend | React 19, Tailwind CSS v4, Radix UI (shadcn/ui), Lucide, Sonner |
| Estado/Dados | TanStack Router, TanStack Query |
| IA | Vercel AI SDK, OpenAI / modelos compatíveis, Whisper |
| Backend | Supabase (PostgreSQL + RLS, Auth, Storage) |
| Integrações | InfoSimples (INPI), Fast-XML-Parser |

## ▶️ Como rodar

```bash
npm install
npm run dev
```

Configure as variáveis de ambiente (Supabase, chaves de IA) num arquivo `.env` — nunca commite chaves no repositório.

## 🎯 Problema que resolve

- **Suporte mais rápido:** diagnósticos de rejeições fiscais (ex.: 539, 203, 694, cStat 120) entregues em segundos pela IA, em vez de respostas manuais repetidas.
- **Onboarding sem atrito:** o contador parametriza impostos e envia o certificado por um link, sem troca interminável de e-mails e planilhas.
