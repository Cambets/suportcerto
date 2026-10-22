# Relatório Completo de Regras, Erros e Rejeições da SEFAZ — NF-e (modelo 55) e NFC-e (modelo 65)

> **Finalidade:** base de conhecimento para RAG de agente de suporte/pós-vendas. Cobre os códigos de status de rejeição (`cStat`) mais frequentes no dia a dia, com causa provável, resolução e passo a passo genérico no ERP.
> **Base normativa:** Manual de Orientação do Contribuinte (MOC) 7.0 — Anexo I (Leiaute e Regras de Validação da NF-e e da NFC-e), Notas Técnicas e portais SEFAZ. Nenhum código foi inventado: todos constam em tabelas oficiais.
> **Convenção de leitura:** cada código traz os campos **Código**, **Mensagem oficial SEFAZ**, **Causa provável**, **Como resolver** e **Passo a passo no ERP**, sempre nessa ordem e com esses rótulos, para facilitar a recuperação pelo RAG.

---

## Visão geral do fluxo de emissão da NF-e

1. **Geração do XML** — o ERP/PDV monta o documento no leiaute do MOC Anexo I.
2. **Assinatura digital** — o XML é assinado com certificado digital ICP-Brasil (A1/A3) do emitente; garante autoria e integridade.
3. **Transmissão** — envio via web service à SEFAZ de jurisdição do emitente (autorizadora).
4. **Validação** — a SEFAZ confere a integridade formal (schema XML, assinatura, certificado) e aplica as regras de negócio do MOC.
5. **Autorização** — se tudo confere, a SEFAZ retorna o protocolo de **Autorização de Uso** (`cStat 100`). Sem esse protocolo, a mercadoria não pode circular (salvo contingência prevista em lei).
6. **Distribuição** — o documento autorizado é compartilhado com a RFB (repositório nacional, modelo 55), a SEFAZ de destino (operações interestaduais) e órgãos como a SUFRAMA, quando aplicável.
7. **DANFE** — representação gráfica auxiliar impressa em papel comum (chave de acesso + código de barras) para acompanhar o trânsito. O DANFE **não é** a nota fiscal e não a substitui.
8. **Guarda e eventos** — o XML autorizado deve ser guardado por 5 anos; eventos posteriores (cancelamento, carta de correção, manifestação do destinatário) vinculam-se à chave de acesso.

**Respostas possíveis da SEFAZ:** `100` (autorizado), `120` (autorizado o uso da NF-e com alerta — NT 2026.002), **rejeição** (falha de validação — o documento não existe fiscalmente e pode ser corrigido e retransmitido, geralmente mantendo a numeração) ou **denegação/uso denegado** (o XML passou nas validações, mas a autorização foi negada por irregularidade cadastral — status final, ver categoria 8).

## Modos de contingência

O campo `tpEmis` (B22) indica o tipo de emissão: `1` normal; `2` FS-IA; `3` SCAN (desativado); `4` EPEC; `5` FS-DA; `6` SVC-AN; `7` SVC-RS; `9` off-line (NFC-e). Em contingência, informar sempre `dhCont` (data/hora de entrada) e `xMotivo`/`xJust` (justificativa, mín. 15 caracteres) — códigos 556/557/558/569.

- **EPEC — Evento Prévio de Emissão em Contingência (`tpEmis=4`):** usado quando a SEFAZ de origem e a SVC estão indisponíveis, havendo internet para o Ambiente Nacional. Transmite-se um resumo assinado (chave, UF/CNPJ-CPF do destinatário, `vNF`, `vICMS`, `vST`) ao web service de eventos da RFB; autorizado, o DANFE pode ser impresso em papel comum. A NF-e completa deve ser transmitida à SEFAZ de origem em até **168 horas (7 dias)**. Passado o prazo sem a transmissão, novos EPEC são **bloqueados** para o emitente (`cStat 142`) até a regularização. EPEC registrado não pode ser inutilizado nem cancelado — se a operação não ocorrer, autoriza-se a NF-e e cancela-se em seguida.
- **FS-IA — Formulário de Segurança (`tpEmis=2`):** sem comunicação e sem alternativa eletrônica; exige formulário de segurança (papel com estampa fiscal). Imprime-se o DANFE no formulário com a expressão de contingência e lavra-se termo no RUDFTO (modelo 6); transmite-se depois no prazo legal.
- **FS-DA — Formulário de Segurança para Documento Auxiliar (`tpEmis=5`):** mesma lógica do FS-IA, para quem adquiriu o FS-DA (Convênio ICMS 96/09); DANFE em 2 vias.
- **SVC-AN (`tpEmis=6`) / SVC-RS (`tpEmis=7`) — SEFAZ Virtual de Contingência:** ambiente "backup" ativado temporariamente pela SEFAZ de origem quando ela falha; autoriza normalmente, DANFE em papel comum, **sem necessidade de retransmissão** à origem depois. Se a SEFAZ de origem desabilitar a SVC, retorna `cStat 114`.
- **SCAN (`tpEmis=3`):** ambiente nacional substituto — **desativado** (usava séries 900–999; códigos relacionados: 503, 570).
- **Contingência off-line da NFC-e (`tpEmis=9`):** padrão do varejo — o PDV emite localmente sem autorização prévia, DANFE com expressão de contingência e QR Code com data/hora; transmitir **até o final do 1º dia útil subsequente**; manter a **mesma chave de acesso**; é vedado reutilizar número já transmitido como normal e vedada a inutilização de numeração de contingência (códigos: 704, 712, 714).

---
## 1. Dados do emitente e destinatário

### 203

- **Código:** 203
- **Mensagem oficial SEFAZ:** Rejeição: Emissor não habilitado para emissão de NF-e
- **Causa provável:** O CNPJ/IE do emitente não está credenciado ou habilitado na SEFAZ da UF para emitir NF-e (credenciamento pendente, IE suspensa/baixada ou situação cadastral irregular).
- **Como resolver:** Verificar a situação cadastral no Sintegra/CCC da UF e regularizar o credenciamento junto à SEFAZ (via contabilidade) antes de reemitir.
- **Passo a passo no ERP:** 1. No módulo fiscal do ERP, abra o cadastro da empresa/filial emitente e confira CNPJ, IE e UF. 2. Consulte a situação no Sintegra da UF (site da SEFAZ). 3. Se houver pendência cadastral, acione a contabilidade para regularizar junto à SEFAZ. 4. Somente após a regularização, reprocesse a NF-e no monitor de documentos do ERP.

### 208

- **Código:** 208
- **Mensagem oficial SEFAZ:** Rejeição: CNPJ do destinatário inválido
- **Causa provável:** O CNPJ informado no grupo `<dest>` tem dígito verificador inválido, está zerado ou nulo.
- **Como resolver:** Corrigir o CNPJ no cadastro do cliente (validar o DV) e reemitir; confirmar o número no Sintegra.
- **Passo a passo no ERP:** 1. No ERP, abra o cadastro do cliente/fornecedor destinatário. 2. Corrija o campo CNPJ (confira os 14 dígitos e o DV). 3. Salve o cadastro. 4. No módulo de emissão de NF-e, abra a nota rejeitada, atualize os dados do destinatário a partir do cadastro e retransmita.

### 209

- **Código:** 209
- **Mensagem oficial SEFAZ:** Rejeição: IE do emitente inválida
- **Causa provável:** A Inscrição Estadual do emitente tem erro de formato ou de dígito de controle para a UF (a SEFAZ normaliza zeros não significativos antes de validar o DV).
- **Como resolver:** Conferir a IE no cadastro do emitente e no Sintegra/CCC da UF; corrigir os dígitos e reemitir.
- **Passo a passo no ERP:** 1. No módulo fiscal do ERP, acesse os parâmetros da empresa/filial emitente. 2. Confira a Inscrição Estadual digitada (inclusive zeros à esquerda, se a UF exigir). 3. Valide a IE no Sintegra da UF. 4. Corrija no ERP e retransmita a NF-e.

### 210

- **Código:** 210
- **Mensagem oficial SEFAZ:** Rejeição: IE do destinatário inválida
- **Causa provável:** A IE informada para o destinatário tem dígito de controle ou formato inválido para a UF de destino.
- **Como resolver:** Validar a IE do destinatário no Sintegra da UF de destino; se for isento/não contribuinte, ajustar `indIEDest` em vez de informar IE.
- **Passo a passo no ERP:** 1. No ERP, abra o cadastro do destinatário. 2. Confira a IE e a UF; valide no Sintegra da UF de destino. 3. Se o destinatário for isento ou não contribuinte, ajuste o indicador de IE do destinatário (`indIEDest` = 2 isento ou 9 não contribuinte) em vez de manter IE inválida. 4. Reabra a NF-e rejeitada, atualize o destinatário e retransmita.

### 211

- **Código:** 211
- **Mensagem oficial SEFAZ:** Rejeição: IE do substituto inválida
- **Causa provável:** A IE do substituto tributário informada possui DV ou formato inválido.
- **Como resolver:** Corrigir a IE do substituto ou removê-la se a operação não exigir substituto.
- **Passo a passo no ERP:** 1. No ERP, localize no documento o campo de IE do substituto tributário. 2. Confira o número e o DV conforme a regra da UF. 3. Corrija ou limpe o campo se a operação não for de substituição. 4. Revalide e retransmita a NF-e.

### 226

- **Código:** 226
- **Mensagem oficial SEFAZ:** Rejeição: Código da UF do Emitente diverge da UF autorizadora
- **Causa provável:** O `cUF` informado no XML diverge da UF do web service que recebeu a NF-e (ex.: XML com `cUF` de SP enviado ao autorizador de outro estado).
- **Como resolver:** Ajustar o `cUF`/UF do emitente no XML ou enviar ao web service da UF correta.
- **Passo a passo no ERP:** 1. No módulo fiscal do ERP, confira a UF configurada para a empresa/filial emitente. 2. Verifique para qual SEFAZ autorizadora o ERP está transmitindo (UF própria, SVAN ou SVRS). 3. Corrija a UF do emitente ou o endpoint de transmissão nos parâmetros do ERP. 4. Retransmita a NF-e.

### 229

- **Código:** 229
- **Mensagem oficial SEFAZ:** Rejeição: IE do emitente não informada
- **Causa provável:** O campo `<IE>` do emitente veio zerado ou nulo.
- **Como resolver:** Preencher a Inscrição Estadual válida do emitente no cadastro da empresa/filial e reprocessar a nota.
- **Passo a passo no ERP:** 1. No módulo fiscal do ERP, abra o cadastro da empresa/filial emitente. 2. Preencha a Inscrição Estadual (se a empresa for contribuinte; se for dispensada, verifique o enquadramento correto com a contabilidade). 3. Salve. 4. Reabra a NF-e e retransmita.

### 230

- **Código:** 230
- **Mensagem oficial SEFAZ:** Rejeição: IE do emitente não cadastrada
- **Causa provável:** A IE informada não existe no cadastro de contribuintes da SEFAZ da UF do emitente.
- **Como resolver:** Consultar a contabilidade/SEFAZ para regularizar o cadastro da IE; só reemitir após a ativação no cadastro estadual.
- **Passo a passo no ERP:** 1. Confira a IE no cadastro da empresa no ERP. 2. Valide a IE no Sintegra/CCC da UF. 3. Se a IE não existir no cadastro estadual, a regularização é externa (contabilidade/SEFAZ) — não adianta apenas corrigir no ERP. 4. Após a ativação, retransmita a NF-e.

### 231

- **Código:** 231
- **Mensagem oficial SEFAZ:** Rejeição: IE do emitente não vinculada ao CNPJ
- **Causa provável:** A IE existe no cadastro da UF, mas está vinculada a outro CNPJ (ou não foi tratado o regime especial de IE única de matriz/filiais).
- **Como resolver:** Corrigir o par CNPJ × IE no cadastro do emitente; em caso de IE única de matriz/filiais, verificar o regime especial junto à SEFAZ.
- **Passo a passo no ERP:** 1. No cadastro da empresa/filial no ERP, confira se o CNPJ e a IE pertencem ao mesmo estabelecimento. 2. Valide o vínculo no Sintegra da UF. 3. Corrija o par CNPJ/IE (atenção a matriz vs. filiais). 4. Retransmita a NF-e.

### 232

- **Código:** 232
- **Mensagem oficial SEFAZ:** Rejeição: IE do destinatário não informada
- **Causa provável:** O destinatário é contribuinte (`indIEDest=1`), mas a tag `<IE>` não foi preenchida.
- **Como resolver:** Informar a IE válida do destinatário no cadastro do cliente; se for isento/não contribuinte, ajustar `indIEDest` (2 ou 9).
- **Passo a passo no ERP:** 1. No ERP, abra o cadastro do destinatário. 2. Se ele for contribuinte, preencha a IE válida. 3. Se for isento (`indIEDest=2`) ou não contribuinte (`indIEDest=9`), ajuste o indicador e deixe a IE em branco. 4. Atualize a NF-e rejeitada com os dados do cadastro e retransmita.

### 233

- **Código:** 233
- **Mensagem oficial SEFAZ:** Rejeição: IE do destinatário não cadastrada
- **Causa provável:** A IE informada não existe no cadastro da SEFAZ da UF de destino.
- **Como resolver:** Confirmar a IE correta com o cliente e no Sintegra da UF de destino; corrigir o cadastro e reemitir.
- **Passo a passo no ERP:** 1. No cadastro do destinatário no ERP, confira a IE digitada. 2. Valide no Sintegra da UF de destino. 3. Corrija a IE no cadastro (cuidado com IE de outro estado). 4. Reabra a NF-e, atualize o destinatário e retransmita.

### 234

- **Código:** 234
- **Mensagem oficial SEFAZ:** Rejeição: IE do destinatário não vinculada ao CNPJ
- **Causa provável:** A IE existe na UF de destino, mas está vinculada a outro CNPJ que não o do destinatário da nota.
- **Como resolver:** Verificar no Sintegra qual IE está vinculada ao CNPJ do destinatário e corrigir o cadastro do cliente.
- **Passo a passo no ERP:** 1. No Sintegra da UF de destino, pesquise pelo CNPJ do destinatário e anote a IE vinculada. 2. No ERP, corrija a IE no cadastro do cliente para a IE vinculada ao CNPJ. 3. Atualize a NF-e rejeitada e retransmita.

### 237

- **Código:** 237
- **Mensagem oficial SEFAZ:** Rejeição: CPF do destinatário inválido
- **Causa provável:** O CPF informado no `<dest>` tem DV inválido, está zerado, nulo ou com dígitos repetidos.
- **Como resolver:** Corrigir o CPF no cadastro do destinatário (pessoa física) e reemitir.
- **Passo a passo no ERP:** 1. No cadastro do cliente (pessoa física) no ERP, confira os 11 dígitos do CPF. 2. Corrija o DV/número. 3. Salve o cadastro. 4. Atualize a NF-e rejeitada e retransmita.

### 245

- **Código:** 245
- **Mensagem oficial SEFAZ:** Rejeição: CNPJ Emitente não cadastrado
- **Causa provável:** O CNPJ do emitente não consta no cadastro de contribuintes da SEFAZ da UF.
- **Como resolver:** Regularizar o cadastro do CNPJ junto à SEFAZ da UF antes de emitir.
- **Passo a passo no ERP:** 1. Confira o CNPJ no cadastro da empresa no ERP. 2. Valide a situação no Sintegra/CCC da UF. 3. A regularização é externa (contabilidade/SEFAZ). 4. Após regularizado, retransmita a NF-e.

### 246

- **Código:** 246
- **Mensagem oficial SEFAZ:** Rejeição: CNPJ Destinatário não cadastrado
- **Causa provável:** O CNPJ do destinatário não consta no cadastro de contribuintes da UF de destino.
- **Como resolver:** Confirmar o CNPJ com o destinatário e no Sintegra; corrigir o cadastro do cliente e reemitir.
- **Passo a passo no ERP:** 1. Confira o CNPJ no cadastro do cliente no ERP. 2. Valide no Sintegra. 3. Corrija o número no cadastro. 4. Atualize a NF-e rejeitada e retransmita.

### 272

- **Código:** 272
- **Mensagem oficial SEFAZ:** Rejeição: Código Município do Emitente inexistente
- **Causa provável:** O `cMun` do endereço do emitente não existe na tabela de municípios do IBGE.
- **Como resolver:** Corrigir o código do município (7 dígitos do IBGE) no cadastro do emitente.
- **Passo a passo no ERP:** 1. No cadastro da empresa/filial no ERP, abra a aba de endereço. 2. Confira o código IBGE do município (7 dígitos). 3. Corrija usando a tabela oficial do IBGE. 4. Retransmita a NF-e.

### 273

- **Código:** 273
- **Mensagem oficial SEFAZ:** Rejeição: Código Município do Emitente: difere da UF do emitente
- **Causa provável:** Os dois primeiros dígitos do `cMun` do emitente não correspondem ao código da UF do emitente.
- **Como resolver:** Ajustar o `cMun` para um município da UF do emitente (ou corrigir a UF).
- **Passo a passo no ERP:** 1. No endereço da empresa no ERP, confira se o código IBGE pertence à UF informada (os 2 primeiros dígitos indicam a UF). 2. Corrija o município ou a UF. 3. Retransmita a NF-e.

### 274

- **Código:** 274
- **Mensagem oficial SEFAZ:** Rejeição: Código Município do Destinatário inexistente
- **Causa provável:** O `cMun` do endereço do destinatário não existe na tabela de municípios do IBGE.
- **Como resolver:** Corrigir o código IBGE do município no cadastro/endereço do destinatário.
- **Passo a passo no ERP:** 1. No cadastro do cliente no ERP, abra o endereço. 2. Corrija o código IBGE do município (7 dígitos). 3. Salve. 4. Atualize a NF-e rejeitada e retransmita.

### 275

- **Código:** 275
- **Mensagem oficial SEFAZ:** Rejeição: Código Município do Destinatário: difere da UF do Destinatário
- **Causa provável:** Os dois primeiros dígitos do `cMun` do destinatário não correspondem ao código da UF informada no endereço do destinatário.
- **Como resolver:** Alinhar `cMun` e UF do destinatário conforme a tabela do IBGE.
- **Passo a passo no ERP:** 1. No endereço do destinatário no ERP, confira a coerência entre município (IBGE) e UF. 2. Corrija o que estiver divergente. 3. Atualize a NF-e rejeitada e retransmita.

### 327

- **Código:** 327
- **Mensagem oficial SEFAZ:** Rejeição: CFOP inválido para Nota Fiscal com finalidade de devolução de mercadoria
- **Causa provável:** A NF-e tem finalidade de devolução (`finNFe=4`), mas o CFOP informado não é um CFOP de devolução.
- **Como resolver:** Usar CFOP de devolução (ex.: 1.411/1.412, 2.411/2.412, 5.411/5.412, 6.411/6.412) ou corrigir a finalidade da nota.
- **Passo a passo no ERP:** 1. No ERP, abra a NF-e rejeitada e confira o campo finalidade. 2. Se for devolução, ajuste os itens para CFOP de devolução compatível com a operação (interna/interestadual). 3. Se não for devolução, corrija a finalidade para normal/complementar/ajuste. 4. Revalide e retransmita.

### 328

- **Código:** 328
- **Mensagem oficial SEFAZ:** Rejeição: CFOP de devolução de mercadoria para NF-e que não tem finalidade de devolução de mercadoria
- **Causa provável:** Foi usado CFOP de devolução em NF-e cuja finalidade (`finNFe`) não é 4 (devolução).
- **Como resolver:** Ajustar a finalidade para devolução (`finNFe=4`) ou trocar o CFOP por um compatível com a operação real.
- **Passo a passo no ERP:** 1. No ERP, confira a finalidade da NF-e e o CFOP dos itens. 2. Alinhe os dois: finalidade devolução exige CFOP de devolução; demais finalidades exigem CFOP da operação real. 3. Corrija e retransmita.

### 719

- **Código:** 719
- **Mensagem oficial SEFAZ:** Rejeição: NF-e sem a identificação do destinatário
- **Causa provável:** O grupo `<dest>` não foi informado na NF-e.
- **Como resolver:** Preencher a identificação do destinatário (CNPJ/CPF/idEstrangeiro) conforme o tipo de operação.
- **Passo a passo no ERP:** 1. No ERP, abra a NF-e rejeitada. 2. Vincule um destinatário válido (cadastro de cliente/fornecedor) ou preencha os dados manualmente. 3. Confira se o tipo de operação exige identificação (operações com exterior usam `idEstrangeiro`). 4. Retransmita.

### 724

- **Código:** 724
- **Mensagem oficial SEFAZ:** Rejeição: NF-e sem o nome do destinatário
- **Causa provável:** A tag `<xNome>` do destinatário não foi informada.
- **Como resolver:** Informar o nome/razão social do destinatário no cadastro e no XML.
- **Passo a passo no ERP:** 1. No cadastro do destinatário no ERP, preencha a razão social/nome. 2. Na NF-e rejeitada, atualize os dados do destinatário a partir do cadastro. 3. Retransmita.

### 726

- **Código:** 726
- **Mensagem oficial SEFAZ:** Rejeição: NF-e sem a informação de endereço do destinatário
- **Causa provável:** O grupo `<enderDest>` (logradouro, município, UF etc.) não foi informado.
- **Como resolver:** Preencher o endereço completo do destinatário no cadastro do cliente.
- **Passo a passo no ERP:** 1. No cadastro do cliente no ERP, complete o endereço (logradouro, número, bairro, município IBGE, UF, CEP). 2. Na NF-e rejeitada, atualize o destinatário. 3. Retransmita.

### 728

- **Código:** 728
- **Mensagem oficial SEFAZ:** Rejeição: NF-e sem informação da IE do destinatário
- **Causa provável:** O destinatário é contribuinte do ICMS (`indIEDest=1`), mas a IE não foi informada.
- **Como resolver:** Informar a IE do destinatário ou, se ele for isento/não contribuinte, ajustar `indIEDest` para 2 ou 9.
- **Passo a passo no ERP:** 1. No cadastro do destinatário, confira o indicador de contribuinte do ICMS. 2. Se contribuinte, informe a IE; se isento/não contribuinte, ajuste o indicador. 3. Atualize a NF-e rejeitada e retransmita.

### 791

- **Código:** 791
- **Mensagem oficial SEFAZ:** Rejeição: NF-e com indicação de destinatário isento de IE, com a informação da IE do destinatário
- **Causa provável:** Foi indicado destinatário isento (`indIEDest=2`), mas a tag `<IE>` foi preenchida.
- **Como resolver:** Remover a IE do XML quando `indIEDest=2` (isento).
- **Passo a passo no ERP:** 1. No cadastro do destinatário no ERP, com o indicador "isento de IE", deixe o campo IE em branco. 2. Na NF-e rejeitada, atualize o destinatário. 3. Retransmita.

### 805

- **Código:** 805
- **Mensagem oficial SEFAZ:** Rejeição: A SEFAZ do destinatário não permite Contribuinte Isento de Inscrição Estadual em operações interestaduais
- **Causa provável:** Operação interestadual com destinatário isento de IE, e a UF de destino veda esse perfil.
- **Como resolver:** Verificar a regra da UF de destino; o destinatário isento pode precisar de inscrição estadual ou a operação deve ser reenquadrada (validar com a contabilidade).
- **Passo a passo no ERP:** 1. Confirme no cadastro do destinatário o indicador de IE e a UF. 2. Consulte a contabilidade sobre a vedação da UF de destino. 3. Ajuste o cadastro (inscrição do destinatário ou enquadramento da operação) conforme orientação. 4. Reemitir a NF-e.

### 872

- **Código:** 872
- **Mensagem oficial SEFAZ:** Rejeição: A SEFAZ do destinatário não permite Contribuinte Isento de Inscrição Estadual em operações internas
- **Causa provável:** Operação interna com destinatário isento de IE, e a UF veda esse perfil em operações internas.
- **Como resolver:** Consultar a legislação da UF; regularizar a inscrição do destinatário ou ajustar o enquadramento da operação.
- **Passo a passo no ERP:** 1. No cadastro do destinatário no ERP, confira indicador de IE e UF. 2. Valide com a contabilidade a regra da UF para operações internas com isentos. 3. Ajuste o cadastro/operação. 4. Reemitir a NF-e.

---
## 2. Numeração, série e chave de acesso

### 204

- **Código:** 204
- **Mensagem oficial SEFAZ:** Rejeição: Duplicidade de NF-e
- **Causa provável:** Já existe NF-e autorizada na SEFAZ com a mesma chave de acesso (mesmo CNPJ, modelo, série, número e demais posições) — típico de reenvio de nota já autorizada após instabilidade no retorno.
- **Como resolver:** Não reenviar; consultar o status da nota original pela chave de acesso. Para nova operação, usar o próximo número sequencial da série.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, localize a nota pelo número/série. 2. Consulte a chave de acesso no portal da SEFAZ (consulta pública). 3. Se a nota original está autorizada, arquive o XML/protocolo retornado e não retransmita. 4. Para a nova operação, emita com o próximo número livre da sequência.

### 227

- **Código:** 227
- **Mensagem oficial SEFAZ:** Rejeição: Erro na Chave de Acesso - Campo Id – falta a literal NFe
- **Causa provável:** O atributo `Id` da NF-e não começa com a literal "NFe" (formato exigido: `Id="NFe<44 dígitos>"`).
- **Como resolver:** Corrigir a geração do XML para montar o `Id` como a literal "NFe" seguida dos 44 dígitos da chave.
- **Passo a passo no ERP:** 1. Trata-se de falha na montagem do XML pelo módulo de emissão. 2. No ERP, verifique a versão do componente/emissor fiscal e atualize se houver correção disponível. 3. Regenere o XML da nota e retransmita. 4. Se persistir, acione o suporte técnico do módulo fiscal informando o código 227.

### 236

- **Código:** 236
- **Mensagem oficial SEFAZ:** Rejeição: Chave de Acesso com dígito verificador inválido
- **Causa provável:** O 44º dígito da chave (DV, módulo 11) não confere com o cálculo sobre os 43 primeiros dígitos.
- **Como resolver:** Recalcular o DV pelo algoritmo módulo 11 oficial e corrigir a chave no XML.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, abra a nota rejeitada e confira a chave de acesso gerada. 2. Verifique se algum campo que compõe a chave foi alterado manualmente (CNPJ, série, número, data, código numérico). 3. Regenere a chave de acesso pela rotina do ERP (sem edição manual). 4. Retransmita.

### 253

- **Código:** 253
- **Mensagem oficial SEFAZ:** Rejeição: Digito Verificador da chave de acesso composta inválida
- **Causa provável:** O DV da chave de acesso composta (usada em contingência) está inválido.
- **Como resolver:** Recalcular o DV da chave composta e corrigir o XML/evento.
- **Passo a passo no ERP:** 1. Identifique no ERP se a nota foi emitida em contingência. 2. Regenere a chave de acesso composta pela rotina oficial do módulo fiscal (não edite manualmente). 3. Retransmita a NF-e ou o evento.

### 265

- **Código:** 265
- **Mensagem oficial SEFAZ:** Rejeição: Série utilizada não permitida no Web Service
- **Causa provável:** A série informada não é aceita naquele web service (série reservada a outro modelo/ambiente ou fora da faixa permitida).
- **Como resolver:** Utilizar série válida para o modelo/ambiente (NF-e: 0–889 normalmente) e reemitir.
- **Passo a passo no ERP:** 1. Nos parâmetros fiscais do ERP, confira a série configurada para NF-e modelo 55 no ambiente (produção/homologação). 2. Ajuste para uma série permitida (ex.: 1). 3. Reabra a NF-e rejeitada, ajuste a série e retransmita.

### 502

- **Código:** 502
- **Mensagem oficial SEFAZ:** Rejeição: Erro na Chave de Acesso - Campo Id não corresponde à concatenação dos campos correspondentes
- **Causa provável:** O `Id` não equivale à concatenação esperada ("NFe" + chave de 44 dígitos formada pelos campos do XML).
- **Como resolver:** Regenerar o `Id` a partir dos campos reais do documento (cUF, AAMM, CNPJ, modelo, série, nNF, tpEmis, cNF, DV).
- **Passo a passo no ERP:** 1. Falha de montagem do XML. 2. No ERP, regenere o XML da nota sem edições manuais nos campos de identificação. 3. Retransmita. 4. Se persistir, acione o suporte técnico do módulo fiscal informando o código 502.

### 503

- **Código:** 503
- **Mensagem oficial SEFAZ:** Rejeição: Série utilizada fora da faixa permitida no SCAN (900-999)
- **Causa provável:** Emissão em contingência SCAN com série fora do intervalo 900–999.
- **Como resolver:** Em contingência SCAN, usar série entre 900 e 999.
- **Passo a passo no ERP:** 1. O SCAN está desativado na prática atual; verifique se o ERP está com contingência SCAN ativa indevidamente. 2. Desative o modo SCAN e use emissão normal (`tpEmis=1`) ou a contingência vigente (SVC/EPEC). 3. Ajuste a série para a faixa normal e reemitir.

### 539

- **Código:** 539
- **Mensagem oficial SEFAZ:** Rejeição: Duplicidade de NF-e, com diferença na Chave de Acesso
- **Causa provável:** Já existe NF-e autorizada com mesmo CNPJ emitente, modelo, série e número, mas com data de emissão, tipo de emissão, código numérico ou outra posição da chave diferente. Cenários típicos: instabilidade no retorno da SEFAZ seguida de reenvio em contingência; reenvio com `cNF` diferente; reutilização da numeração em outro ano.
- **Como resolver:** Verificar se a nota original foi autorizada (consultar chave/recibo). Se foi, não reemitir o mesmo número: cancelar a original (se cabível e no prazo) ou emitir nova nota com o próximo número sequencial.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, consulte a nota original pelo número/série e verifique o protocolo. 2. Consulte a chave no portal da SEFAZ. 3. Se autorizada: arquive o XML e o DANFE; não retransmita o mesmo número. 4. Para a operação pendente, gere nova NF-e com o próximo número livre da série. 5. Se a sequência do ERP estiver dessincronizada, ajuste o próximo número nos parâmetros fiscais.

### 561

- **Código:** 561
- **Mensagem oficial SEFAZ:** Rejeição: Mês de Emissão informado na Chave de Acesso difere do Mês de Emissão da NF-e
- **Causa provável:** O ano/mês embutido na chave (posições 3–6, AAMM) não corresponde ao `dhEmi` do XML.
- **Como resolver:** Alinhar a chave ao `dhEmi` real (regenerar a chave a partir dos dados do XML).
- **Passo a passo no ERP:** 1. Na NF-e rejeitada, confira a data de emissão informada. 2. Regenere a chave de acesso pela rotina do ERP (sem edição manual). 3. Retransmita.

### 562

- **Código:** 562
- **Mensagem oficial SEFAZ:** Rejeição: Código Numérico informado na Chave de Acesso difere do Código Numérico da NF-e
- **Causa provável:** O `cNF` embutido na chave (posições 36–43) difere do `<cNF>` informado no XML.
- **Como resolver:** Corrigir o `cNF` no XML ou regenerar a chave com o `cNF` correto.
- **Passo a passo no ERP:** 1. Falha de montagem do XML. 2. Regenere o XML/chave pela rotina do ERP sem edições manuais. 3. Retransmita. 4. Se persistir, acione o suporte técnico do módulo fiscal informando o código 562.

### 614

- **Código:** 614
- **Mensagem oficial SEFAZ:** Rejeição: Chave de Acesso inválida (Código UF inválido)
- **Causa provável:** O código da UF na chave (2 primeiros dígitos) não corresponde a nenhuma UF válida.
- **Como resolver:** Corrigir o `cUF` e regenerar a chave de acesso.
- **Passo a passo no ERP:** 1. Confira a UF da empresa emitente nos parâmetros fiscais do ERP. 2. Regenere a chave de acesso. 3. Retransmita.

### 617

- **Código:** 617
- **Mensagem oficial SEFAZ:** Rejeição: Chave de Acesso inválida (CNPJ zerado ou dígito inválido)
- **Causa provável:** O CNPJ embutido na chave está zerado ou com DV inválido.
- **Como resolver:** Informar o CNPJ correto do emitente e regenerar a chave.
- **Passo a passo no ERP:** 1. Confira o CNPJ da empresa emitente no cadastro do ERP. 2. Regenere a chave de acesso. 3. Retransmita.

### 635

- **Código:** 635
- **Mensagem oficial SEFAZ:** Rejeição: NF-e com mesmo número e série já transmitida e aguardando processamento
- **Causa provável:** A NF-e com esse número/série já foi recebida e está em processamento (lote ainda não concluído); o reenvio colide.
- **Como resolver:** Aguardar o processamento do lote original e consultar o recibo; não reenviar o mesmo número.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, localize o lote/recibo da transmissão original. 2. Consulte o processamento do recibo (aguarde a SEFAZ concluir). 3. Não gere nova nota com o mesmo número enquanto o lote estiver pendente. 4. Após o retorno, siga o status: se autorizada, arquive; se rejeitada, corrija e retransmita.

---
## 3. Valores, totais e impostos

### 528

- **Código:** 528
- **Mensagem oficial SEFAZ:** Rejeição: Valor do ICMS difere do produto BC e Alíquota
- **Causa provável:** O `vICMS` do item não confere com `vBC × pICMS` (considerada a tolerância de arredondamento da SEFAZ).
- **Como resolver:** Recalcular `vBC`, `pICMS` e `vICMS` do item com as casas decimais corretas e reemitir.
- **Passo a passo no ERP:** 1. No ERP, abra a NF-e rejeitada e localize o item apontado (`nItem`). 2. Confira base de cálculo, alíquota e valor do ICMS do item. 3. Corrija os valores (atenção a arredondamentos: use 2 casas decimais). 4. Revalide os totais e retransmita.

### 532

- **Código:** 532
- **Mensagem oficial SEFAZ:** Rejeição: Total do ICMS difere do somatório dos itens
- **Causa provável:** O totalizador `vICMS` (grupo `ICMSTot`) diverge da soma dos `vICMS` dos itens.
- **Como resolver:** Somar corretamente os valores dos itens no totalizador e reemitir.
- **Passo a passo no ERP:** 1. No ERP, abra a NF-e e confira o totalizador de ICMS. 2. Some manualmente os ICMS dos itens e compare. 3. Use a rotina de "recalcular totais" do módulo fiscal do ERP, se disponível. 4. Retransmita.

### 564

- **Código:** 564
- **Mensagem oficial SEFAZ:** Rejeição: Total do Produto / Serviço difere do somatório dos itens
- **Causa provável:** O totalizador `vProd` diverge da soma dos `vProd` dos itens.
- **Como resolver:** Recalcular o `vProd` total como a soma exata dos itens.
- **Passo a passo no ERP:** 1. No ERP, confira o total de produtos da NF-e contra a soma dos itens. 2. Recalcule os totais pela rotina do módulo fiscal. 3. Retransmita.

### 590

- **Código:** 590
- **Mensagem oficial SEFAZ:** Rejeição: Informado CST para emissor do Simples Nacional (CRT=1)
- **Causa provável:** Emitente do Simples Nacional (`CRT=1`) informou `CST` de ICMS em vez de `CSOSN`.
- **Como resolver:** Substituir o CST pelo CSOSN correspondente (ex.: 101, 102, 500) conforme orientação do contador.
- **Passo a passo no ERP:** 1. No cadastro da empresa no ERP, confirme o CRT (1 = Simples Nacional). 2. Na operação fiscal/CFOP ou no cadastro do produto, ajuste a tributação para usar CSOSN em vez de CST. 3. Valide com a contabilidade o CSOSN correto (101, 102, 103, 300, 400, 500 etc.). 4. Reemitir a NF-e.

### 591

- **Código:** 591
- **Mensagem oficial SEFAZ:** Rejeição: Informado CSOSN para emissor que não é do Simples Nacional (CRT diferente de 1)
- **Causa provável:** Emitente do regime normal (Lucro Real/Presumido, `CRT=2` ou `3`) informou `CSOSN` em vez de `CST`.
- **Como resolver:** Substituir o CSOSN pelo CST correto do ICMS.
- **Passo a passo no ERP:** 1. Confirme o CRT da empresa no ERP (2 ou 3 = regime normal). 2. Ajuste a parametrização fiscal (operação/CFOP/produto) para informar CST do ICMS em vez de CSOSN. 3. Valide o CST correto com a contabilidade. 4. Reemitir a NF-e.

### 600

- **Código:** 600
- **Mensagem oficial SEFAZ:** Rejeição: CSOSN incompatível na operação com Não Contribuinte
- **Causa provável:** Operação com destinatário não contribuinte (`indIEDest=9`) usando CSOSN incompatível com esse perfil.
- **Como resolver:** Revisar `indIEDest`/`indFinal` e aplicar o CSOSN permitido para não contribuinte (validar regra tributária com o contador).
- **Passo a passo no ERP:** 1. No cadastro do destinatário, confira o indicador de contribuinte do ICMS. 2. Na NF-e, confira `indIEDest` e `indFinal`. 3. Ajuste o CSOSN da operação conforme a regra tributária (contabilidade). 4. Reemitir a NF-e.

### 602

- **Código:** 602
- **Mensagem oficial SEFAZ:** Rejeição: Total do PIS difere do somatório dos itens sujeitos ao ICMS
- **Causa provável:** O totalizador do PIS diverge da soma do PIS dos itens tributados pelo ICMS.
- **Como resolver:** Recalcular os valores de PIS por item e o totalizador; em caso de isenção, não informar alíquota/valor de PIS.
- **Passo a passo no ERP:** 1. No ERP, confira os valores de PIS por item da NF-e. 2. Recalcule os totais pela rotina do módulo fiscal. 3. Se houver isenção, limpe os campos de alíquota/valor do PIS nos itens isentos. 4. Retransmita.

### 603

- **Código:** 603
- **Mensagem oficial SEFAZ:** Rejeição: Total do COFINS difere do somatório dos itens sujeitos ao ICMS
- **Causa provável:** O totalizador da COFINS diverge da soma da COFINS dos itens sujeitos ao ICMS.
- **Como resolver:** Recalcular a COFINS por item e o totalizador.
- **Passo a passo no ERP:** 1. No ERP, confira os valores de COFINS por item. 2. Recalcule os totais. 3. Retransmita.

### 610

- **Código:** 610
- **Mensagem oficial SEFAZ:** Rejeição: Total da NF difere do somatório dos Valores compõe o valor Total da NF.
- **Causa provável:** O `vNF` não equivale à composição oficial: `vProd − vDesc + vST + vFrete + vSeg + vOutro + vII + vIPI` (+ `vServ` quando houver).
- **Como resolver:** Recalcular o `vNF` pela fórmula (atenção: IPI e ICMS-ST compõem o total) e reemitir.
- **Passo a passo no ERP:** 1. No ERP, abra a NF-e e confira cada parcela do total (produtos, desconto, frete, seguro, outras despesas, IPI, ICMS-ST). 2. Use a rotina de recalcular totais do módulo fiscal. 3. Confira se descontos e acréscimos estão rateados corretamente nos itens. 4. Retransmita.

### 611

- **Código:** 611
- **Mensagem oficial SEFAZ:** Rejeição: cEAN inválido
- **Causa provável:** O GTIN/cEAN informado no item tem formato ou dígito verificador inválido (a SEFAZ valida códigos de 8, 12, 13 ou 14 dígitos).
- **Como resolver:** Corrigir o código de barras/GTIN no cadastro do produto (ou usar "SEM GTIN" quando o produto não o possuir, conforme regra vigente).
- **Passo a passo no ERP:** 1. No cadastro do produto no ERP, confira o código de barras/GTIN. 2. Corrija o número (atenção ao DV do código de barras). 3. Se o produto não possui GTIN, informe "SEM GTIN" conforme permitido. 4. Reemitir a NF-e.

### 628

- **Código:** 628
- **Mensagem oficial SEFAZ:** Rejeição: Total da NF superior ao valor limite estabelecido pela SEFAZ
- **Causa provável:** O `vNF` ultrapassa o teto definido pela SEFAZ autorizadora para uma única NF-e.
- **Como resolver:** Desmembrar a operação em mais de uma NF-e ou verificar o limite praticado pela UF.
- **Passo a passo no ERP:** 1. Confirme o valor total da NF-e. 2. Se ultrapassar o limite da UF, divida a operação em duas ou mais NF-e no ERP. 3. Reemitir.

### 629

- **Código:** 629
- **Mensagem oficial SEFAZ:** Rejeição: Valor do Produto difere do produto Valor Unitário de Comercialização e Quantidade Comercial
- **Causa provável:** O `vProd` do item não confere com `qCom × vUnCom` (divergência de arredondamento/casas decimais ou rateio indevido).
- **Como resolver:** Alinhar quantidade, valor unitário e total do item com as mesmas casas decimais e reemitir.
- **Passo a passo no ERP:** 1. No item da NF-e no ERP, confira quantidade comercial, valor unitário e valor total. 2. Ajuste as casas decimais para que `qCom × vUnCom = vProd` (tolerância mínima). 3. Retransmita.

### 630

- **Código:** 630
- **Mensagem oficial SEFAZ:** Rejeição: Valor do Produto difere do produto Valor Unitário de Tributação e Quantidade Tributável
- **Causa provável:** O `vProd` do item não confere com `qTrib × vUnTrib`.
- **Como resolver:** Corrigir `qTrib`/`vUnTrib` (a unidade de tributação pode diferir da comercial) e reemitir.
- **Passo a passo no ERP:** 1. No item da NF-e, confira a unidade e os valores de tributação (podem diferir dos comerciais, ex.: caixa vs. unidade). 2. Ajuste `qTrib`/`vUnTrib` para fechar com o `vProd`. 3. Retransmita.

### 694

- **Código:** 694
- **Mensagem oficial SEFAZ:** Rejeição: Não informado o grupo de ICMS para a UF de destino
- **Causa provável:** Operação interestadual para consumidor final não contribuinte sem o grupo `ICMSUFDest` (DIFAL/FCP), exigido pela EC 87/2015.
- **Como resolver:** Preencher o grupo de ICMS interestadual da UF de destino (base, alíquotas interna/interestadual, partilha e FCP se aplicável).
- **Passo a passo no ERP:** 1. Na NF-e, confirme: operação interestadual + consumidor final não contribuinte. 2. No ERP, habilite o cálculo do DIFAL/FCP para a UF de destino na operação fiscal (parametrização tributária). 3. Confira alíquota interna da UF destino e alíquota interestadual. 4. Reemitir a NF-e.

### 696

- **Código:** 696
- **Mensagem oficial SEFAZ:** Rejeição: Operação com não contribuinte deve indicar operação com consumidor final
- **Causa provável:** Destinatário com `indIEDest=9` (não contribuinte) sem `indFinal=1` (consumidor final) e sem ser operação com o exterior.
- **Como resolver:** Marcar a operação como consumidor final (`indFinal=1`) no documento/cadastro do cliente.
- **Passo a passo no ERP:** 1. No cadastro do destinatário no ERP, marque-o como não contribuinte/consumidor final. 2. Na NF-e, ajuste o indicador de operação com consumidor final (`indFinal=1`). 3. Retransmita.

### 778

- **Código:** 778
- **Mensagem oficial SEFAZ:** Rejeição: Informado NCM inexistente
- **Causa provável:** O NCM informado no item não existe na tabela oficial.
- **Como resolver:** Consultar a tabela NCM vigente e corrigir o código no cadastro do produto.
- **Passo a passo no ERP:** 1. No cadastro do produto no ERP, confira o NCM (8 dígitos). 2. Corrija conforme a tabela oficial vigente (consulte a contabilidade em caso de dúvida). 3. Reemitir a NF-e.

### 795

- **Código:** 795
- **Mensagem oficial SEFAZ:** Rejeição: Total do ICMS desonerado difere do somatório dos itens
- **Causa provável:** O totalizador `vICMSDeson` diverge da soma dos `vICMSDeson` dos itens.
- **Como resolver:** Somar corretamente o ICMS desonerado dos itens no totalizador.
- **Passo a passo no ERP:** 1. Confira os valores de ICMS desonerado por item. 2. Recalcule os totais no módulo fiscal do ERP. 3. Retransmita.

### 798

- **Código:** 798
- **Mensagem oficial SEFAZ:** Rejeição: Valor total do ICMS relativo Fundo de Combate à Pobreza (FCP) da UF de destino difere do somatório do valor dos itens
- **Causa provável:** O totalizador `vFCPUFDest` diverge da soma dos valores de FCP de destino dos itens.
- **Como resolver:** Recalcular o FCP por item e o totalizador.
- **Passo a passo no ERP:** 1. Confira o FCP de destino por item. 2. Recalcule os totais. 3. Retransmita.

### 800

- **Código:** 800
- **Mensagem oficial SEFAZ:** Rejeição: Valor total do ICMS Interestadual da UF do remetente difere do somatório dos itens
- **Causa provável:** O totalizador `vICMSUFRemet` diverge da soma dos valores dos itens.
- **Como resolver:** Recalcular o ICMS do remetente por item e o totalizador.
- **Passo a passo no ERP:** 1. Confira o ICMS do remetente por item. 2. Recalcule os totais. 3. Retransmita.

### 806

- **Código:** 806
- **Mensagem oficial SEFAZ:** Rejeição: Operação com ICMS-ST sem informação do CEST
- **Causa provável:** Item com ICMS-ST (CST 10, 30, 70 etc.) sem o código CEST informado.
- **Como resolver:** Informar o CEST correto do produto (tabela do CONFAZ) no item.
- **Passo a passo no ERP:** 1. No cadastro do produto no ERP, preencha o CEST conforme a tabela do CONFAZ para o segmento do produto. 2. Na NF-e, atualize o item. 3. Retransmita.

### 815

- **Código:** 815
- **Mensagem oficial SEFAZ:** Rejeição: Valor do ICMS Interestadual para UF de Destino difere do calculado
- **Causa provável:** O `vICMSUFDest` do item não confere com o cálculo da SEFAZ: `(BC × (alíquota interna − alíquota interestadual)) × % partilha`.
- **Como resolver:** Revisar base de cálculo, alíquota interestadual, alíquota interna da UF de destino e percentual do FCP; recalcular o DIFAL.
- **Passo a passo no ERP:** 1. No item da NF-e, confira BC do DIFAL, alíquota interestadual e alíquota interna da UF destino. 2. Confira a parametrização do DIFAL/FCP no ERP para a UF de destino. 3. Recalcule e retransmita. 4. Valide a regra com a contabilidade se a divergência persistir.

### 816

- **Código:** 816
- **Mensagem oficial SEFAZ:** Rejeição: Valor do ICMS Interestadual para UF do Remetente difere do calculado
- **Causa provável:** O `vICMSUFRemet` do item não confere com o cálculo da SEFAZ.
- **Como resolver:** Recalcular o ICMS do remetente com as alíquotas corretas entre as UFs envolvidas.
- **Passo a passo no ERP:** 1. Confira as alíquotas interestaduais aplicadas no item. 2. Recalcule pelo módulo fiscal do ERP. 3. Retransmita.

### 861

- **Código:** 861
- **Mensagem oficial SEFAZ:** Rejeição: Total do FCP difere do somatório dos itens
- **Causa provável:** O totalizador `vFCP` diverge da soma dos valores de FCP dos itens.
- **Como resolver:** Recalcular o FCP por item e o totalizador.
- **Passo a passo no ERP:** 1. Confira o FCP por item da NF-e. 2. Recalcule os totais. 3. Retransmita.

---
## 4. Certificado digital e assinatura

> Nota: os códigos 280–286 referem-se ao **certificado transmissor** (TLS, autenticação da conexão); os códigos 290–296, ao **certificado de assinatura** (assinatura do XML). Os códigos 297/298 referem-se à assinatura em si.

### 213

- **Código:** 213
- **Mensagem oficial SEFAZ:** Rejeição: CNPJ-Base do Autor difere do CNPJ-Base do Certificado Digital
- **Causa provável:** O CNPJ-base (8 primeiros dígitos) do certificado digital usado para assinar/transmitir não é o mesmo do CNPJ do emitente informado na NF-e (ex.: certificado de outra empresa ou de filial com raiz diferente).
- **Como resolver:** Emitir/transmitir a NF-e com o certificado digital cujo CNPJ-base seja o do próprio emitente (filiais podem usar o certificado da matriz, mesma raiz).
- **Passo a passo no ERP:** 1. No módulo fiscal do ERP, abra as configurações do certificado digital. 2. Confira o CNPJ vinculado ao certificado instalado. 3. Se for de outra empresa/raiz, instale o certificado correto (e-CNPJ da empresa ou da matriz). 4. Retransmita a NF-e. Observação: se a SEFAZ já registrou o documento com o certificado errado, não reutilize a numeração sem antes verificar o status.

### 244

- **Código:** 244
- **Mensagem oficial SEFAZ:** Rejeição: CNPJ do Certificado Digital difere do CNPJ da Matriz e do CNPJ do Emitente
- **Causa provável:** O certificado digital usado na transmissão pertence a outro CNPJ-base (outra empresa ou raiz diferente da matriz do emitente).
- **Como resolver:** Utilizar certificado digital cujo CNPJ-base seja o do próprio emitente ou o da matriz.
- **Passo a passo no ERP:** 1. Confira o certificado configurado no ERP. 2. Substitua pelo certificado da empresa/matriz correta. 3. Retransmita.

### 280

- **Código:** 280
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Transmissor inválido
- **Causa provável:** Falha na validação TLS do certificado do transmissor: certificado inexistente na mensagem, versão diferente de "3", Basic Constraint de AC, ou KeyUsage sem "Autenticação Cliente".
- **Como resolver:** Verificar instalação/cadeia do certificado no emissor e confirmar que é um certificado de pessoa (e-CNPJ/e-CPF) válido.
- **Passo a passo no ERP:** 1. No servidor/estação onde o ERP transmite a NF-e, abra o gerenciador de certificados. 2. Confira se o certificado está instalado, válido e com a cadeia completa. 3. Reinstale o certificado se necessário. 4. Teste a transmissão.

### 281

- **Código:** 281
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Transmissor Data Validade
- **Causa provável:** O certificado do transmissor está vencido ou ainda não entrou em vigor (data fora da data atual do servidor).
- **Como resolver:** Renovar o certificado junto à Autoridade Certificadora e ajustar data/hora do servidor se estiver incorreta.
- **Passo a passo no ERP:** 1. Verifique a validade do certificado (início/fim). 2. Se vencido, providencie a renovação com a AC e instale o novo certificado no ambiente do ERP. 3. Sincronize data/hora do servidor (NTP). 4. Retransmita.

### 282

- **Código:** 282
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Transmissor sem CNPJ/CPF
- **Causa provável:** O certificado não possui a extensão de CNPJ (OID 2.16.76.1.3.3) nem de CPF (OID 2.16.76.1.3.1) exigida pela SEFAZ.
- **Como resolver:** Utilizar certificado com CNPJ/CPF vinculado (e-CNPJ/e-CPF padrão ICP-Brasil); se emitido incorretamente, obter um novo.
- **Passo a passo no ERP:** 1. Confira o tipo do certificado instalado (deve ser e-CNPJ ou e-CPF). 2. Se for um certificado sem vínculo (ex.: e-mail, servidor), substitua pelo certificado correto. 3. Reconfigure no ERP e retransmita.

### 283

- **Código:** 283
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Transmissor - erro Cadeia de Certificação
- **Causa provável:** Falha na cadeia: certificado da AC emissora não cadastrado na SEFAZ, AC revogada, ou certificado não assinado pela AC emissora.
- **Como resolver:** Atualizar a cadeia de certificação no computador (instalar certificados raiz/intermediários ICP-Brasil) e validar a emissão do certificado com a AC.
- **Passo a passo no ERP:** 1. No servidor do ERP, atualize os certificados raiz e intermediários da ICP-Brasil. 2. Verifique com a Autoridade Certificadora se o certificado foi emitido corretamente. 3. Teste a transmissão.

### 284

- **Código:** 284
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Transmissor revogado
- **Causa provável:** O certificado do transmissor consta como revogado na Lista de Certificados Revogados (LCR/CRL).
- **Como resolver:** Obter um novo certificado digital junto à Autoridade Certificadora; o atual está cancelado e não pode mais ser usado.
- **Passo a passo no ERP:** 1. Confirme a revogação com a AC. 2. Emita um novo certificado. 3. Instale no ambiente do ERP e atualize a configuração do módulo fiscal. 4. Retransmita as notas pendentes.

### 285

- **Código:** 285
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Transmissor difere ICP-Brasil
- **Causa provável:** O certificado raiz do transmissor não pertence à ICP-Brasil (certificado de outra hierarquia).
- **Como resolver:** Utilizar certificado emitido por AC credenciada na ICP-Brasil; verificar o repositório de raízes do servidor.
- **Passo a passo no ERP:** 1. Verifique a cadeia do certificado até a raiz. 2. Substitua por certificado de AC credenciada ICP-Brasil. 3. Reconfigure no ERP e retransmita.

### 286

- **Código:** 286
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Transmissor erro no acesso a LCR
- **Causa provável:** Não foi possível consultar a LCR do certificado: falta o endereço da LCR (CRL DistributionPoint), LCR indisponível ou inválida.
- **Como resolver:** Verificar conectividade e a presença do ponto de distribuição da LCR no certificado; se persistir, renovar o certificado com a AC.
- **Passo a passo no ERP:** 1. Verifique a conexão do servidor com a internet (acesso aos endereços da LCR). 2. Confira o CRL DistributionPoint do certificado. 3. Se o problema for no certificado, renove-o com a AC. 4. Retransmita.

### 290

- **Código:** 290
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Assinatura inválido
- **Causa provável:** O certificado usado para assinar digitalmente a NF-e falhou nas validações (inexistente na mensagem, versão diferente de "3", Basic Constraint de AC, ou KeyUsage sem "Assinatura Digital").
- **Como resolver:** Conferir o certificado configurado para assinatura no emissor, reinstalá-lo e garantir que seja certificado de pessoa (e-CNPJ/e-CPF) válido.
- **Passo a passo no ERP:** 1. No módulo fiscal do ERP, abra a configuração do certificado de assinatura. 2. Confira instalação, validade e cadeia. 3. Reinstale se necessário. 4. Regenere a assinatura da NF-e e retransmita.

### 291

- **Código:** 291
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Assinatura Data Validade
- **Causa provável:** O certificado de assinatura está vencido ou ainda não entrou em vigor na data de processamento.
- **Como resolver:** Renovar o certificado de assinatura e conferir data/hora do equipamento que assina a NF-e.
- **Passo a passo no ERP:** 1. Verifique a validade do certificado de assinatura. 2. Renove com a AC e instale o novo. 3. Sincronize o relógio do equipamento (NTP). 4. Reassine e retransmita as notas.

### 292

- **Código:** 292
- **Mensagem oficial SEFAZ:** Rejeição: Certificado de Assinatura sem CNPJ/CPF
- **Causa provável:** O certificado de assinatura não contém a extensão de CNPJ (OID 2.16.76.1.3.3) nem de CPF (OID 2.16.76.1.3.1).
- **Como resolver:** Assinar a NF-e com certificado que tenha CNPJ/CPF vinculado; obter novo certificado se o atual estiver incorreto.
- **Passo a passo no ERP:** 1. Confira o tipo do certificado de assinatura (e-CNPJ/e-CPF). 2. Substitua se necessário. 3. Reconfigure no ERP, reassine e retransmita.

### 293

- **Código:** 293
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Assinatura - erro Cadeia de Certificação
- **Causa provável:** Cadeia de certificação do certificado de assinatura inválida: AC emissora não cadastrada na SEFAZ, AC revogada ou certificado não assinado pela AC emissora.
- **Como resolver:** Instalar/atualizar a cadeia de certificação ICP-Brasil no ambiente e validar o certificado com a AC emissora.
- **Passo a passo no ERP:** 1. Atualize os certificados raiz/intermediários no servidor do ERP. 2. Valide o certificado junto à AC. 3. Reassine e retransmita.

### 294

- **Código:** 294
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Assinatura revogado
- **Causa provável:** O certificado de assinatura está revogado na LCR.
- **Como resolver:** Substituir o certificado por um novo junto à Autoridade Certificadora; não é possível reutilizar o revogado.
- **Passo a passo no ERP:** 1. Confirme a revogação com a AC. 2. Emita novo certificado, instale e configure no ERP. 3. Reassine e retransmita as notas pendentes.

### 295

- **Código:** 295
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Assinatura difere ICP-Brasil
- **Causa provável:** O certificado raiz do certificado de assinatura não é da ICP-Brasil.
- **Como resolver:** Utilizar certificado emitido por AC credenciada na ICP-Brasil.
- **Passo a passo no ERP:** 1. Verifique a cadeia até a raiz. 2. Substitua por certificado ICP-Brasil. 3. Reconfigure, reassine e retransmita.

### 296

- **Código:** 296
- **Mensagem oficial SEFAZ:** Rejeição: Certificado Assinatura erro no acesso a LCR
- **Causa provável:** Falha ao acessar a LCR do certificado de assinatura: endereço da LCR ausente, LCR indisponível ou inválida.
- **Como resolver:** Verificar a conectividade e o CRL DistributionPoint do certificado; renovar o certificado se necessário.
- **Passo a passo no ERP:** 1. Verifique a internet do servidor e o ponto de distribuição da LCR. 2. Renove o certificado com a AC se o problema for nele. 3. Reassine e retransmita.

### 297

- **Código:** 297
- **Mensagem oficial SEFAZ:** Rejeição: Assinatura difere do calculado
- **Causa provável:** A assinatura digital do XML não corresponde ao cálculo da SEFAZ sobre o conteúdo (XML alterado após a assinatura, canonicalização incorreta ou algoritmo errado).
- **Como resolver:** Assinar novamente a NF-e sem modificar o XML após a assinatura; validar a biblioteca de assinatura XML (canonicalização C14N, algoritmos SHA/RSA corretos).
- **Passo a passo no ERP:** 1. No ERP, regenere o XML da nota do zero (sem reaproveitar XML assinado e editado). 2. Execute a rotina de assinatura do módulo fiscal. 3. Retransmita sem qualquer edição manual no XML. 4. Se persistir, acione o suporte técnico do módulo fiscal informando o código 297.

### 298

- **Código:** 298
- **Mensagem oficial SEFAZ:** Rejeição: Assinatura difere do padrão do Projeto
- **Causa provável:** A estrutura da assinatura digital não segue o padrão exigido pelo projeto NF-e (posicionamento de tags, namespace ou algoritmo fora do leiaute).
- **Como resolver:** Ajustar o gerador de XML para o padrão do MOC (assinatura envelopada em `<Signature>` conforme schema) e reenviar.
- **Passo a passo no ERP:** 1. Verifique se o emissor fiscal do ERP está atualizado para o leiaute vigente. 2. Regenere e reassine a NF-e. 3. Retransmita. 4. Se persistir, acione o suporte técnico do módulo fiscal informando o código 298.

---
## 5. Autorização, contingência e inutilização

### 100

- **Código:** 100
- **Mensagem oficial SEFAZ:** Autorizado o uso da NF-e
- **Causa provável:** Resultado de sucesso: a NF-e foi autorizada e pode circular.
- **Como resolver:** Nenhuma ação necessária; guardar o XML autorizado com o protocolo.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, confirme o status "Autorizada" e o número do protocolo. 2. Arquive o XML autorizado. 3. Libere o DANFE/faturamento conforme o fluxo da empresa.

### 108

- **Código:** 108
- **Mensagem oficial SEFAZ:** Rejeição: Serviço paralisado momentaneamente (curto prazo)
- **Causa provável:** O web service da SEFAZ está temporariamente indisponível (manutenção breve ou instabilidade).
- **Como resolver:** Aguardar alguns minutos e reenviar; se persistir, avaliar emissão em contingência (SVC/EPEC/FS-DA) conforme a legislação da UF.
- **Passo a passo no ERP:** 1. Aguarde alguns minutos e use a rotina de reenvio do monitor de NF-e. 2. Se a SEFAZ seguir fora do ar, avalie com o responsável fiscal a entrada em contingência (parametrizar `tpEmis` no ERP). 3. Monitore o retorno à normalidade.

### 109

- **Código:** 109
- **Mensagem oficial SEFAZ:** Rejeição: Serviço paralisado sem previsão
- **Causa provável:** O serviço da SEFAZ está fora do ar sem previsão de retorno.
- **Como resolver:** Emitir em contingência (EPEC, SVC ou FS-DA, conforme habilitado) e transmitir a NF-e quando o serviço normalizar, respeitando o prazo de 168h.
- **Passo a passo no ERP:** 1. Ative o modo de contingência no módulo fiscal do ERP (`tpEmis` adequado). 2. Informe `dhCont` e a justificativa (`xJust`, mín. 15 caracteres). 3. Emita as notas em contingência e acompanhe a normalização. 4. Transmita as NF-e à SEFAZ de origem dentro de 168h.

### 114

- **Código:** 114
- **Mensagem oficial SEFAZ:** Rejeição: SVC desabilitada pelo SEFAZ origem
- **Causa provável:** Tentativa de emitir com `tpEmis=6/7` (SVC-RS/SVC-AN) quando a SEFAZ de origem desativou o uso da SEFAZ Virtual de Contingência.
- **Como resolver:** Desabilitar o modo contingência SVC no emissor e emitir em modo normal (`tpEmis=1`), ou usar EPEC se aplicável.
- **Passo a passo no ERP:** 1. Nos parâmetros fiscais do ERP, desative a contingência SVC. 2. Volte o tipo de emissão para normal (`tpEmis=1`). 3. Retransmita as NF-e.

### 120

- **Código:** 120
- **Mensagem oficial SEFAZ:** Autorizado o uso da NF-e, com alerta
- **Causa provável:** A nota fiscal foi autorizada normalmente no banco de dados da SEFAZ, mas o autorizador identificou uma inconsistência não-fatal (alerta) — como situação cadastral do destinatário — que não provoca rejeição nem impede o trânsito da mercadoria.
- **Como resolver:** A NF-e é VÁLIDA. NÃO cancelar nem retransmitir a nota. O DANFE impresso é válido. O atendente deve orientar o cliente a verificar a inconsistência retornada no protocolo de autorização (ex.: situação cadastral do destinatário) e corrigir nos cadastros para as próximas emissões.
- **Passo a passo no ERP:** 1. No monitor fiscal do ERP, confirme que a nota está com status autorizado (cStat 120). 2. Imprima o DANFE normalmente e libere a mercadoria. 3. Abra o protocolo de autorização retornado pela SEFAZ e verifique a mensagem/código de alerta. 4. Corrija o cadastro correspondente (cliente/destinatário ou produto) para prevenir alertas em emissões futuras.

### 124

- **Código:** 124
- **Mensagem oficial SEFAZ:** EPEC Autorizado
- **Causa provável:** Resultado de sucesso: o Evento Prévio de Emissão em Contingência foi registrado no Ambiente Nacional.
- **Como resolver:** Nenhuma ação imediata; lembrar que a NF-e completa (`tpEmis=4`) deve ser transmitida à SEFAZ de origem em até 168 horas (7 dias).
- **Passo a passo no ERP:** 1. Confirme no monitor de eventos do ERP o EPEC autorizado e o protocolo. 2. Agende/controle o prazo de 168h para transmitir a NF-e completa à SEFAZ de origem. 3. Após a autorização da NF-e completa, arquive os dois XMLs vinculados.

### 142

- **Código:** 142
- **Mensagem oficial SEFAZ:** Ambiente de Contingência EPEC bloqueado para o Emitente
- **Causa provável:** O emitente está bloqueado para novos EPEC porque há NF-e(s) de EPEC autorizado há mais de 168 horas sem a transmissão da NF-e completa correspondente.
- **Como resolver:** Transmitir as NF-e pendentes à SEFAZ de origem para desbloquear; após a regularização, novos EPEC voltam a ser aceitos.
- **Passo a passo no ERP:** 1. No monitor de eventos do ERP, liste os EPEC autorizados sem a NF-e completa transmitida. 2. Transmita cada NF-e completa à SEFAZ de origem. 3. Confirme a autorização (cStat 100). 4. O bloqueio é liberado automaticamente após a regularização.

### 150

- **Código:** 150
- **Mensagem oficial SEFAZ:** Autorizado o uso da NF-e, autorização fora de prazo
- **Causa provável:** A NF-e foi autorizada, mas a data de emissão está além do prazo regulamentar (entre 7 e 30 dias, conforme regras da UF) — típico de emissão retroativa/contingência tardia.
- **Como resolver:** A NF-e é válida, mas o contribuinte pode estar sujeito a penalidade por emissão fora de prazo; evitar emissões com atraso e transmitir contingências dentro de 168h.
- **Passo a passo no ERP:** 1. Arquive o XML autorizado normalmente. 2. Oriente a operação a não emitir com data retroativa. 3. Para contingências, controle o prazo de 168h no ERP.

### 151

- **Código:** 151
- **Mensagem oficial SEFAZ:** Cancelamento de NF-e homologado fora de prazo
- **Causa provável:** Resultado de sucesso para pedido de cancelamento recebido após o prazo regulamentar de 24h, porém dentro do limite máximo (ex.: até 480h em SP), homologado como denúncia espontânea.
- **Como resolver:** Lançar termo no livro RUDFTO (modelo 6) narrando o ocorrido, conforme orientação da SEFAZ; não há correção de sistema necessária.
- **Passo a passo no ERP:** 1. Confirme no monitor de eventos o cancelamento homologado fora de prazo e o protocolo. 2. Registre o termo no livro fiscal (RUDFTO modelo 6) conforme orientação da contabilidade. 3. Arquive o XML do evento.

### 201

- **Código:** 201
- **Mensagem oficial SEFAZ:** Rejeição: Número máximo de numeração a inutilizar ultrapassou o limite
- **Causa provável:** O pedido de inutilização excede a faixa máxima permitida por solicitação (limite definido pela SEFAZ).
- **Como resolver:** Dividir o pedido em faixas menores e reenviar.
- **Passo a passo no ERP:** 1. No módulo de inutilização do ERP, divida a faixa em intervalos menores. 2. Envie os pedidos separadamente. 3. Acompanhe os protocolos de homologação (cStat 102).

### 205

- **Código:** 205
- **Mensagem oficial SEFAZ:** Rejeição: NF-e está denegada na base de dados da SEFAZ
- **Causa provável:** A chave de acesso refere-se a uma NF-e que está denegada (irregularidade fiscal do emitente) e não pode ser reutilizada.
- **Como resolver:** Regularizar a situação do emitente e emitir nova NF-e com outro número; o número denegado está morto (não pode ser reutilizado, cancelado nem inutilizado).
- **Passo a passo no ERP:** 1. Confirme no portal da SEFAZ que a chave está denegada. 2. Regularize a situação cadastral do emitente (contabilidade/SEFAZ). 3. No ERP, emita nova NF-e com o próximo número livre da série (nunca reutilize o número denegado). 4. Escriturar a NF-e denegada sem valores monetários, conforme orientação da contabilidade. Ver categoria 8 para o tratamento completo de denegação.

### 206

- **Código:** 206
- **Mensagem oficial SEFAZ:** Rejeição: NF-e já está inutilizada na Base de dados da SEFAZ
- **Causa provável:** Tentativa de emitir NF-e com número que já foi inutilizado.
- **Como resolver:** Utilizar o próximo número livre da sequência; se for erro recorrente, inutilizar faixas de numeração quebradas até o 10º dia do mês seguinte.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, descarte a tentativa com o número inutilizado. 2. Ajuste o próximo número da série nos parâmetros fiscais para pular a faixa inutilizada. 3. Emita a NF-e com o novo número.

### 216

- **Código:** 216
- **Mensagem oficial SEFAZ:** Rejeição: Chave de Acesso difere da cadastrada
- **Causa provável:** A chave de acesso informada no evento/consulta difere da chave registrada na SEFAZ para aquele documento (digitação errada ou documento divergente).
- **Como resolver:** Conferir a chave de acesso caractere a caractere (44 dígitos, DV incluído) e corrigir.
- **Passo a passo no ERP:** 1. Copie a chave de acesso direto do XML autorizado no ERP (evite digitação manual). 2. Reenvie o evento/consulta com a chave correta.

### 217

- **Código:** 217
- **Mensagem oficial SEFAZ:** Rejeição: NF-e não consta na base de dados da SEFAZ
- **Causa provável:** O evento/consulta/cancelamento referencia uma chave de acesso inexistente na SEFAZ (NF-e nunca foi transmitida ou chave errada).
- **Como resolver:** Confirmar que a NF-e foi realmente autorizada; se não, transmiti-la corretamente antes de registrar eventos sobre ela.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, confira o status da nota (autorizada? rejeitada?). 2. Se nunca foi autorizada, transmita a NF-e primeiro. 3. Só então registre o evento (cancelamento, CC-e etc.).

### 218

- **Código:** 218
- **Mensagem oficial SEFAZ:** Rejeição: NF-e já está cancelada na base de dados da SEFAZ
- **Causa provável:** O evento (ex.: nova CC-e, novo cancelamento) foi enviado para NF-e que já está cancelada.
- **Como resolver:** Nenhuma correção é possível sobre NF-e cancelada; se necessário, emitir nova NF-e com outro número.
- **Passo a passo no ERP:** 1. Confirme o status "Cancelada" no monitor do ERP/portal SEFAZ. 2. Não tente novos eventos sobre ela. 3. Se a operação precisa ocorrer, emita nova NF-e com outro número.

### 219

- **Código:** 219
- **Mensagem oficial SEFAZ:** Rejeição: Circulação da NF-e verificada
- **Causa provável:** O pedido de cancelamento foi negado porque a SEFAZ verificou que a mercadoria já circulou (fato gerador ocorrido), condição que impede o cancelamento.
- **Como resolver:** Não cancelar; se houver erro em NF-e com circulação, usar carta de correção (para erros simples) ou emitir NF-e complementar/devolução conforme o caso.
- **Passo a passo no ERP:** 1. Avalie com o responsável fiscal se a mercadoria realmente circulou. 2. Se sim, desista do cancelamento no ERP. 3. Para correções simples, registre CC-e; para erros de valor/quantidade, emita NF-e complementar ou de devolução.

### 220

- **Código:** 220
- **Mensagem oficial SEFAZ:** Rejeição: Prazo de Cancelamento superior ao previsto na Legislação
- **Causa provável:** O pedido de cancelamento foi feito após o prazo regulamentar (regra geral: 24h da autorização; algumas UFs aceitam até 480h como denúncia espontânea).
- **Como resolver:** Após o prazo máximo, o cancelamento via sistema não é mais possível; seguir o procedimento de cancelamento extemporâneo junto ao Posto Fiscal (denúncia espontânea).
- **Passo a passo no ERP:** 1. Confira a data/hora da autorização no monitor do ERP. 2. Se dentro de 480h (conforme a UF), tente o cancelamento (pode retornar cStat 151 — homologado fora de prazo). 3. Se além do limite, oriente o cliente ao procedimento extemporâneo via Posto Fiscal (não há ação no sistema).

### 221

- **Código:** 221
- **Mensagem oficial SEFAZ:** Rejeição: Confirmado o recebimento da NF-e pelo destinatário
- **Causa provável:** O cancelamento foi negado porque o destinatário já registrou manifestação de confirmação da operação sobre a NF-e.
- **Como resolver:** Não é possível cancelar; tratar o desfazimento pela via comercial (devolução com NF-e de entrada do destinatário) ou CC-e para ajustes simples.
- **Passo a passo no ERP:** 1. Confirme a manifestação do destinatário no portal da SEFAZ. 2. Cancele a tentativa de cancelamento no ERP. 3. Oriente a emissão de NF-e de devolução pelo destinatário (ou CC-e, se o ajuste for simples).

### 222

- **Código:** 222
- **Mensagem oficial SEFAZ:** Rejeição: Protocolo de Autorização de Uso difere do cadastrado
- **Causa provável:** O protocolo de autorização informado no evento/consulta não corresponde ao registrado na SEFAZ para aquela chave.
- **Como resolver:** Consultar a NF-e na SEFAZ e usar o número de protocolo correto retornado na autorização original.
- **Passo a passo no ERP:** 1. No monitor de NF-e do ERP, abra a nota e copie o número do protocolo de autorização original. 2. Reenvie o evento com o protocolo correto.

### 224

- **Código:** 224
- **Mensagem oficial SEFAZ:** Rejeição: A faixa inicial é maior que a faixa final
- **Causa provável:** No pedido de inutilização, o número inicial da faixa (`nNFIni`) é maior que o final (`nNFFin`).
- **Como resolver:** Inverter/corrigir os valores para que `nNFIni ≤ nNFFin` e reenviar.
- **Passo a passo no ERP:** 1. No módulo de inutilização do ERP, confira os campos número inicial e final. 2. Corrija a ordem. 3. Reenvie o pedido.

### 240

- **Código:** 240
- **Mensagem oficial SEFAZ:** Rejeição: Cancelamento/Inutilização - Irregularidade Fiscal do Emitente
- **Causa provável:** O emitente possui irregularidade cadastral/fiscal que impede o processamento do cancelamento ou da inutilização.
- **Como resolver:** Regularizar a situação do emitente junto à SEFAZ (IE ativa, sem pendências) e reenviar o pedido.
- **Passo a passo no ERP:** 1. Verifique a situação cadastral do emitente no Sintegra. 2. Regularize com a contabilidade/SEFAZ. 3. Reenvie o cancelamento/inutilização pelo ERP.

### 241

- **Código:** 241
- **Mensagem oficial SEFAZ:** Rejeição: Um número da faixa já foi utilizado
- **Causa provável:** A faixa de inutilização contém número já utilizado em NF-e autorizada, cancelada ou denegada — só números nunca utilizados podem ser inutilizados.
- **Como resolver:** Ajustar a faixa excluindo os números já utilizados e reenviar.
- **Passo a passo no ERP:** 1. No ERP, levante quais números da faixa já foram usados (autorizados/cancelados/denegados). 2. Ajuste a faixa de inutilização para conter apenas números livres. 3. Reenvie.

### 256

- **Código:** 256
- **Mensagem oficial SEFAZ:** Rejeição: Uma NF-e da faixa já está inutilizada na Base de dados da SEFAZ
- **Causa provável:** Parte da faixa solicitada já foi inutilizada anteriormente (sobreposição de faixas).
- **Como resolver:** Revisar as faixas já inutilizadas e solicitar apenas os números ainda não inutilizados.
- **Passo a passo no ERP:** 1. No histórico de inutilizações do ERP, confira as faixas já homologadas. 2. Solicite apenas a faixa ainda não inutilizada. 3. Reenvie.

### 556

- **Código:** 556
- **Mensagem oficial SEFAZ:** Rejeição: Justificativa de entrada em contingência não deve ser informada para tipo de emissão normal
- **Causa provável:** Os campos de contingência (`dhCont`/`xJust`) foram informados com `tpEmis=1` (emissão normal).
- **Como resolver:** Remover `dhCont` e `xJust` do XML quando a emissão for normal.
- **Passo a passo no ERP:** 1. Nos parâmetros fiscais do ERP, desative o modo contingência. 2. Limpe os campos de data/justificativa de contingência da NF-e. 3. Retransmita em emissão normal.

### 557

- **Código:** 557
- **Mensagem oficial SEFAZ:** Rejeição: A Justificativa de entrada em contingência deve ser informada
- **Causa provável:** NF-e em contingência (`tpEmis=2, 4, 5, 7, 9` etc.) sem informar o motivo da entrada em contingência (`xJust`, mínimo 15 caracteres).
- **Como resolver:** Informar a justificativa da contingência e reenviar.
- **Passo a passo no ERP:** 1. No ERP, com a contingência ativa, preencha a justificativa (ex.: "Problemas técnicos no link de internet") com no mínimo 15 caracteres. 2. Confira também a data/hora de entrada em contingência (`dhCont`). 3. Retransmita.

### 558

- **Código:** 558
- **Mensagem oficial SEFAZ:** Rejeição: Data de entrada em contingência posterior a data de recebimento
- **Causa provável:** A data/hora de entrada em contingência (`dhCont`) é posterior ao momento do recebimento pela SEFAZ.
- **Como resolver:** Corrigir `dhCont` para a data/hora real em que a contingência foi iniciada (sempre anterior ao envio).
- **Passo a passo no ERP:** 1. No ERP, abra a NF-e em contingência e confira a data/hora de entrada informada. 2. Corrija para o momento real em que a contingência começou. 3. Retransmita.

### 563

- **Código:** 563
- **Mensagem oficial SEFAZ:** Rejeição: Já existe pedido de Inutilização com a mesma faixa de inutilização
- **Causa provável:** Pedido de inutilização duplicado para faixa já solicitada.
- **Como resolver:** Não reenviar; consultar o protocolo do pedido anterior já homologado.
- **Passo a passo no ERP:** 1. No histórico de inutilizações do ERP, localize o pedido anterior e seu protocolo. 2. Não gere novo pedido para a mesma faixa.

### 569

- **Código:** 569
- **Mensagem oficial SEFAZ:** Rejeição: Data de entrada em contingência muito atrasada
- **Causa provável:** A `dhCont` informada está muito anterior à data de transmissão (fora do limite aceito).
- **Como resolver:** Corrigir `dhCont` para a data real de início da contingência; transmitir a NF-e em contingência dentro do prazo de 168h.
- **Passo a passo no ERP:** 1. Confira a data de entrada em contingência no ERP. 2. Corrija para a data real. 3. Transmita dentro do prazo de 168h.

### 570

- **Código:** 570
- **Mensagem oficial SEFAZ:** Rejeição: Tipo de Emissão 3, 6 ou 7 só é válido nas contingências SCAN/SVC
- **Causa provável:** `tpEmis=3` (SCAN), `6` (SVC-RS) ou `7` (SVC-AN) informado fora do contexto de ativação da respectiva contingência.
- **Como resolver:** Usar `tpEmis=1` (normal) ou a modalidade de contingência efetivamente ativa (EPEC=4, FS-DA=5 etc.).
- **Passo a passo no ERP:** 1. Nos parâmetros fiscais do ERP, confira o tipo de emissão configurado. 2. Se não há contingência ativa, volte para emissão normal (`tpEmis=1`). 3. Retransmita.

### 571

- **Código:** 571
- **Mensagem oficial SEFAZ:** Rejeição: O tpEmis informado diferente de 3 para contingência SCAN
- **Causa provável:** Inconsistência entre o tipo de emissão informado e a contingência SCAN declarada.
- **Como resolver:** Para SCAN, informar `tpEmis=3`; caso contrário, ajustar o tipo de emissão à contingência real (o SCAN está desativado — prefira emissão normal ou SVC/EPEC).
- **Passo a passo no ERP:** 1. Desative o modo SCAN no ERP (contingência desativada). 2. Use emissão normal ou a contingência vigente. 3. Retransmita.

---
## 6. Eventos (cancelamento, carta de correção)

> Regras operacionais: **cancelamento** em até 24h da autorização (algumas UFs aceitam até 480h como denúncia espontânea — cStat 151); **CC-e** (`tpEvento 110110`) em até 720h (30 dias), máx. 20 por NF-e, texto de 15 a 1.000 caracteres, e a última CC-e deve consolidar todas as anteriores. **Vedado corrigir por CC-e:** variáveis que determinam o valor do imposto (base, alíquota, quantidade, valor da operação), dados cadastrais que mudem remetente/destinatário, data de emissão/saída e número/série da NF-e.

### 101

- **Código:** 101
- **Mensagem oficial SEFAZ:** Cancelamento de NF-e homologado
- **Causa provável:** Resultado de sucesso: o evento de cancelamento foi registrado e a NF-e está cancelada.
- **Como resolver:** Nenhuma ação; guardar o protocolo do evento. O número cancelado não pode ser reutilizado.
- **Passo a passo no ERP:** 1. No monitor de eventos do ERP, confirme o cancelamento homologado e o protocolo. 2. Arquive o XML do evento vinculado à NF-e. 3. Não reutilize o número.

### 102

- **Código:** 102
- **Mensagem oficial SEFAZ:** Inutilização de número homologado
- **Causa provável:** Resultado de sucesso: a faixa de numeração foi inutilizada.
- **Como resolver:** Nenhuma ação; os números inutilizados não podem ser utilizados em novas NF-e.
- **Passo a passo no ERP:** 1. Confirme a homologação e o protocolo no ERP. 2. Ajuste o próximo número da série para pular a faixa inutilizada. 3. Arquive o protocolo.

### 128

- **Código:** 128
- **Mensagem oficial SEFAZ:** Lote de Evento Processado
- **Causa provável:** Resultado de sucesso do processamento do lote de eventos (cada evento tem seu próprio `cStat`).
- **Como resolver:** Verificar o `cStat` individual de cada evento dentro do lote.
- **Passo a passo no ERP:** 1. No monitor de eventos do ERP, abra o lote processado. 2. Confira o status individual de cada evento. 3. Trate separadamente os eventos com rejeição.

### 135

- **Código:** 135
- **Mensagem oficial SEFAZ:** Evento registrado e vinculado a NF-e
- **Causa provável:** Resultado de sucesso: o evento (cancelamento, CC-e, EPEC, manifestação etc.) foi registrado e vinculado à NF-e.
- **Como resolver:** Nenhuma ação; guardar o protocolo do evento.
- **Passo a passo no ERP:** 1. Confirme o protocolo no monitor de eventos do ERP. 2. Arquive o XML do evento.

### 136

- **Código:** 136
- **Mensagem oficial SEFAZ:** Evento registrado, mas não vinculado a NF-e
- **Causa provável:** O evento foi registrado, mas a NF-e referenciada não foi localizada na base da SEFAZ que processou o evento (ex.: evento enviado à SEFAZ errada ou NF-e ainda não autorizada).
- **Como resolver:** Confirmar a UF autorizadora e que a NF-e está autorizada; reenviar o evento ao ambiente correto se necessário.
- **Passo a passo no ERP:** 1. Confira no ERP se a NF-e está autorizada e qual a SEFAZ autorizadora. 2. Verifique o ambiente do evento (produção/homologação). 3. Reenvie o evento ao ambiente/UF corretos.

### 489

- **Código:** 489
- **Mensagem oficial SEFAZ:** Rejeição: CNPJ informado inválido (DV ou zeros)
- **Causa provável:** O CNPJ informado no evento é inválido (dígito verificador incorreto ou zerado).
- **Como resolver:** Corrigir o CNPJ do evento conforme o cadastro do emitente/autor e reenviar.
- **Passo a passo no ERP:** 1. No evento do ERP, confira o CNPJ do autor. 2. Corrija conforme o cadastro. 3. Reenvie o evento.

### 490

- **Código:** 490
- **Mensagem oficial SEFAZ:** Rejeição: CPF informado inválido (DV ou zeros)
- **Causa provável:** O CPF informado no evento é inválido (dígito verificador incorreto ou zerado).
- **Como resolver:** Corrigir o CPF do autor do evento e reenviar.
- **Passo a passo no ERP:** 1. Confira o CPF do autor do evento no ERP. 2. Corrija e reenvie.

### 491

- **Código:** 491
- **Mensagem oficial SEFAZ:** Rejeição: O tpEvento informado inválido
- **Causa provável:** O tipo de evento informado não é reconhecido.
- **Como resolver:** Utilizar o `tpEvento` correto: 110111 (cancelamento), 110110 (carta de correção), 110140 (EPEC), 210200/210210/210220/210240 (manifestação do destinatário).
- **Passo a passo no ERP:** 1. No ERP, selecione o tipo correto de evento na rotina de eventos (cancelamento, CC-e etc.). 2. Reenvie. 3. Se o erro for sistêmico, acione o suporte técnico do módulo fiscal.

### 492

- **Código:** 492
- **Mensagem oficial SEFAZ:** Rejeição: O verEvento informado inválido
- **Causa provável:** A versão do evento informada não é suportada pela SEFAZ.
- **Como resolver:** Atualizar o emissor para a versão de evento vigente e reenviar.
- **Passo a passo no ERP:** 1. Verifique se o módulo fiscal do ERP está atualizado. 2. Atualize o componente de eventos se necessário. 3. Reenvie o evento.

### 493

- **Código:** 493
- **Mensagem oficial SEFAZ:** Rejeição: Evento não atende o Schema XML específico
- **Causa provável:** O XML do evento não está conforme o schema específico do tipo de evento.
- **Como resolver:** Validar o XML contra o schema oficial do evento (disponível no Portal da NF-e) e corrigir as tags.
- **Passo a passo no ERP:** 1. Falha de montagem do XML do evento. 2. Regenere o evento pelo ERP sem edições manuais. 3. Reenvie. 4. Se persistir, acione o suporte técnico do módulo fiscal informando o código 493.

### 494

- **Código:** 494
- **Mensagem oficial SEFAZ:** Rejeição: Chave de Acesso inexistente
- **Causa provável:** A chave de acesso referenciada no evento não existe na base da SEFAZ.
- **Como resolver:** Conferir os 44 dígitos da chave e garantir que a NF-e foi autorizada antes de registrar o evento.
- **Passo a passo no ERP:** 1. Copie a chave direto do XML autorizado no ERP. 2. Confira se a NF-e está autorizada. 3. Reenvie o evento.

### 496

- **Código:** 496
- **Mensagem oficial SEFAZ:** Rejeição: NF-e não se encontra Cancelada
- **Causa provável:** O evento exige NF-e cancelada, mas a NF-e referenciada não está cancelada.
- **Como resolver:** Verificar o tipo de evento pretendido; se o objetivo era cancelar, registrar primeiro o evento de cancelamento.
- **Passo a passo no ERP:** 1. Confira o status da NF-e no monitor do ERP. 2. Se a intenção era cancelar, registre o cancelamento (110111) primeiro. 3. Depois registre o evento desejado.

### 497

- **Código:** 497
- **Mensagem oficial SEFAZ:** Rejeição: Destinatário desconhece a operação
- **Causa provável:** Inconsistência na manifestação "Desconhecimento da Operação" (ex.: já existe manifestação incompatível registrada).
- **Como resolver:** Verificar o histórico de manifestações da NF-e e registrar apenas o evento compatível com a situação real.
- **Passo a passo no ERP:** 1. Consulte no portal da SEFAZ as manifestações já registradas para a chave. 2. No ERP, registre apenas a manifestação compatível (ciência, confirmação, desconhecimento ou operação não realizada).

### 498

- **Código:** 498
- **Mensagem oficial SEFAZ:** Rejeição: Destinatário devolveu a mercadoria
- **Causa provável:** Inconsistência no evento de manifestação de devolução (evento incompatível com o estado atual da NF-e).
- **Como resolver:** Conferir as manifestações já registradas para a NF-e e enviar o evento correto conforme a operação real.
- **Passo a passo no ERP:** 1. Consulte o histórico de manifestações da chave. 2. Registre o evento de manifestação adequado à situação real.

### 501

- **Código:** 501
- **Mensagem oficial SEFAZ:** Rejeição: Prazo de Cancelamento Superior ao Previsto na Legislação
- **Causa provável:** O evento de cancelamento foi transmitido após o prazo legal (regra geral 24h da autorização; equivalente ao cStat 220 no serviço de eventos).
- **Como resolver:** Após o prazo máximo, usar o procedimento de cancelamento extemporâneo junto ao Posto Fiscal (denúncia espontânea), não via evento eletrônico.
- **Passo a passo no ERP:** 1. Confira a data/hora da autorização. 2. Se ainda dentro do limite estendido da UF (ex.: 480h), tente o cancelamento (pode retornar 151). 3. Fora do limite, oriente ao procedimento extemporâneo via Posto Fiscal.

### 572

- **Código:** 572
- **Mensagem oficial SEFAZ:** Rejeição: Erro Atributo ID do evento não corresponde a concatenação dos campos ("ID" + tpEvento + chNFe + nSeqEvento)
- **Causa provável:** O atributo `Id` do evento está malformado — deve ser exatamente "ID"+tpEvento+chave de acesso+nSeqEvento (com zeros à esquerda no sequencial).
- **Como resolver:** Corrigir a montagem do `Id` conforme a regra de concatenação e reenviar.
- **Passo a passo no ERP:** 1. Falha de montagem do XML do evento. 2. Regenere o evento pelo ERP. 3. Reenvie. 4. Se persistir, acione o suporte técnico do módulo fiscal informando o código 572.

### 573

- **Código:** 573
- **Mensagem oficial SEFAZ:** Rejeição: Duplicidade de Evento
- **Causa provável:** Já existe evento do mesmo tipo e sequência registrado para a NF-e (reenvio indevido).
- **Como resolver:** Não reenviar; consultar o evento já registrado pelo protocolo.
- **Passo a passo no ERP:** 1. No monitor de eventos do ERP, localize o evento já registrado e seu protocolo. 2. Não gere novo evento duplicado.

### 574

- **Código:** 574
- **Mensagem oficial SEFAZ:** Rejeição: O autor do evento diverge do emissor da NF-e
- **Causa provável:** Evento que deve ser gerado pelo emissor (cancelamento, CC-e, EPEC) foi assinado por certificado de CNPJ-base diferente do emitente da NF-e.
- **Como resolver:** Assinar o evento com o certificado do próprio emitente da NF-e.
- **Passo a passo no ERP:** 1. Confira o certificado configurado para eventos no ERP. 2. Use o certificado do emitente da NF-e. 3. Reenvie o evento.

### 575

- **Código:** 575
- **Mensagem oficial SEFAZ:** Rejeição: O autor do evento diverge do destinatário da NF-e
- **Causa provável:** Evento de manifestação do destinatário assinado por certificado cujo CNPJ-base não é o do destinatário da NF-e.
- **Como resolver:** Assinar a manifestação com o certificado do destinatário da NF-e.
- **Passo a passo no ERP:** 1. Para manifestações, configure no ERP o certificado do destinatário (empresa que recebeu a NF-e). 2. Reenvie a manifestação.

### 576

- **Código:** 576
- **Mensagem oficial SEFAZ:** Rejeição: O autor do evento não é um órgão autorizado a gerar o evento
- **Causa provável:** Tentativa de registrar evento restrito a órgãos autorizados (ex.: eventos do Fisco) por contribuinte sem autorização.
- **Como resolver:** Utilizar apenas os tipos de evento permitidos ao perfil do autor (emitente, destinatário ou transportador).
- **Passo a passo no ERP:** 1. Confira se o tipo de evento é permitido ao seu perfil. 2. Use apenas cancelamento, CC-e, EPEC (emitente) ou manifestação (destinatário).

### 577

- **Código:** 577
- **Mensagem oficial SEFAZ:** Rejeição: A data do evento não pode ser menor que a data de emissão da NF-e
- **Causa provável:** A data/hora do evento (`dhEvento`) é anterior à data de emissão da NF-e.
- **Como resolver:** Corrigir `dhEvento` para data/hora igual ou posterior à emissão da NF-e.
- **Passo a passo no ERP:** 1. Confira a data de emissão da NF-e e a data do evento no ERP. 2. Corrija a data do evento. 3. Reenvie.

### 578

- **Código:** 578
- **Mensagem oficial SEFAZ:** Rejeição: A data do evento não pode ser maior que a data do processamento
- **Causa provável:** A `dhEvento` é futura em relação ao relógio do servidor da SEFAZ.
- **Como resolver:** Ajustar data/hora do equipamento emissor (sincronizar com NTP) e reenviar.
- **Passo a passo no ERP:** 1. Sincronize o relógio do servidor/estação do ERP (NTP). 2. Regenere o evento com a data/hora corretas. 3. Reenvie.

### 579

- **Código:** 579
- **Mensagem oficial SEFAZ:** Rejeição: A data do evento não pode ser menor que a data de autorização para NF-e não emitida em contingência
- **Causa provável:** Para NF-e emitida em contingência, a `dhEvento` é anterior à data de autorização de uso da NF-e.
- **Como resolver:** Informar `dhEvento` igual ou posterior à autorização da NF-e.
- **Passo a passo no ERP:** 1. Confira a data de autorização da NF-e. 2. Ajuste a data do evento para igual ou posterior. 3. Reenvie.

### 580

- **Código:** 580
- **Mensagem oficial SEFAZ:** Rejeição: O evento exige uma NF-e autorizada
- **Causa provável:** Tentativa de registrar evento (cancelamento, CC-e etc.) sobre NF-e que não está autorizada (rejeitada, denegada ou inexistente).
- **Como resolver:** Autorizar a NF-e primeiro; eventos só são aceitos sobre NF-e com status autorizado.
- **Passo a passo no ERP:** 1. Confira o status da NF-e no monitor do ERP. 2. Se rejeitada, corrija e autorize primeiro. 3. Só então registre o evento.

### 587

- **Código:** 587
- **Mensagem oficial SEFAZ:** Rejeição: Usar somente o namespace padrão da NF-e
- **Causa provável:** O XML do evento utiliza namespace diferente do padrão oficial (`http://www.portalfiscal.inf.br/nfe`).
- **Como resolver:** Ajustar o gerador de XML para usar exclusivamente o namespace padrão da NF-e.
- **Passo a passo no ERP:** 1. Verifique se o módulo fiscal está atualizado. 2. Regenere o evento. 3. Se persistir, acione o suporte técnico do módulo fiscal informando o código 587.

### 588

- **Código:** 588
- **Mensagem oficial SEFAZ:** Rejeição: Não é permitida a presença de caracteres de edição no início/fim da mensagem ou entre as tags da mensagem
- **Causa provável:** O XML contém quebras de linha, espaços ou caracteres de edição onde não são permitidos (início/fim da mensagem ou entre tags).
- **Como resolver:** Remover caracteres de edição do XML do evento e reenviar.
- **Passo a passo no ERP:** 1. Regenere o evento pelo ERP sem edições manuais no XML. 2. Reenvie. 3. Se persistir, acione o suporte técnico informando o código 588.

### 594

- **Código:** 594
- **Mensagem oficial SEFAZ:** Rejeição: O número de sequencia do evento informado é maior que o permitido
- **Causa provável:** O `nSeqEvento` excede o limite do tipo de evento (ex.: CC-e permite no máximo 20 eventos por NF-e; cancelamento permite apenas 1).
- **Como resolver:** Para CC-e, consolidar as correções na última carta (a última deve conter todas as correções anteriores); não ultrapassar o sequencial permitido.
- **Passo a passo no ERP:** 1. No ERP, ao gerar nova CC-e, inclua no texto todas as correções das cartas anteriores (consolidação). 2. Respeite o limite de 20 CC-e por NF-e. 3. Reenvie.

### 595

- **Código:** 595
- **Mensagem oficial SEFAZ:** Rejeição: Obrigatória a informação da justificativa do evento.
- **Causa provável:** Evento que exige justificativa (cancelamento, EPEC etc.) foi enviado sem o texto de justificativa, ou fora do tamanho mínimo (cancelamento: mínimo 15 caracteres).
- **Como resolver:** Informar a justificativa com no mínimo 15 caracteres (máximo 255 para cancelamento) e reenviar.
- **Passo a passo no ERP:** 1. No evento do ERP, preencha a justificativa (ex.: "Operação cancelada por desacordo comercial") com 15–255 caracteres. 2. Reenvie.

### 596

- **Código:** 596
- **Mensagem oficial SEFAZ:** Rejeição: Evento apresentado fora do prazo: [prazo vigente]
- **Causa provável:** O evento foi apresentado fora do prazo regulamentar do tipo de evento (ex.: CC-e após 720h/30 dias da autorização; cancelamento após o prazo legal).
- **Como resolver:** Respeitar o prazo de cada evento: CC-e até 30 dias (720h) da autorização; cancelamento até 24h (podendo chegar a 480h como denúncia espontânea conforme a UF).
- **Passo a passo no ERP:** 1. Confira a data da autorização da NF-e. 2. Se dentro do prazo, reenvie o evento. 3. Se fora, siga o procedimento alternativo (extemporâneo via Posto Fiscal para cancelamento; para CC-e fora do prazo, não há correção eletrônica possível).

---
## 7. NFC-e específicos (modelo 65)

> Particularidades do modelo 65: QR Code obrigatório (`infNFeSupl`), CSC (Código de Segurança do Contribuinte) com `idToken`, grupo de pagamento obrigatório e limites de valor por UF. Há CSC de homologação e de produção — nunca misturar.

### 391

- **Código:** 391
- **Mensagem oficial SEFAZ:** Rejeição: Não informados os dados do cartão de crédito/débito nas Formas de Pagamento da Nota Fiscal
- **Causa provável:** Pagamento em cartão sem os dados da operação no grupo de pagamento.
- **Como resolver:** Preencher os dados do cartão (tipo de integração, credenciadora, bandeira, autorização) no grupo `pag`/`detPag` ou corrigir a integração TEF.
- **Passo a passo no ERP:** 1. No PDV/módulo de NFC-e do ERP, confira a parametrização da forma de pagamento cartão. 2. Preencha os dados da transação (NSU/autorização, bandeira). 3. Se usa TEF, valide a integração. 4. Reemitir a NFC-e.

### 394

- **Código:** 394
- **Mensagem oficial SEFAZ:** Rejeição: Nota Fiscal sem a informação do QR-Code
- **Causa provável:** XML da NFC-e sem o grupo de informações suplementares (`infNFeSupl`) com o QR Code, obrigatório no modelo 65.
- **Como resolver:** Configurar o emissor para gerar o QR Code em todas as NFC-e.
- **Passo a passo no ERP:** 1. Nos parâmetros da NFC-e no ERP, habilite a geração do QR Code. 2. Confira o CSC e o `idToken` configurados. 3. Reemitir a NFC-e.

### 395

- **Código:** 395
- **Mensagem oficial SEFAZ:** Rejeição: Endereço do site da UF da Consulta via QR Code diverge do previsto
- **Causa provável:** URL no QR Code não é a oficial da SEFAZ da UF do emitente (UF errada ou ambiente trocado).
- **Como resolver:** Atualizar a tabela de URLs do QR Code/consulta no emissor com os endereços oficiais da UF.
- **Passo a passo no ERP:** 1. Confira no ERP a URL de consulta configurada para a UF e o ambiente (produção/homologação). 2. Corrija para a URL oficial da SEFAZ da UF. 3. Reemitir a NFC-e.

### 396

- **Código:** 396
- **Mensagem oficial SEFAZ:** Rejeição: Parâmetro do QR-Code inexistente
- **Causa provável:** Falta parâmetro obrigatório na composição do QR Code.
- **Como resolver:** Revisar o leiaute de montagem do QR Code conforme o Manual de Especificações Técnicas do DANFE NFC-e e QR Code.
- **Passo a passo no ERP:** 1. Atualize o módulo de NFC-e do ERP para a versão vigente do leiaute do QR Code. 2. Reemitir a NFC-e. 3. Se persistir, acione o suporte técnico do módulo fiscal.

### 397

- **Código:** 397
- **Mensagem oficial SEFAZ:** Rejeição: Parâmetro do QR-Code divergente da Nota Fiscal
- **Causa provável:** Parâmetro do QR Code (ex.: chave de acesso) não confere com o XML.
- **Como resolver:** Corrigir a rotina de geração para usar os mesmos dados do XML.
- **Passo a passo no ERP:** 1. Não edite manualmente dados da NFC-e após a geração do QR Code. 2. Regenere a NFC-e pelo ERP. 3. Reemitir.

### 398

- **Código:** 398
- **Mensagem oficial SEFAZ:** Rejeição: Parâmetro nVersao do QR-Code difere do previsto
- **Causa provável:** Versão do leiaute do QR Code diferente da vigente.
- **Como resolver:** Atualizar o emissor para a versão atual do QR Code.
- **Passo a passo no ERP:** 1. Atualize o módulo de NFC-e do ERP. 2. Reemitir a NFC-e.

### 399

- **Código:** 399
- **Mensagem oficial SEFAZ:** Rejeição: Parâmetro de Identificação do destinatário no QR-Code para Nota Fiscal sem identificação do destinatário
- **Causa provável:** QR Code identifica destinatário, mas o XML não.
- **Como resolver:** Alinhar os dois (identificar em ambos ou em nenhum).
- **Passo a passo no ERP:** 1. No PDV, confira se o consumidor foi identificado na venda. 2. Se identificado, garanta que o XML também o identifique; se não, remova a identificação do QR Code. 3. Reemitir a NFC-e.

### 400

- **Código:** 400
- **Mensagem oficial SEFAZ:** Rejeição: Parâmetro do QR-Code não está no formato hexadecimal
- **Causa provável:** Hash do QR Code fora do formato hexadecimal.
- **Como resolver:** Corrigir a rotina de cálculo do hash (SHA-1 hexadecimal com o CSC).
- **Passo a passo no ERP:** 1. Confira o CSC e o `idToken` configurados no ERP. 2. Regenere a NFC-e. 3. Se persistir, acione o suporte técnico do módulo fiscal.

### 462

- **Código:** 462
- **Mensagem oficial SEFAZ:** Rejeição: Código Identificador do CSC no QR-Code não cadastrado na SEFAZ
- **Causa provável:** `idToken` usado não existe no cadastro da SEFAZ da UF.
- **Como resolver:** Gerar o CSC no portal da SEFAZ da UF com o e-CNPJ (há CSC de homologação e de produção) e configurar o `idToken` correto no emissor.
- **Passo a passo no ERP:** 1. Acesse o portal da SEFAZ da UF com o e-CNPJ e gere/consulte o CSC do ambiente correto (produção vs. homologação). 2. No ERP, configure o `idToken` e o CSC correspondentes ao ambiente. 3. Reemitir a NFC-e.

### 463

- **Código:** 463
- **Mensagem oficial SEFAZ:** Rejeição: Código Identificador do CSC no QR-Code foi revogado pela empresa
- **Causa provável:** CSC revogado no portal, mas o emissor usa o `idToken` antigo.
- **Como resolver:** Gerar novo CSC e atualizar o emissor.
- **Passo a passo no ERP:** 1. No portal da SEFAZ, gere um novo CSC. 2. Atualize o `idToken`/CSC nos parâmetros da NFC-e no ERP. 3. Reemitir as NFC-e.

### 464

- **Código:** 464
- **Mensagem oficial SEFAZ:** Rejeição: Código de Hash no QR-Code difere do calculado
- **Causa provável:** Hash calculado pela SEFAZ (chave + CSC) não confere — tipicamente CSC errado/em branco, `idToken` divergente ou ambiente (`tpAmb`) incorreto.
- **Como resolver:** Conferir CSC e código identificador (não em branco), usar o CSC do ambiente correto e recalcular o hash.
- **Passo a passo no ERP:** 1. Confira no ERP: CSC preenchido, `idToken` correto e ambiente (produção/homologação) alinhado ao CSC. 2. Corrija o que estiver divergente. 3. Reemitir a NFC-e.

### 703

- **Código:** 703
- **Mensagem oficial SEFAZ:** Rejeição: Data-Hora de Emissão posterior ao horário de recebimento
- **Causa provável:** `dhEmi` futura (relógio do emissor adiantado).
- **Como resolver:** Sincronizar data/hora (NTP).
- **Passo a passo no ERP:** 1. Sincronize o relógio do PDV/servidor do ERP (NTP). 2. Reemitir a NFC-e.

### 704

- **Código:** 704
- **Mensagem oficial SEFAZ:** Rejeição: NFC-e com Data-Hora de emissão atrasada
- **Causa provável:** Transmissão após o prazo limite (típico de contingência off-line não enviada até o 1º dia útil subsequente).
- **Como resolver:** Transmitir assim que cessar o problema, dentro do prazo; acertar o relógio do PDV/servidor.
- **Passo a passo no ERP:** 1. No monitor de NFC-e do ERP, identifique as notas em contingência off-line pendentes. 2. Transmita imediatamente (prazo: até o final do 1º dia útil subsequente). 3. Sincronize o relógio do PDV.

### 750

- **Código:** 750
- **Mensagem oficial SEFAZ:** Rejeição: NFC-e com valor total superior ao permitido para destinatário não identificado
- **Causa provável:** NFC-e sem identificação do consumidor acima do limite da UF (códigos relacionados: 751–nome, 752–endereço).
- **Como resolver:** Identificar o destinatário ou adequar o valor ao limite da UF.
- **Passo a passo no ERP:** 1. No PDV, identifique o consumidor (CPF) na venda. 2. Ou divida a venda para respeitar o limite da UF para não identificados. 3. Reemitir a NFC-e.

### 767

- **Código:** 767
- **Mensagem oficial SEFAZ:** Rejeição: NFC-e com somatório dos pagamentos diferente do total da Nota Fiscal
- **Causa provável:** Soma dos `vPag` diverge do `vNF`.
- **Como resolver:** Conferir meios de pagamento e valores no PDV; a soma deve fechar com o total.
- **Passo a passo no ERP:** 1. No PDV, confira os valores por meio de pagamento. 2. Ajuste para que a soma seja igual ao total da nota. 3. Reemitir a NFC-e.

### 769

- **Código:** 769
- **Mensagem oficial SEFAZ:** Rejeição: NFC-e deve possuir o grupo de Formas de Pagamento
- **Causa provável:** XML sem o grupo `pag` (obrigatório no modelo 65).
- **Como resolver:** Informar ao menos um meio de pagamento.
- **Passo a passo no ERP:** 1. No PDV, informe ao menos uma forma de pagamento na venda. 2. Confira a parametrização do grupo de pagamento no ERP. 3. Reemitir a NFC-e.

### 780

- **Código:** 780
- **Mensagem oficial SEFAZ:** Rejeição: Total da NFC-e superior ao valor limite estabelecido pela SEFAZ
- **Causa provável:** Valor acima do teto da UF para o modelo 65.
- **Como resolver:** Verificar o limite na legislação da UF; acima dele, emitir NF-e modelo 55.
- **Passo a passo no ERP:** 1. Confira o limite da UF para NFC-e. 2. Se a venda ultrapassar, emita NF-e modelo 55 em vez de NFC-e. 3. Oriente o operador do PDV sobre o limite.

### 865

- **Código:** 865
- **Mensagem oficial SEFAZ:** Rejeição: Total dos pagamentos menor que o total da nota
- **Causa provável:** Soma dos pagamentos inferior ao `vNF`.
- **Como resolver:** Completar os meios de pagamento até o total.
- **Passo a passo no ERP:** 1. No PDV, confira os pagamentos lançados. 2. Complete até o total da nota. 3. Reemitir a NFC-e.

### 866

- **Código:** 866
- **Mensagem oficial SEFAZ:** Rejeição: Ausência de troco quando o valor dos pagamentos informados for maior que o total da nota
- **Causa provável:** Pagamentos somam mais que o total sem informar `vTroco`.
- **Como resolver:** Informar o `vTroco` da diferença.
- **Passo a passo no ERP:** 1. No PDV, ao receber valor maior que o total, informe o troco. 2. Confira o campo `vTroco` no ERP. 3. Reemitir a NFC-e.

---
## 8. Denegação vs Rejeição — diferenças e tratamento

### Conceito

- **Rejeição:** a SEFAZ **não validou** o XML — o documento **não existe fiscalmente**. É um "não" técnico e corrigível: corrige-se o dado apontado pelo par `cStat`/`xMotivo` e retransmite-se, podendo manter a mesma numeração. Não gera documento fiscal nem exige escrituração.
- **Denegação (uso denegado):** o XML **passou** nas validações, mas a SEFAZ **negou a autorização** por irregularidade cadastral do emitente ou do destinatário. O documento **existe na base** com status final "denegada".

### Autorização com alerta (cStat 120) — terceiro status possível da NF-e/NFC-e

- **O que é:** A NT 2026.002 (v1.11, setembro/2026) criou um terceiro resultado de processamento da validação: 'Autorizado o uso da NF-e, com alerta' (cStat = 120), inicialmente apenas para a NFC-e (modelo 65). A nota é autorizada normalmente, e o alerta é retornado em campo específico do protocolo de autorização, para avisar emitente e/ou destinatário de que existe uma inconsistência a ser verificada — sem que ela seja motivo suficiente para provocar uma rejeição.
- **Implantação:** Ambiente de teste: 01/09/2026. Ambiente de produção: 05/10/2026.
- **Diferença prática para a rejeição:** Na rejeição, a NF-e é descartada e pode ser corrigida e retransmitida. Na autorização com alerta, a NF-e é armazenada no banco de dados da SEFAZ e NÃO precisa ser corrigida nem retransmitida para sanar o alerta. O DANFE emitido é válido.
- **O que o atendente deve orientar:** Se o cliente perguntar 'autorizou com alerta, o que eu faço?': não cancelar nem retransmitir a nota; orientar a verificar a inconsistência apontada (ex.: situação cadastral do destinatário identificado por CNPJ no momento da emissão) e, se for o caso, corrigir no cadastro para as próximas emissões. Alertas não impedem a operação.
- **Limites técnicos:** Regras de validação com efeito 'Alerta' são não-fatais (não interrompem o processamento). São retornados no máximo os 5 primeiros códigos de alerta identificados. Se alguma regra com efeito de rejeição for atingida, ela interrompe o processamento e retorna a rejeição junto com os alertas identificados até aquele momento. Se o documento for autorizado fora de prazo E contiver alertas, o código retornado é 120.
- **Base normativa:** NT 2026.002 v1.11 (09/2026), seção 2 'Autorização de Uso com Alerta'.

### Tratamento da NF-e denegada

- **Não pode** ser corrigida, cancelada nem inutilizada — status final.
- A **numeração não pode ser reutilizada** (ex.: denegada a 307, a próxima é a 308; o código 205 barra a retransmissão da mesma chave).
- Deve ser **escriturada sem valores monetários** (orientação da contabilidade).
- **Regularização:** 301 → o emitente regulariza sua IE junto à SEFAZ; 302/303 → avisar o destinatário (o emitente nada pode fazer pelo cadastro de terceiros; omitir/alterar IE de contribuinte é infração).
- **Prevenção:** consultar o destinatário no Sintegra/CCC antes de emitir.

### 110

- **Código:** 110
- **Mensagem oficial SEFAZ:** Uso Denegado
- **Causa provável:** A SEFAZ denegou o uso da NF-e por irregularidade fiscal do emitente (ver também 301).
- **Como resolver:** Regularizar a situação cadastral/fiscal do emitente junto à SEFAZ; o número da NF-e denegada não pode ser reaproveitado, cancelado ou inutilizado.
- **Passo a passo no ERP:** 1. Confirme o status "Denegada" no monitor do ERP/portal SEFAZ. 2. Não tente cancelar, inutilizar ou reutilizar o número. 3. Regularize a IE do emitente (contabilidade/SEFAZ). 4. Emita nova NF-e com o próximo número livre. 5. Escriturar a denegada sem valores, conforme a contabilidade.

### 301

- **Código:** 301
- **Mensagem oficial SEFAZ:** Uso Denegado: Irregularidade fiscal do emitente
- **Causa provável:** IE do emitente suspensa, cancelada, baixada ou em processo de baixa.
- **Como resolver:** Regularizar a IE do emitente junto à SEFAZ da UF; emitir nova NF-e com outro número após a regularização.
- **Passo a passo no ERP:** 1. Verifique a situação da IE no Sintegra/CCC. 2. Regularize com a contabilidade/SEFAZ. 3. No ERP, emita nova NF-e com o próximo número (nunca reutilize o denegado). 4. Escriturar a denegada sem valores.

### 302

- **Código:** 302
- **Mensagem oficial SEFAZ:** Uso Denegado: Irregularidade fiscal do destinatário
- **Causa provável:** Destinatário em situação irregular perante o fisco da UF de destino (IE suspensa, baixada, cancelada ou bloqueada).
- **Como resolver:** Verificar a situação cadastral do destinatário no Sintegra/CCC; se ele for não contribuinte/isento de fato, ajustar `indIEDest` (9 ou 2) em vez de informar a IE irregular. Avisar o destinatário para regularizar seu cadastro.
- **Passo a passo no ERP:** 1. Confirme a irregularidade no Sintegra da UF de destino. 2. Se o destinatário for de fato não contribuinte/isento, ajuste o `indIEDest` no cadastro do cliente no ERP. 3. Emita nova NF-e com outro número. 4. Oriente o destinatário a regularizar sua IE.

### 303

- **Código:** 303
- **Mensagem oficial SEFAZ:** Uso Denegado: Destinatário não habilitado a operar na UF
- **Causa provável:** Destinatário com CNPJ vedado/bloqueado na UF de destino.
- **Como resolver:** O emitente não pode corrigir cadastro de terceiros: avisar o destinatário e, se for o caso, reenquadrar a operação (validar com a contabilidade).
- **Passo a passo no ERP:** 1. Confirme no Sintegra/CCC a vedação na UF. 2. Comunique o destinatário. 3. Somente após a regularização dele, emita nova NF-e com outro número no ERP.

---
## Glossário

- **SEFAZ** — Secretaria de Fazenda estadual; autoriza e fiscaliza NF-e/NFC-e na UF.
- **cStat** — código numérico de status retornado pela SEFAZ (ex.: 100 autorizado).
- **xMotivo** — texto do motivo associado ao `cStat`.
- **Chave de acesso** — 44 dígitos que identificam unicamente a NF-e/NFC-e.
- **DV** — dígito verificador da chave de acesso (módulo 11).
- **DANFE** — Documento Auxiliar da NF-e; representação gráfica em papel comum, não é a nota fiscal.
- **DANFE NFC-e** — versão simplificada com QR Code para o consumidor.
- **CSC** — Código de Segurança do Contribuinte; token da SEFAZ usado no hash do QR Code (há CSC de homologação e de produção).
- **idToken** — identificador do CSC usado na NFC-e.
- **QR Code** — código 2D no DANFE NFC-e para consulta pelo consumidor.
- **EPEC** — Evento Prévio de Emissão em Contingência.
- **SVC** — SEFAZ Virtual de Contingência (ambiente backup de autorização).
- **SVC-AN / SVC-RS** — SVC do Ambiente Nacional (`tpEmis=6`) / do RS (`tpEmis=7`).
- **SCAN** — Sistema de Contingência do Ambiente Nacional (`tpEmis=3`; desativado).
- **FS-IA / FS-DA** — Formulário de Segurança para impressão do DANFE em contingência (`tpEmis=2` / `5`).
- **CC-e** — Carta de Correção eletrônica (`tpEvento 110110`); vedada para NFC-e.
- **Inutilização** — evento que comunica à SEFAZ numeração não utilizada.
- **Denegação** — negativa de uso por irregularidade fiscal; status final do documento.
- **Rejeição** — falha de validação; permite corrigir e retransmitir.
- **Autorização de Uso** — protocolo que valida juridicamente a nota (`cStat 100`).
- **Autorização de Uso com Alerta** — terceiro resultado de validação da SEFAZ (`cStat 120`, NT 2026.002); nota fiscal autorizada e válida, com inconsistência não-fatal retornada no protocolo.
- **Certificado digital ICP-Brasil** — A1/A3; assina o XML e autentica a transmissão.
- **LCR/CRL** — Lista de Certificados Revogados.
- **tpEmis** — tipo de emissão (1, 2, 4, 5, 6, 7, 9).
- **tpAmb** — ambiente: 1 produção, 2 homologação.
- **CFOP** — Código Fiscal de Operações e Prestações.
- **CST** — Código de Situação Tributária do ICMS.
- **CSOSN** — Código de Situação da Operação no Simples Nacional.
- **CRT** — Código de Regime Tributário (1 Simples Nacional, 2/3 regime normal).
- **NCM** — Nomenclatura Comum do Mercosul (8 dígitos).
- **CEST** — Código Especificador da Substituição Tributária.
- **GTIN** — identificação global do produto (ex-EAN/cEAN).
- **DIFAL** — diferencial de alíquota do ICMS em operações interestaduais (EC 87/2015).
- **FCP** — Fundo de Combate à Pobreza.
- **indIEDest** — indicador da IE do destinatário (1 contribuinte, 2 isento, 9 não contribuinte).
- **indFinal** — indicador de operação com consumidor final.
- **idDest** — indicador do destino da operação (1 interna, 2 interestadual, 3 exterior).
- **CCC** — Cadastro Centralizado de Contribuintes.
- **Sintegra** — sistema de consulta cadastral das SEFAZ.
- **RUDFTO** — livro Registro de Uso de Documentos Fiscais e Termos de Ocorrência (modelo 6).

## Fontes oficiais consultadas

- Portal Nacional da NF-e — Manual de Orientação do Contribuinte (MOC) 7.0, Anexo I: Leiaute e Regras de Validação da NF-e e da NFC-e (base das mensagens oficiais de todos os códigos; tabela de cStat 4.4.1–4.4.3)
- Portal Nacional da NF-e — MOC 7.0 Visão Geral; MOC Anexo IV (Manual de Contingência da NFC-e)
- Notas Técnicas da NF-e (NT 2009.006, NT 2015.002, NT 2016.002, NT 2018.001, NT 2018.002, NT 2018.005, NT 2019.001, NT 2020.006)
- Portais SEFAZ estaduais (MT, SP — legislação sobre EPEC, prazos de cancelamento, RUDFTO)
- CONFAZ — legislação e manuais (Ajuste SINIEF 7/05 — cancelamento e CC-e)

## Fontes técnicas de apoio (cruzamento das mensagens)

- TecnoSpeed — dicionário de dados NF-e e guias de rejeição (301, tpEmis)
- Treeunfe — referência MOC v7.00 Anexo I
- Oobj — Padrão de Integração XML NF-e
- TOTVS, Senior, Linx, Sienge — bases de conhecimento de suporte (rejeições 539, 610, 696, 229/230/232, 610/611/629)
- MarketUP, Datacaixa, SmartPOS, NFE.io, IOB, ABC71, Ivyapp, ClickNotas, NF-e Mais — tabelas de rejeições frequentes
- Tudonet, Contabeis, NetCPA, Notazz — regras de cancelamento, CC-e, denegação

> **Notas de escopo:** (1) códigos 155, 581–586 e 566 não constam nas tabelas oficiais da NF-e e foram excluídos; (2) limites de valor (628, 780, 750) e prazos de contingência off-line variam por UF — conferir a legislação da UF; (3) base MOC 7.0 — Notas Técnicas posteriores (incluindo as da Reforma Tributária) podem acrescentar códigos; validar contra o Portal Nacional da NF-e vigente.
