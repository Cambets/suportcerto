# Relatório da inteligência do assistente em formato editável

Gerar o relatório já apresentado no chat como um documento **Word (.docx)** editável, com identidade visual Certifica+ (laranja/preto, Arial).

## Conteúdo do documento

1. Identidade e propósito do assistente (foco em ERP e emissão fiscal; não vende certificado)
2. Arquitetura de duas personalidades — tabela comparando "Dúvidas Gerais" x "Suporte Técnico & Erros", incluindo a restrição de acesso a admin/suporte
3. Estrutura obrigatória de resposta do modo técnico (causa provável / como verificar / passo a passo)
4. Base de conhecimento — tabela dos módulos (Base Certifica+, NF-e/NFS-e, Parametrização, MDF-e/CT-e, Certifica Design, Agenda, Rejeições SEFAZ) e busca semântica
5. Regras de precisão e antialucinação
6. Automações: consulta INPI, transcrição de áudio, análise de imagens, títulos automáticos
7. Segurança e governança: papéis, propriedade de conversa, validação de modo no servidor, links de parametrização com expiração
8. Escalonamento humano via WhatsApp com dados pré-preenchidos
9. Resumo do modo de pensar

## Entrega

- Arquivo: `relatorio-inteligencia-assistente-certifica.docx`, anexado no chat para download e edição
- Cada página será convertida em imagem e revisada antes da entrega (layout, textos cortados, tabelas)
- Nenhum arquivo do projeto será alterado

## Detalhes técnicos

- Geração com a biblioteca `docx` (Node), página US Letter, margens de 1", fonte Arial
- Tabelas em DXA com larguras somando 9360, listas via numbering (sem bullets unicode)
- QA via LibreOffice → PDF → `pdftoppm` para inspeção visual
