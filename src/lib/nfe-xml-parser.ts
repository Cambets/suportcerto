import { XMLParser } from "fast-xml-parser";

export type NfeXmlExtract = {
  empresa: {
    razao_social?: string;
    cnpj_cpf?: string;
    inscricao_estadual?: string;
    inscricao_municipal?: string;
    cnae_principal?: string;
  };
  nfe: {
    serie_nfe?: string;
    ultima_nfe?: string;
    cfop_estadual?: string;
    cfop_interestadual?: string;
    // ICMS
    origem_mercadoria?: string;
    ind_ie_dest?: string;
    csosn?: string;
    csosn_nao_contrib?: string;
    cst_icms_contrib?: string;
    cst_icms_nao_contrib?: string;
    mod_bc_icms?: string;
    valor_bc_icms?: string;
    aliquota_icms?: string;
    valor_icms?: string;
    // ST
    substituicao_tributaria?: boolean;
    valor_icms_st?: string;
    // IPI
    usa_ipi?: boolean;
    cst_ipi?: string;
    ipi_cenq?: string;
    aliquota_ipi?: string;
    // PIS / COFINS
    cst_pis?: string;
    vbc_pis?: string;
    aliquota_pis?: string;
    cst_cofins?: string;
    vbc_cofins?: string;
    aliquota_cofins?: string;
    // Regime
    regime?: "simples" | "mei" | "normal";
  };
  raw: {
    ncm?: string;
    cfop?: string;
    emit_uf?: string;
    dest_uf?: string;
  };
};

function s(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const str = String(v).trim();
  return str === "" ? undefined : str;
}

function num(v: unknown): string | undefined {
  const str = s(v);
  if (!str) return undefined;
  const n = Number(str);
  if (!Number.isFinite(n)) return str;
  return String(Number(n.toFixed(4)));
}

function firstChild<T = any>(node: any): T | undefined {
  if (!node || typeof node !== "object") return undefined;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v && typeof v === "object") return v as T;
  }
  return undefined;
}

// Procura recursivamente por uma chave em qualquer profundidade do objeto.
function deepFind(node: any, key: string): unknown {
  if (!node || typeof node !== "object") return undefined;
  if (key in node) return (node as any)[key];
  for (const k of Object.keys(node)) {
    const found = deepFind((node as any)[k], key);
    if (found !== undefined) return found;
  }
  return undefined;
}

export async function parseNfeXml(file: File): Promise<NfeXmlExtract | null> {
  const text = await file.text();
  if (!/<\s*(nfeProc|NFe|infNFe)/i.test(text)) return null;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });
  const json = parser.parse(text);
  const infNFe =
    json?.nfeProc?.NFe?.infNFe ??
    json?.NFe?.infNFe ??
    json?.infNFe;
  if (!infNFe) return null;

  const ide = infNFe.ide ?? {};
  const emit = infNFe.emit ?? {};
  const dest = infNFe.dest ?? {};
  const detRaw = infNFe.det;
  const det = Array.isArray(detRaw) ? detRaw[0] : detRaw;
  const prod = det?.prod ?? {};
  const imposto = det?.imposto ?? {};

  const icmsBlock = firstChild<any>(imposto.ICMS);
  const ipiBlock = firstChild<any>(imposto.IPI);
  const pisBlock = firstChild<any>(imposto.PIS);
  const cofinsBlock = firstChild<any>(imposto.COFINS);

  const crt = s(emit.CRT);
  const regime: "simples" | "mei" | "normal" | undefined =
    crt === "1" || crt === "2" ? "simples" : crt === "4" ? "mei" : crt === "3" ? "normal" : undefined;

  const cfop = s(prod.CFOP);
  const emitUF = s(emit?.enderEmit?.UF);
  const destUF = s(dest?.enderDest?.UF);
  const sameUF = emitUF && destUF && emitUF === destUF;

  // Detecta Substituição Tributária por qualquer indicador no bloco ICMS
  // (vICMSST, pICMSST, vBCST, modBCST) ou tags ICMSST/ICMSSTRet.
  const hasST =
    deepFind(imposto.ICMS, "vICMSST") !== undefined ||
    deepFind(imposto.ICMS, "vBCST") !== undefined ||
    deepFind(imposto.ICMS, "pICMSST") !== undefined ||
    !!(imposto.ICMS && (imposto.ICMS.ICMSST || imposto.ICMS.ICMSSTRet));

  const vICMSST = num(deepFind(imposto.ICMS, "vICMSST"));

  return {
    empresa: {
      razao_social: s(emit.xNome),
      cnpj_cpf: s(emit.CNPJ) ?? s(emit.CPF),
      inscricao_estadual: s(emit.IE),
      inscricao_municipal: s(emit.IM),
      cnae_principal: s(emit.CNAE),
    },
    nfe: {
      serie_nfe: s(ide.serie),
      ultima_nfe: s(ide.nNF),
      cfop_estadual: sameUF ? cfop : undefined,
      cfop_interestadual: sameUF === false ? cfop : undefined,
      // ICMS
      origem_mercadoria: s(icmsBlock?.orig),
      ind_ie_dest: s(dest.indIEDest),
      csosn: s(dest.indIEDest) !== "9" ? s(icmsBlock?.CSOSN) : undefined,
      csosn_nao_contrib: s(dest.indIEDest) === "9" ? s(icmsBlock?.CSOSN) : undefined,
      cst_icms_contrib: s(dest.indIEDest) !== "9" ? s(icmsBlock?.CST) : undefined,
      cst_icms_nao_contrib: s(dest.indIEDest) === "9" ? s(icmsBlock?.CST) : undefined,
      mod_bc_icms: s(icmsBlock?.modBC),
      valor_bc_icms: num(icmsBlock?.vBC),
      aliquota_icms: num(icmsBlock?.pICMS),
      valor_icms: num(icmsBlock?.vICMS),
      // ST
      substituicao_tributaria: hasST ? true : undefined,
      valor_icms_st: vICMSST,
      // IPI (silencioso quando ausente — comum no Simples)
      usa_ipi: ipiBlock?.pIPI !== undefined || ipiBlock?.CST !== undefined ? true : undefined,
      cst_ipi: s(ipiBlock?.CST),
      ipi_cenq: s(imposto?.IPI?.cEnq) ?? s(ipiBlock?.cEnq),
      aliquota_ipi: num(ipiBlock?.pIPI),
      // PIS
      cst_pis: s(pisBlock?.CST),
      vbc_pis: num(pisBlock?.vBC),
      aliquota_pis: num(pisBlock?.pPIS),
      // COFINS
      cst_cofins: s(cofinsBlock?.CST),
      vbc_cofins: num(cofinsBlock?.vBC),
      aliquota_cofins: num(cofinsBlock?.pCOFINS),
      regime,
    },
    raw: {
      ncm: s(prod.NCM),
      cfop,
      emit_uf: emitUF,
      dest_uf: destUF,
    },
  };
}
