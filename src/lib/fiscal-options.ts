import type { ComboboxOption } from "@/components/ui/combobox";

export const CSOSN_OPTIONS: ComboboxOption[] = [
  { value: "02", label: "Tributação monofásica própria sobre combustíveis", hint: "Monofásico" },
  { value: "15", label: "Tributação monofásica própria e com responsabilidade pela retenção sobre combustíveis", hint: "Monofásico" },
  { value: "53", label: "Tributação monofásica sobre combustíveis com recolhimento diferido", hint: "Monofásico" },
  { value: "61", label: "Tributação monofásica sobre combustíveis cobrada anteriormente", hint: "Monofásico" },
  { value: "101", label: "Tributada pelo Simples Nacional com permissão de crédito" },
  { value: "102", label: "Tributada pelo Simples Nacional sem permissão de crédito" },
  { value: "103", label: "Isenção do ICMS no Simples Nacional para faixa de receita bruta" },
  { value: "201", label: "Tributada com permissão de crédito e cobrança de ICMS por ST" },
  { value: "202", label: "Tributada sem permissão de crédito e com cobrança de ICMS por ST" },
  { value: "203", label: "Isenção do ICMS no SN para faixa de receita bruta e com cobrança por ST" },
  { value: "300", label: "Imune" },
  { value: "400", label: "Não tributada pelo Simples Nacional" },
  { value: "500", label: "ICMS cobrado anteriormente por ST ou por antecipação" },
  { value: "900", label: "Outros" },
];

export const CSOSN_MEI_OPTIONS = CSOSN_OPTIONS.filter((o) =>
  ["102", "103", "300", "400", "900"].includes(o.value),
);

export const CST_ICMS_OPTIONS: ComboboxOption[] = [
  { value: "00", label: "Tributada integralmente" },
  { value: "10", label: "Tributada e com cobrança de ICMS por ST" },
  { value: "20", label: "Com redução de base de cálculo" },
  { value: "30", label: "Isenta ou não tributada e com cobrança de ICMS por ST" },
  { value: "40", label: "Isenta" },
  { value: "41", label: "Não tributada" },
  { value: "50", label: "Suspensão" },
  { value: "51", label: "Diferimento" },
  { value: "60", label: "ICMS cobrado anteriormente por ST" },
  { value: "70", label: "Com redução de BC e cobrança do ICMS por ST" },
  { value: "90", label: "Outras" },
];

export const CST_PIS_COFINS_OPTIONS: ComboboxOption[] = [
  { value: "01", label: "Operação Tributável com Alíquota Básica" },
  { value: "02", label: "Operação Tributável com Alíquota Diferenciada" },
  { value: "03", label: "Operação Tributável com Alíquota por Unidade de Medida de Produto" },
  { value: "04", label: "Operação Tributável Monofásica - Revenda a Alíquota Zero" },
  { value: "05", label: "Operação Tributável por Substituição Tributária" },
  { value: "06", label: "Operação Tributável a Alíquota Zero" },
  { value: "07", label: "Operação Isenta da Contribuição" },
  { value: "08", label: "Operação sem Incidência da Contribuição" },
  { value: "09", label: "Operação com Suspensão da Contribuição" },
  { value: "49", label: "Outras Operações de Saída" },
  { value: "99", label: "Outras Operações" },
];

export const CST_IPI_SAIDA_OPTIONS: ComboboxOption[] = [
  { value: "50", label: "Saída tributada" },
  { value: "51", label: "Saída tributável com alíquota zero" },
  { value: "52", label: "Saída isenta" },
  { value: "53", label: "Saída não-tributada" },
  { value: "54", label: "Saída imune" },
  { value: "55", label: "Saída com suspensão" },
  { value: "99", label: "Outras saídas" },
];

export const IPI_CENQ_OPTIONS: ComboboxOption[] = [
  { value: "999", label: "Outros enquadramentos" },
  { value: "001", label: "Livros, jornais, periódicos e o papel destinado à sua impressão (Imunidade)" },
  { value: "101", label: "Exportação direta" },
  { value: "301", label: "Combustíveis e lubrificantes derivados de petróleo" },
];

export const IND_IE_DEST_OPTIONS: ComboboxOption[] = [
  { value: "1", label: "1 — Contribuinte ICMS (possui Inscrição Estadual ativa)" },
  { value: "2", label: "2 — Contribuinte Isento de Inscrição Estadual" },
  { value: "9", label: "9 — Não Contribuinte (Consumidor Final, PF ou PJ sem IE)" },
];

export const CFOP_OPTIONS: ComboboxOption[] = [
  // Entrada Estadual (1xxx)
  { value: "1101", label: "Compra para industrialização ou produção rural", hint: "Entrada · Estadual" },
  { value: "1102", label: "Compra para comercialização", hint: "Entrada · Estadual" },
  { value: "1201", label: "Devolução de venda de produção do estabelecimento", hint: "Entrada · Devolução · Estadual" },
  { value: "1202", label: "Devolução de venda de mercadoria adquirida de terceiros", hint: "Entrada · Devolução · Estadual" },
  { value: "1403", label: "Compra para comercialização em operação com mercadoria sujeita a ST", hint: "Entrada · ST · Estadual" },
  { value: "1551", label: "Compra de bem para o ativo imobilizado", hint: "Entrada · Imobilizado · Estadual" },
  { value: "1556", label: "Compra de material para uso ou consumo", hint: "Entrada · Uso/Consumo · Estadual" },
  { value: "1910", label: "Entrada de bonificação, doação ou brinde", hint: "Entrada · Estadual" },
  { value: "1933", label: "Aquisição de serviço tributado pelo ISSQN", hint: "Entrada · Serviço · Estadual" },
  { value: "1949", label: "Outra entrada de mercadoria ou prestação de serviço não especificada", hint: "Entrada · Outras · Estadual" },
  // CT-e Entrada Estadual
  { value: "1352", label: "Aquisição de serviço de transporte por estabelecimento industrial", hint: "CT-e · Entrada · Estadual" },
  { value: "1353", label: "Aquisição de serviço de transporte por estabelecimento comercial", hint: "CT-e · Entrada · Estadual" },
  { value: "1357", label: "Aquisição de serviço de transporte por não contribuinte", hint: "CT-e · Entrada · Estadual" },

  // Entrada Interestadual (2xxx)
  { value: "2101", label: "Compra para industrialização ou produção rural", hint: "Entrada · Interestadual" },
  { value: "2102", label: "Compra para comercialização", hint: "Entrada · Interestadual" },
  { value: "2201", label: "Devolução de venda de produção do estabelecimento", hint: "Entrada · Devolução · Interestadual" },
  { value: "2202", label: "Devolução de venda de mercadoria adquirida de terceiros", hint: "Entrada · Devolução · Interestadual" },
  { value: "2403", label: "Compra para comercialização em operação com mercadoria sujeita a ST", hint: "Entrada · ST · Interestadual" },
  { value: "2551", label: "Compra de bem para o ativo imobilizado", hint: "Entrada · Imobilizado · Interestadual" },
  { value: "2556", label: "Compra de material para uso ou consumo", hint: "Entrada · Uso/Consumo · Interestadual" },
  { value: "2910", label: "Entrada de bonificação, doação ou brinde", hint: "Entrada · Interestadual" },
  { value: "2933", label: "Aquisição de serviço tributado pelo ISSQN", hint: "Entrada · Serviço · Interestadual" },
  { value: "2949", label: "Outra entrada de mercadoria ou prestação de serviço não especificada", hint: "Entrada · Outras · Interestadual" },
  // CT-e Entrada Interestadual
  { value: "2352", label: "Aquisição de serviço de transporte por estabelecimento industrial", hint: "CT-e · Entrada · Interestadual" },
  { value: "2353", label: "Aquisição de serviço de transporte por estabelecimento comercial", hint: "CT-e · Entrada · Interestadual" },
  { value: "2357", label: "Aquisição de serviço de transporte por não contribuinte", hint: "CT-e · Entrada · Interestadual" },

  // Saída Estadual (5xxx)
  { value: "5101", label: "Venda de produção do estabelecimento", hint: "Saída · Estadual" },
  { value: "5102", label: "Venda de mercadoria adquirida ou recebida de terceiros", hint: "Saída · Estadual" },
  { value: "5405", label: "Venda de mercadoria sujeita ao ST (substituído)", hint: "Saída · Estadual" },
  { value: "5910", label: "Remessa em bonificação, doação ou brinde", hint: "Saída · Estadual" },
  { value: "5933", label: "Prestação de serviço tributado pelo ISSQN", hint: "Saída · Estadual" },
  // CT-e Saída Estadual
  { value: "5352", label: "Prestação de serviço de transporte a estabelecimento industrial", hint: "CT-e · Saída · Estadual" },
  { value: "5353", label: "Prestação de serviço de transporte a estabelecimento comercial", hint: "CT-e · Saída · Estadual" },
  { value: "5357", label: "Prestação de serviço de transporte a não contribuinte", hint: "CT-e · Saída · Estadual · Não Contrib." },

  // Saída Interestadual (6xxx)
  { value: "6101", label: "Venda de produção do estabelecimento (Contribuinte)", hint: "Saída · Interestadual" },
  { value: "6102", label: "Venda de mercadoria adquirida de terceiros (Contribuinte)", hint: "Saída · Interestadual" },
  { value: "6107", label: "Venda de produção destinada a não contribuinte", hint: "Saída · Interestadual · Não Contrib." },
  { value: "6108", label: "Venda de mercadoria adquirida de terceiros destinada a não contribuinte", hint: "Saída · Interestadual · Não Contrib." },
  { value: "6404", label: "Venda de mercadoria sujeita ao ST (substituído)", hint: "Saída · Interestadual" },
  // CT-e Saída Interestadual
  { value: "6352", label: "Prestação de serviço de transporte a estabelecimento industrial", hint: "CT-e · Saída · Interestadual" },
  { value: "6353", label: "Prestação de serviço de transporte a estabelecimento comercial", hint: "CT-e · Saída · Interestadual" },
  { value: "6357", label: "Prestação de serviço de transporte a não contribuinte", hint: "CT-e · Saída · Interestadual · Não Contrib." },
];

export const CST_CBS_IBS_OPTIONS: ComboboxOption[] = [
  { value: "000", label: "Tributação integral" },
  { value: "010", label: "Tributação com redução de alíquota" },
  { value: "020", label: "Diferimento" },
  { value: "030", label: "Redução de 100% da alíquota" },
  { value: "040", label: "Imunidade" },
  { value: "050", label: "Isenção" },
  { value: "060", label: "Suspensão" },
  { value: "200", label: "Não incidência" },
  { value: "555", label: "Operação não tributada" },
];

export const C_CLASS_TRIB_OPTIONS: ComboboxOption[] = [
  { value: "000001", label: "000001 — Situações tributadas integralmente pelo IBS e CBS" },
  { value: "010001", label: "010001 — Operações do FGTS não realizadas pela Caixa Econômica Federal (art. 212 da LC 214/2025)" },
  { value: "011003", label: "011003 — Intermediação de planos de assistência à saúde (art. 240 da LC 214/2025)" },
  { value: "200001", label: "200001 — Aquisições de máquinas, aparelhos, instrumentos e matérias-primas em ZPE (art. 103 da LC 214/2025)" },
  { value: "200004", label: "200004 — Venda de dispositivos médicos NCM/SH do Anexo XII (art. 144 da LC 214/2025)" },
  { value: "200005", label: "200005 — Venda de dispositivos médicos Anexo IV adquiridos pela administração pública (art. 144 da LC 214/2025)" },
  { value: "200006", label: "200006 — Situação de emergência de saúde pública reconhecida pelo Poder Legislativo (LC 214/2025)" },
  { value: "200007", label: "200007 — Fornecimento de dispositivos de acessibilidade PCD do Anexo XIII (art. 145 da LC 214/2025)" },
  { value: "200008", label: "200008 — Fornecimento de dispositivos de acessibilidade PCD Anexo V para administração pública (LC 214/2025)" },
  { value: "200016", label: "200016 — Prestação de serviços de P&D por ICT sem fins lucrativos (art. 156 da LC 214/2025)" },
  { value: "200017", label: "200017 — Operações relacionadas ao FGTS realizadas pelo Conselho Curador/Secretaria Executiva (art. 212 da LC 214/2025)" },
  { value: "200020", label: "200020 — Operações de sociedades cooperativas optantes por regime específico (art. 271 da LC 214/2025)" },
  { value: "200021", label: "200021 — Serviços de transporte público coletivo de passageiros ferroviário e hidroviário (art. 285 da LC 214/2025)" },
  { value: "200025", label: "200025 — Serviços de educação relacionados ao Prouni (art. 308 da LC 214/2025)" },
  { value: "200026", label: "200026 — Locação de imóveis em zonas reabilitadas / recuperação urbanística (LC 214/2025)" },
  { value: "200027", label: "200027 — Operações de locação, cessão onerosa e arrendamento de bens imóveis (art. 261 da LC 214/2025)" },
  { value: "200028", label: "200028 — Serviços de educação relacionados no Anexo II - NBS (art. 129 da LC 214/2025)" },
  { value: "200029", label: "200029 — Serviços de saúde humana relacionados no Anexo III - NBS (art. 130 da LC 214/2025)" },
  { value: "200030", label: "200030 — Venda dos dispositivos médicos relacionados no Anexo IV - NCM/SH (art. 131 da LC 214/2025)" },
  { value: "200031", label: "200031 — Dispositivos de acessibilidade PCD relacionados no Anexo V - NCM/SH (art. 132 da LC 214/2025)" },
  { value: "200037", label: "200037 — Serviços ambientais de conservação ou recuperação da vegetação nativa (art. 137 da LC 214/2025)" },
  { value: "200038", label: "200038 — Insumos agropecuários e aquícolas relacionados no Anexo IX - NCM/SH e NBS (art. 138 da LC 214/2025)" },
  { value: "200039", label: "200039 — Serviços, licenciamento ou cessão de direitos culturais, artísticos e eventos - Anexo X NBS (LC 214/2025)" },
  { value: "200040", label: "200040 — Serviços de comunicação institucional à administração pública direta, autarquias e fundações (LC 214/2025)" },
  { value: "200041", label: "200041 — Serviços de educação desportiva (código 1.2205.12.00 da NBS, art. 141 da LC 214/2025)" },
  { value: "200042", label: "200042 — Segurança da informação e segurança cibernética (art. 141 da LC 214/2025)" },
  { value: "200043", label: "200043 — Bens e serviços de soberania e segurança nacional para administração pública - Anexo XI (LC 214/2025)" },
  { value: "200044", label: "200044 — Segurança da informação e cibernética por sociedade com sócio brasileiro mínimo 20% - Anexo XI (LC 214/2025)" },
  { value: "200045", label: "200045 — Projetos de reabilitação urbana de zonas históricas e recuperação urbanística (art. 158 da LC 214/2025)" },
  { value: "200046", label: "200046 — Operações com bens imóveis (art. 261 da LC 214/2025)" },
  { value: "200048", label: "200048 — Hotelaria, Parques de Diversão e Parques Temáticos (art. 281 da LC 214/2025)" },
  { value: "200051", label: "200051 — Agências de Turismo (art. 289 da LC 214/2025)" },
  { value: "200052", label: "200052 — Serviços de profissões intelectuais científicas, literárias ou artísticas fiscalizadas por conselho (LC 214/2025)" },
  { value: "221001", label: "221001 — Locação, cessão onerosa ou arrendamento de bem imóvel sobre receita bruta (art. 487 da LC 214/2025)" },
  { value: "400001", label: "400001 — Transporte público coletivo rodoviário e metroviário sob concessão pública (art. 157 da LC 214/2025)" },
  { value: "410001", label: "410001 — Bonificações constantes em documento fiscal sem evento posterior (art. 5º da LC 214/2025)" },
  { value: "410003", label: "410003 — Doações que não tenham permitido apropriação de créditos pelo doador (art. 6º da LC 214/2025)" },
  { value: "410004", label: "410004 — Exportações de bens e serviços (art. 8º da LC 214/2025)" },
  { value: "410005", label: "410005 — Fornecimentos realizados pela União, Estados, DF e Municípios (art. 9º da LC 214/2025)" },
  { value: "410006", label: "410006 — Entidades religiosas e templos de qualquer culto (art. 9º da LC 214/2025)" },
  { value: "410007", label: "410007 — Partidos políticos, entidades sindicais e instituições de assistência/educação sem fins lucrativos (LC 214/2025)" },
  { value: "410008", label: "410008 — Livros, jornais, periódicos e papel destinado à sua impressão (art. 9º da LC 214/2025)" },
  { value: "410009", label: "410009 — Fonogramas e videofonogramas musicais de autores/artistas brasileiros (art. 9º da LC 214/2025)" },
  { value: "410010", label: "410010 — Radiodifusão sonora e de sons e imagens de recepção livre e gratuita (art. 9º da LC 214/2025)" },
  { value: "410012", label: "410012 — Condomínio edilício não optante pelo regime regular (art. 26 da LC 214/2025)" },
  { value: "410014", label: "410014 — Produtor rural não contribuinte (art. 164 da LC 214/2025)" },
  { value: "410015", label: "410015 — Transportador autônomo não contribuinte (art. 169 da LC 214/2025)" },
  { value: "410026", label: "410026 — Doações sem contraprestação com anulação de crédito (art. 6º da LC 214/2025)" },
  { value: "410027", label: "410027 — Exportação de serviço ou de bem imaterial" },
  { value: "410028", label: "410028 — Operações com bens imóveis realizadas por pessoas físicas não contribuintes" },
  { value: "410035", label: "410035 — Fornecimento realizado por nanoempreendedor" },
  { value: "410999", label: "410999 — Operações não onerosas sem previsão de tributação (art. 4º da LC 214/2025)" },
  { value: "515001", label: "515001 — Diferimento em insumos agropecuários e aquícolas a produtor não contribuinte (art. 138 da LC 214/2025)" },
  { value: "550016", label: "550016 — Regime Especial de Incentivos para Desenvolvimento da Infraestrutura - Reidi (art. 106 da LC 214/2025)" },
  { value: "800001", label: "800001 — Fusão, cisão ou incorporação (art. 55 da LC 214/2025)" },
  { value: "800002", label: "800002 — Transferência de crédito do associado para cooperativa de que participa (art. 272 da LC 214/2025)" },
  { value: "811001", label: "811001 — Anulação de crédito proporcional a operações imunes e isentas (art. 51 da LC 214/2025)" },
  { value: "811002", label: "811002 — Débitos de notas fiscais não processadas na apuração (art. 45 da LC 214/2025)" },
  { value: "811003", label: "811003 — Débitos apurados após desenquadramento do Simples Nacional (art. 41 da LC 214/2025)" },
  { value: "820001", label: "820001 — Serviços de planos de assistência à saúde com tributação por outro meio (art. 235 da LC 214/2025)" },
  { value: "820002", label: "820002 — Serviços de planos de assistência funerária com tributação por outro meio (art. 236 da LC 214/2025)" },
  { value: "820003", label: "820003 — Assistência à saúde de animais domésticos com tributação por outro meio (art. 243 da LC 214/2025)" },
  { value: "820004", label: "820004 — Concursos de prognósticos com tributação realizada por outro meio (art. 248 da LC 214/2025)" },
  { value: "820006", label: "820006 — Serviços de exploração de via com tributação realizada por outro meio (art. 11 da LC 214/2025)" },
  { value: "820007", label: "820007 — Serviços financeiros com tributação realizada por outro meio" },
];

export const CREDITO_PRESUMIDO_LC214_OPTIONS = [
  {
    id: "1 - Aquisição de bens e serviços de produtor rural e produtor rural integrado não contribuinte, observado o art. 168 da Lei Complementar nº 214, de 2025.",
    label: "1 - Aquisição de bens e serviços de produtor rural e produtor rural integrado não contribuinte, observado o art. 168 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "2 - Aquisição de serviço de transportador autônomo de carga pessoa física não contribuinte, observado o art. 169 da Lei Complementar nº 214, de 2025.",
    label: "2 - Aquisição de serviço de transportador autônomo de carga pessoa física não contribuinte, observado o art. 169 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "3 - Aquisição de resíduos e demais materiais destinados à reciclagem, reutilização ou logística reversa adquiridos de pessoa física, cooperativa ou outra forma de organização popular, observado o art. 170 da Lei Complementar nº 214, de 2025.",
    label: "3 - Aquisição de resíduos e demais materiais destinados à reciclagem, reutilização ou logística reversa adquiridos de pessoa física, cooperativa ou outra forma de organização popular, observado o art. 170 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "4 - Aquisição de bens móveis usados de pessoa física não contribuinte para revenda, observado o art. 171 da Lei Complementar nº 214, de 2025.",
    label: "4 - Aquisição de bens móveis usados de pessoa física não contribuinte para revenda, observado o art. 171 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "5 - Regime automotivo, observado o art. 310 da Lei Complementar nº 214, de 2025.",
    label: "5 - Regime automotivo, observado o art. 310 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "6 - Regime automotivo, observado o art. 311 da Lei Complementar nº 214, de 2025.",
    label: "6 - Regime automotivo, observado o art. 311 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "7 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 444 da Lei Complementar nº 214, de 2025.",
    label: "7 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 444 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "8 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
    label: "8 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "9 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
    label: "9 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "10 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 450 da Lei Complementar nº 214, de 2025.",
    label: "10 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 450 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "11 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 462 da Lei Complementar nº 214, de 2025.",
    label: "11 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 462 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "12 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 465 da Lei Complementar nº 214, de 2025.",
    label: "12 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 465 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "13 - Aquisição pela indústria na Área de Livre Comércio, observado o art. 467 da Lei Complementar nº 214, de 2025.",
    label: "13 - Aquisição pela indústria na Área de Livre Comércio, observado o art. 467 da Lei Complementar nº 214, de 2025.",
  },
];
