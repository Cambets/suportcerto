export async function fetchViabilidadeMarca(nomeMarca: string, classe?: string) {
  const token = process.env.INFOSIMPLES_TOKEN;
  
  if (!token) {
    console.error("ERRO: INFOSIMPLES_TOKEN não definido no ambiente.");
    throw new Error("INFOSIMPLES_TOKEN não configurado no servidor.");
  }

  if (!nomeMarca || nomeMarca.trim() === "") {
    console.error("ERRO: nomeMarca está vazio ou undefined.");
    throw new Error("O nome da marca é obrigatório.");
  }

  try {
    const baseUrl = "https://api.infosimples.com/api/v2/consultas/inpi/marcas";
    
    const params: any = {
      token: "TOKEN_OCULTO",
      marca: nomeMarca
    };

    if (classe) {
      params.ncl = classe;
    }

    let fullUrl = `${baseUrl}?token=${token}&marca=${encodeURIComponent(nomeMarca)}`;
    
    if (classe) {
      fullUrl += `&ncl=${encodeURIComponent(classe)}`;
    }
    
    console.log("--- DEBUG INFOSIMPLES (AUTO) ---");
    console.log("URL COMPLETA ENVIADA:", fullUrl.replace(token, "TOKEN_OCULTO"));
    console.log("-------------------------");

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    const parseBody = async () => {
      const text = await response.text();
      try { return JSON.parse(text); } catch { return { message: text }; }
    };

    if (!response.ok) {
      const errorData: any = await parseBody();
      // Erro 612 = Dados não encontrados → marca 100% disponível (estado verde)
      if (errorData?.code === 612 || errorData?.code_message?.includes?.("não encontrado")) {
        console.log("[INPI] Código 612 — marca disponível (estado verde).");
        return { code: 200, code_message: "Marca disponível", data: [] };
      }
      throw new Error(errorData.errors?.[0] || errorData.code_message || errorData.message || `Erro na API Infosimples: ${response.status}`);
    }

    const result = await response.json();
    // Mesmo com HTTP 200, Infosimples pode sinalizar 612 no corpo
    if (result?.code === 612) {
      console.log("[INPI] Código 612 no corpo — marca disponível (estado verde).");
      return { code: 200, code_message: "Marca disponível", data: [] };
    }
    return result;

  } catch (error: any) {
    console.error("ERRO EXCEÇÃO INFOSIMPLES (AUTO):", error);
    throw error;
  }
}
