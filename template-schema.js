/**
 * Estrutura Oficial do Formulário de Perícia Socioeconômica (BPC/LOAS)
 * Tribunal: Poder Judiciário / Justiça Federal / Seção Judiciária do Amapá
 * Anexo IV - Peritos Assistentes Sociais
 */

const DEFAULT_FORM_DATA = {
  // Identificação do Tribunal e Perícia Oficial
  cabecalho: {
    tribunal: "PODER JUDICIÁRIO\nJUSTIÇA FEDERAL\nSEÇÃO JUDICIÁRIA DO AMAPÁ\nCOORDENAÇÃO DOS JUIZADOS ESPECIAIS FEDERAIS\nPORTARIA COJEF/NUCOD/AP Nº 01 de 10/02/2015\nANEXO IV - PERITOS ASSISTENTES SOCIAIS",
    anexo: "ANEXO IV - PERITOS ASSISTENTES SOCIAIS",
    titulo: "PERÍCIA SOCIOECONÔMICA",
    rodape: "Rodovia Norte Sul, s/n – Bairro Infraero II, CEP. 68908-911 - Macapá-AP, site: portal.trf1.jus.br/sjap. Fones: 3251-5507"
  },

  // 1. Dados Gerais e Identificação
  identificacao: {
    processo: "",
    periciado: "",
    representanteLegal: "",
    cpf: "",
    rg: "",
    codF: "",
    dataNascimento: "",
    sexo: "M", // "M" ou "F"
    objeto: "Benefício de Prestação Continuada - BPC",
    objetoOutro: "",
    escolaridade: "",
    profissaoAnterior: "",
    profissaoAtual: "",
    nis: "",
    estadoCivil: "",
    naturalidade: "",
    endereco: "",
    telefone: ""
  },

  // 2. Situação Pessoal
  situacaoPessoal: {
    idadeTrabalhar: "Sim", // "Sim" ou "Não"
    idadeTrabalharQual: "",
    cursosProfissionalizantes: "Não",
    cursosQual: "",
    jaExerceuAtividade: "Sim",
    jaExerceuQual: "",
    teveCtpsAssinada: "Não",
    teveCtpsDetalhes: "",
    historicoCtps: []
  },

  // 3. Situação Familiar e Renda dos Integrantes
  familia: [],
  carteiraAssinadaFamilia: "Nenhum membro da família possui CTPS assinada atualmente.",
  carteiraAssinadaQtd: 0,
  rendaTotalFamilia: 0,
  rendaPerCapita: 0,
  rendaObservacao: "",

  // 4. Situação de Moradia
  moradia: {
    tipo: "Casa", // Casa, Apartamento, Abrigo/Asilo, Outro
    tipoOutro: "",
    construcao: "", // alvenaria, madeira, mista
    cobertura: "", // telha de amianto, telha de barro, zinco
    comodos: "",
    comodosDescricao: "",
    zona: "", // urbana, rural
    acesso: "", // fácil, difícil
    tempoResidencia: "",
    regimeImovel: "", // Próprio, Alugado, Cedido/De terceiro
    proprietarioImovel: "",
    caraterResidencia: "Habitual", // Habitual, Temporária

    // Infraestrutura
    agua: "",
    esgoto: "",
    energia: "",
    rua: "",
    piso: "",

    // Bens
    bensTextoPadrao: "O conjunto de bens descritos a seguir demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade econômica. Nenhum bem de alto valor comercial foi encontrado.",
    bensListagem: ""
  },

  // 5. Despesas Mensais Gerais
  despesas: {
    habitacao: 0,
    habitacaoObs: "",
    energia: 0,
    energiaObs: "",
    agua: 0,
    aguaObs: "",
    alimentacao: 0,
    alimentacaoObs: "",
    transporte: 0,
    transporteObs: "",
    saude: 0,
    saudeObs: ""
  },

  // 6. Conclusão e Parecer Técnico
  conclusao: {
    dataVisita: "",
    nomeEntrevistado: "",
    fonteRendaDescricao: "",
    rendaTotalExtenso: "",
    vulnerabilidadeEconomicaSevera: true,
    necessidadeTratamentoContinuo: true,
    naoDispoeMeiosProprios: true,
    rendaAtendeCriterioLoas: true,
    parecerFavoravel: true, // true = POSSUI amparo, false = NÃO POSSUI
    textoEstudoSocial: "",
    textoDificuldades: "",
    textoParecerComplementar: ""
  },

  // 7. Classificação da Perícia
  classificacao: {
    complexidade: 1, // 1 a 3
    risco: 1,
    distancia: 1,
    dificuldadeAcesso: 1,
    riscoSocial: 1,
    justificativa: ""
  },

  // 8. Encerramento
  encerramento: {
    municipio: "Macapá",
    uf: "AP",
    dataPericia: "",
    horaPericia: "",
    nomePerito: "Assistente Social Perito(a) Judicial",
    cargoPerito: "Doutora em Serviço Social",
    cress: "CRESS 104 24ª Região-AP"
  },

  // 9. Anexos Oficiais (Fotografias da Visita e Documentos Comprobatórios)
  anexos: []
};

/**
 * SALÁRIO MÍNIMO DE REFERÊNCIA NACIONAL
 * Vigência atual (2025/2026): R$ 1.518,00
 * 1/4 Salário Mínimo (Critério Objetivo LOAS): R$ 379,50
 * 1/2 Salário Mínimo (Critério Jurisprudencial STF / Tema 27): R$ 759,00
 */
const SALARIO_MINIMO_PADRAO = 1518.00;

/**
 * Função utilitária para cálculo de Renda Per Capita e Checklist de Elegibilidade BPC/LOAS
 * Conforme Art. 20 da LOAS (Lei nº 8.742/93), Art. 20-B (Lei 14.176/21) e Jurisprudência do STF (RE 567.985 / Tema 27)
 */
function calcularRendaPerCapita(membrosFamilia, salarioMinimo = SALARIO_MINIMO_PADRAO, despesasDedutiveis = 0) {
  let totalMembros = 1;
  let rendaBruta = 0;

  if (Array.isArray(membrosFamilia) && membrosFamilia.length > 0) {
    totalMembros = membrosFamilia.length;
    rendaBruta = membrosFamilia.reduce((acc, curr) => {
      const val = typeof curr.rendaMensal === "number" ? curr.rendaMensal : parseFloat(String(curr.rendaMensal).replace(/[^\d.-]/g, "")) || 0;
      return acc + val;
    }, 0);
  } else if (typeof membrosFamilia === "number") {
    totalMembros = Math.max(1, parseInt(membrosFamilia) || 1);
  }

  const sm = typeof salarioMinimo === "number" && salarioMinimo > 0 ? salarioMinimo : SALARIO_MINIMO_PADRAO;
  const deducao = typeof despesasDedutiveis === "number" ? Math.max(0, despesasDedutiveis) : 0;
  const rendaLiquidaTotal = Math.max(0, rendaBruta - deducao);

  const rendaPerCapitaBruta = totalMembros > 0 ? (rendaBruta / totalMembros) : 0;
  const rendaPerCapitaLiquida = totalMembros > 0 ? (rendaLiquidaTotal / totalMembros) : 0;
  
  const limiteUmQuarto = sm / 4; // R$ 379,50
  const limiteMeio = sm / 2;     // R$ 759,00

  // Análise de Conformidade com o STF
  let statusSTF = "CONFORME_OBJETIVO";
  let tituloAlerta = "CONFORME CRITÉRIO LEGAL OBJETIVO (≤ 1/4 SM)";
  let nivelAlerta = "verde"; // verde, amarelo, vermelho
  let textoParecer = "";
  let resumoFundamentacao = "";

  if (rendaPerCapitaLiquida <= limiteUmQuarto) {
    statusSTF = "CONFORME_OBJETIVO";
    tituloAlerta = "CONFORME CRITÉRIO OBJETIVO DA LOAS (≤ 1/4 SM)";
    nivelAlerta = "verde";
    resumoFundamentacao = `Renda per capita de R$ ${rendaPerCapitaLiquida.toFixed(2)} atende diretamente ao critério objetivo previsto no art. 20, § 3º da Lei nº 8.742/93 (inferior a 1/4 do salário mínimo = R$ ${limiteUmQuarto.toFixed(2)}), havendo presunção legal absoluta de miserabilidade social.`;
    textoParecer = `A renda familiar per capita mensal apurada é de R$ ${rendaPerCapitaLiquida.toFixed(2)}, valor que se enquadra perfeitamente no limite objetivo de 1/4 do salário mínimo vigente (R$ ${limiteUmQuarto.toFixed(2)}), preenchendo de forma inequívoca o requisito socioeconômico da LOAS.`;
  } else if (rendaPerCapitaLiquida <= limiteMeio) {
    statusSTF = "ELEGIVEL_STF";
    tituloAlerta = "ELEGÍVEL POR CRITÉRIO JURISPRUDENCIAL DO STF (TEMA 27)";
    nivelAlerta = "amarelo";
    resumoFundamentacao = `Renda per capita de R$ ${rendaPerCapitaLiquida.toFixed(2)} supera o teto estrito de 1/4 SM (R$ ${limiteUmQuarto.toFixed(2)}), porém situa-se abaixo de 1/2 SM (R$ ${limiteMeio.toFixed(2)}). O Supremo Tribunal Federal (RE 567.985/MT - Tema 27) declarou a inconstitucionalidade parcial do critério absoluto de 1/4 SM, autorizando a concessão judicial quando o Estudo Social comprovar vulnerabilidade e despesas contínuas com saúde.`;
    textoParecer = `Embora a renda per capita de R$ ${rendaPerCapitaLiquida.toFixed(2)} ultrapasse o patamar legal de 1/4 do salário mínimo, incide na espécie o entendimento vinculante do STF no RE 567.985/MT (Tema 27), que flexibilizou a aferição da hipossuficiência econômica. A precariedade habitacional, a ausência de patrimônio e a necessidade de gastos indispensáveis com a sobrevivência comprovam a miserabilidade fática no caso concreto.`;
  } else {
    statusSTF = "EXCEDE_CONVENCIONAL";
    tituloAlerta = "RENDA SUPERA 1/2 SM - REQUER COMPROVAÇÃO DE DEDUÇÕES GRAVES";
    nivelAlerta = "vermelho";
    resumoFundamentacao = `Renda per capita de R$ ${rendaPerCapitaLiquida.toFixed(2)} supera o limite jurisprudencial de 1/2 SM (R$ ${limiteMeio.toFixed(2)}). A concessão judicial é cabível mediante demonstração contábil de despesas médicas e tratamentos de alto custo (Art. 20-B da LOAS e Súmula 79 da TNU) que reduzam a renda disponível ao mínimo existencial.`;
    textoParecer = `A renda per capita calculada é de R$ ${rendaPerCapitaLiquida.toFixed(2)}. Para fins de enquadramento jurisprudencial, faz-se necessária a dedução pormenorizada de despesas médicas, medicamentos não fornecidos pelo SUS, fraldas e tratamentos contínuos indispensáveis, mitigando a renda disponível do núcleo familiar.`;
  }

  return {
    totalMembros,
    rendaBruta: Number(rendaBruta.toFixed(2)),
    despesasDedutiveis: Number(deducao.toFixed(2)),
    rendaTotal: Number(rendaLiquidaTotal.toFixed(2)),
    rendaPerCapita: Number(rendaPerCapitaLiquida.toFixed(2)),
    rendaPerCapitaBruta: Number(rendaPerCapitaBruta.toFixed(2)),
    salarioMinimo: Number(sm.toFixed(2)),
    limiteUmQuartoSM: Number(limiteUmQuarto.toFixed(2)),
    limiteMeioSM: Number(limiteMeio.toFixed(2)),
    atendeCriterioObjetivo: rendaPerCapitaLiquida <= limiteUmQuarto,
    elegivelSTF: rendaPerCapitaLiquida <= limiteMeio,
    statusSTF,
    tituloAlerta,
    nivelAlerta,
    resumoFundamentacao,
    textoParecer
  };
}

if (typeof globalThis !== "undefined") {
  globalThis.DEFAULT_FORM_DATA = DEFAULT_FORM_DATA;
  globalThis.SALARIO_MINIMO_PADRAO = SALARIO_MINIMO_PADRAO;
  globalThis.calcularRendaPerCapita = calcularRendaPerCapita;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_FORM_DATA, SALARIO_MINIMO_PADRAO, calcularRendaPerCapita };
}
