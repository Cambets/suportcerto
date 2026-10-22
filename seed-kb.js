const { createClient } = require('@supabase/supabase-js');

const client = createClient(
  'https://tmbukbepahzrzujnfyhm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtYnVrYmVwYWh6cnp1am5meWhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA0ODAwNiwiZXhwIjoyMDk1NjI0MDA2fQ.Jg95G_M7oZRZxoydP16WQbMoEogoh-Z3bl1WKkxBEmg'
);

const entries = [
  {
    title: 'Certifica ERP (Ecossistema Completo de Gestão e Emissão Fiscal)',
    tags: ['erp', 'nfe', 'nfce', 'nfse', 'mdfe', 'cte', 'food', 'agro', 'clinicas', 'saloes', 'pet', 'pix'],
    content: `O Certifica ERP é um sistema em nuvem de gestão empresarial completo que integra vendas, estoque, financeiro e notas fiscais em uma única plataforma profissional, eliminando planilhas e processos manuais.

SEGMENTOS E PLANOS:
1) ERP Web (Comércio e Serviços):
- Planos: MEI (15 docs/mês), Contador (10 docs/mês), Básico, Intermediário, Avançado e Premium (ilimitados).
- Funcionalidades: NFe, NFSe, NFCe, Estoque, Pedido de venda, Orçamento, CTe, MDFe, CTe OS, Produção, OS, Financeiro, Contratos, Romaneio, Pedido de compra, Boleto, Averbação, Sped Fiscal e Contribuições.
- Adicionais: Força de Vendas, TEF Sitef, PIX Integrado, Assinador, SEUPOS (Stone, Rede, Mercado Pago, Caixa, Sicredi, Bin), WhatsApp, Cardápio Digital (Delivery), Declaração de Importação, etc.

2) ERP Agro & Agro Fiscal:
- Gestão para produtor rural (Livro Caixa do Produtor Rural, Romaneio, Produção, NFe, CTe, MDFe).
- Planos Agro Fiscal: A30 a A3200 docs/mês e Ilimitado.

3) ERP Food (Bares, Restaurantes, Delivery):
- Comandas, Mesas, Entregador, Touch Screen, Painel do Garçom, Cardápio Digital QR Code, Integração iFood, Fast Food, TEF, Anota Aí, Frete por KM.

4) ERP Clínicas (Médicas/Estéticas):
- Prontuário eletrônico, agendas, receitas/atestados personalizados, prescritor Memed.

5) ERP Salões & Barbearias:
- Link de agendamento online, gerenciamento de comissões por colaborador, comandas de consumo, emissão fiscal.

6) ERP Pet:
- Prontuário veterinário, anamnese, personalização de receitas, controle de banho/tosa e agenda.

PIX INTEGRADO NA NFC-e:
- Vinculação obrigatória da SEFAZ (QR Code dinâmico gerado no PDV, detecção automática do pagamento e emissão da NFC-e com tags do PIX preenchidas com tipo 17).`
  },
  {
    title: 'Certifica ERP Agenda (Agendamento, Serviços e Comissões)',
    tags: ['agenda', 'agendamento', 'servicos', 'saloes', 'clinicas', 'comissao', 'whatsapp'],
    content: `Plataforma 100% online para gerenciamento de agendamentos, reservas de espaços, controle financeiro, comissão de colaboradores, comanda de consumo e estoque.

FUNCIONALIDADES:
- Agendamento Manual (recepção) ou Online (link personalizado para cliente agendar sozinho).
- Visualização por profissional (salões/clínicas) ou por espaço físico (salas, quadras, boxes, estúdios).
- Fluxo Operacional: Agendamento -> Atendimento -> Comanda -> Frente de Caixa -> Financeiro.
- Comissão automática por percentual ou valor fixo para produtos e serviços por profissional.
- Comunicação WhatsApp com integração via QR Code: envio automático de confirmação, lembretes de horários, pedidos de confirmação e pesquisa de satisfação.`
  },
  {
    title: 'Certifica GED (Gestão Eletrônica de Documentos com IA e Assinador)',
    tags: ['ged', 'documentos', 'ocr', 'assinador', 'contratos', 'clm', 'nuvem', 'ia'],
    content: `Solução robusta de gerenciamento e organização eletrônica de documentos, combinada com IA documental e assinatura digital integrada.

FUNCIONALIDADES PRINCIPAIS:
- Armazenamento em Nuvem ilimitado (início padrão de 250 GB) com hospedagem AWS criptografada.
- Busca Inteligente com tecnologia OCR para reconhecimento de textos dentro de arquivos escaneados/fotos.
- Assinador Digital nativo com validade jurídica (ICP-Brasil) e trilha de auditoria completa.
- IA Documental para classificação automática de arquivos e extração de dados estruturados.
- Gestão de Tarefas & Contratos (CLM): Kanban para ciclo de vida de contratos com alertas de vencimento e renovação.
- Templates e links seguros de coleta externa para solicitar documentos a clientes sem depender de e-mail.
- Planos baseados em usuários (Básico, Intermediário, Avançado até ilimitados). Reduz em até 70% o tempo de busca.`
  },
  {
    title: 'Certifica Nota (Emissor Fiscal Especializado e Descomplicado)',
    tags: ['nota', 'emissor', 'nfe', 'nfce', 'cte', 'mdfe', 'sped', 'fiscal'],
    content: `Plataforma desenhada especificamente para emissão descomplicada de documentos fiscais eletrônicos sem a complexidade de um ERP completo.

FUNCIONALIDADES:
- Emissão multiformato: NF-e, NFC-e, CT-e, CT-e OS e MDF-e.
- Conformidade SEFAZ, SPED Fiscal, SPED Contribuições, SINTEGRA e EFD ICMS/IPI.
- Totalmente web, uso imediato, sem instalação local.
- Envio contábil automático com exportação de pacotes XML e PDF direto para a contabilidade.`
  },
  {
    title: 'Certifica Ponto (Controle de Ponto Digital, Facial e Portaria MTE)',
    tags: ['ponto', 'jornada', 'facial', 'geolocalizacao', 'clt', 'banco de horas', 'mte'],
    content: `Sistema digital inteligente de controle de ponto e jornada de trabalho, 100% em dia com as portarias do MTE, operando em formatos presencial, híbrido ou remoto.

RECURSOS:
- Reconhecimento Facial: Validação biométrica em segundos impedindo fraudes.
- Geolocalização & Cerca Virtual: Rastreamento GPS ativo com raio mínimo de 85m (bloqueio ou notificação ao gestor).
- Modo Offline: Registro mesmo sem internet e sincronização automática ao restabelecer conexão.
- Jornadas: Fixa, Flexível, 12x36, Intermitente, 5x1, 6x1 (CLT, PJ e Freelancers).
- Banco de Horas com controle em tempo real e compensação por folgas.
- Aplicativo do Colaborador: Espelho de ponto, atestados médicos, solicitação de férias e holerites.
- Dashboard do Gestor com mais de 40 relatórios e alertas de horas extras/faltas/atrasos.
- Planos mensais por faixas de vidas (1 a 10 vidas, 11 a 20, 21 a 30 vidas), sem fidelidade.`
  },
  {
    title: 'Certifica Signer (Plataforma de Assinaturas Eletrônicas e Digitais ICP-Brasil)',
    tags: ['signer', 'assinatura', 'icp-brasil', 'contratos', 'juridico', 'lote'],
    content: `Plataforma completa para assinaturas eletrônicas e digitais com total validade jurídica nacional (Lei 14.063/2020), sem custos de cartório e logística.

RECURSOS:
- Assinatura Híbrida: Suporta assinatura eletrônica (simples/avançada) e digital com certificado ICP-Brasil (qualificada).
- Múltiplos signatários com ordem de assinatura e permissões customizadas.
- Rastreabilidade: Carimbo do tempo, geolocalização do signatário e trilha de auditoria digital.
- Produtividade: Assinatura em lote, modelos reutilizáveis, rubricas e selos digitais.
- Planos a partir de R$ 19,90/mês, sem fidelidade e com plano gratuito para teste.`
  },
  {
    title: 'Certifica SST (Saúde, Segurança do Trabalho e eSocial com NR-01)',
    tags: ['sst', 'esocial', 'pgr', 'pcmso', 'ltcat', 'nr01', 'psicossociais', 'treinamentos'],
    content: `Solução desenvolvida para apoiar empresas e consultorias no cumprimento integral das Normas Regulamentadoras (NRs) do eSocial, centralizando laudos com assinatura ICP-Brasil.

DOCUMENTOS E RECURSOS:
- PGR (Programa de Gerenciamento de Riscos - substituiu PPRA) com inventário de riscos ativo e plano de ação.
- PCMSO (Programa de Controle Médico de Saúde Ocupacional) e LTCAT sob demanda.
- Ambiente Virtual de Aprendizagem (AVA) em conformidade com Anexo II da NR-01 para treinamentos EAD obrigatórios com emissão automática de certificados.
- Tratamento diferenciado com dispensa simplificada de PGR/PCMSO para MEI, ME e EPP quando previsto em lei.
- Módulo de Riscos Psicossociais em 6 Etapas (NR-01 atualizada / Portaria MTE nº 765/2025): Atualizar Cadastro -> Notificar Empresa -> Definir Prazo e Meta (mínimo 60% participação) -> Compilar Dados Anonimizados -> Gerar Relatórios de Burnout/Estresse -> Avaliar e Definir Ações.
- Planos Básico (até 5 func), Intermediário (até 10 func) e Avançado (até 20 func).`
  },
  {
    title: 'Certifica Registro (Registro e Proteção de Marcas no INPI & Legal Lab)',
    tags: ['registro', 'marca', 'inpi', 'marcas', 'protecao', 'legal lab', 'patente'],
    content: `Serviço especializado de busca de anterioridade, depósito, acompanhamento e monitoramento de marcas junto ao INPI.

DETALHES DO PROCESSO:
- Prazo do processo no INPI: De 18 a 36 meses.
- Garantia de prioridade: Assegurada imediatamente na data do protocolo de depósito.
- Planos:
  * Básico: Pesquisa de viabilidade, cadastro no INPI, emissão de GRUs, depósito e alerta de movimentações.
  * Intermediário: Tudo do básico + protocolo de manifestações e recursos administrativos ativos.
  * Avançado: Tudo do intermediário + notificações extrajudiciais por uso indevido + garantia estendida (novo protocolo sem honorários se houver indeferimento).
- Legal Lab (Marca Monitorada): Vigilância contínua para evitar diluição de marca, alertas de registros similares por concorrentes e controle do prazo decenal de renovação.`
  },
  {
    title: 'Certifica Design (Naming e Identidade Visual Profissional)',
    tags: ['design', 'naming', 'branding', 'logotipo', 'identidade visual'],
    content: `Solução de branding para criação de nomes de empresas (naming) e identidade visual profissional.

CRONOGRAMAS:
- Naming + Identidade Visual: 45 dias úteis (15 dias naming + 30 dias identidade visual).
- Apenas Identidade Visual: 30 dias úteis.
- Entregas: Logotipo principal, variações, paleta de cores, tipografia, manual simplificado da marca e arquivos em vetor, PNG, JPG e PDF.
- Naming: Até 2 rodadas com 5 opções de nomes exclusivos em cada rodada.
- Regra comercial: Não informar preços abertamente; encaminhar sempre para o atendimento comercial no WhatsApp.`
  },
  {
    title: 'Certifica Concilia (Auditoria e Conciliação Automática de Cartões)',
    tags: ['concilia', 'cartoes', 'tef', 'adquirentes', 'taxas', 'auditoria', 'financeiro'],
    content: `Sistema especializado em auditoria automática e conferência de transações em cartão de crédito, débito, taxas contratuais de adquirentes e fluxos de caixa.

BENEFÍCIOS:
- Conciliação automática de 100% das transações sem processos manuais ou planilhas.
- Auditoria de taxas cobradas pelas operadoras versus as taxas negociadas em contrato.
- Identificação imediata de divergências, cancelamentos indevidos e pagamentos não repassados.
- Implantação média de 30 a 60 dias após entrega dos acessos operacionais.`
  },
  {
    title: 'Certifica UP Digital (Estruturação de Presença Online para Negócios Locais)',
    tags: ['up digital', 'google meu negocio', 'instagram', 'whatsapp', 'presenca digital'],
    content: `Serviço especializado de montagem da base de presença digital de pequenas empresas e profissionais liberais nas principais plataformas de captação orgânica.

ESTRUTURAS CONFIGURADAS:
- Google Meu Negócio: Perfil profissional configurado e otimizado para buscas geolocalizadas.
- Instagram Profissional: Biografia otimizada, links de contato, destaques organizados e identidade visual inicial.
- WhatsApp Business: Catálogo de produtos/serviços, mensagens automáticas de boas-vindas e ausência.
- Página de Facebook integrada.
- Política Comercial: Pagamento único de R$ 797,00 (ou 6x R$ 166,17). Valor regular R$ 997,00. Não inclui posts mensais recorrentes nem tráfego pago.`
  },
  {
    title: 'Universidade Certifica & Suporte Operacional',
    tags: ['universidade', 'capacitacao', 'ar360', 'suporte', 'whatsapp', 'franquias'],
    content: `Plataforma de capacitação contínua em Ambiente Virtual de Aprendizagem (AVA) voltada para o desenvolvimento técnico e comercial de franqueados, vendedores e parceiros.

- Mais de 100 cursos online, +60 materiais e +5.000 alunos certificados.
- Destaque: Trilha AR360º para Autoridades de Registro (ICP-Brasil, regras técnicas e vendas).
- Canal de Suporte Operacional Certifica: WhatsApp (37) 99862-8259 (https://wa.me/5537998628259) para franqueados e parceiros.`
  }
];

async function seed() {
  console.log('Seeding Supabase knowledge base...');
  for (const entry of entries) {
    const { data: existing } = await client.from('knowledge_entries').select('id').eq('title', entry.title).maybeSingle();
    if (existing) {
      await client.from('knowledge_entries').update({
        content: entry.content,
        tags: entry.tags,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
      console.log('Updated:', entry.title);
    } else {
      await client.from('knowledge_entries').insert({
        title: entry.title,
        content: entry.content,
        tags: entry.tags
      });
      console.log('Inserted:', entry.title);
    }
  }
  console.log('--- ALL KNOWLEDGE ENTRIES INSERTED SUCCESSFULLY ---');
}

seed();
