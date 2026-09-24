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
  rendaObservacao: "Conforme CAD ÚNICO em anexo, a família possui renda per capita inferior a 1/4 do salário mínimo.",

  // 4. Situação de Moradia
  moradia: {
    tipo: "Casa", // Casa, Apartamento, Abrigo/Asilo, Outro
    tipoOutro: "",
    construcao: "alvenaria", // alvenaria, madeira, mista
    cobertura: "telha de amianto", // telha de amianto, telha de barro, zinco
    comodos: 3,
    comodosDescricao: "",
    zona: "urbana", // urbana, rural
    acesso: "difícil", // fácil, difícil
    tempoResidencia: "5 anos",
    regimeImovel: "Cedido", // Próprio, Alugado, Cedido/De terceiro
    proprietarioImovel: "familiar",
    caraterResidencia: "Habitual", // Habitual, Temporária

    // Infraestrutura
    agua: "Rede Pública", // Tratada/Rede Pública, Poço, Outro
    esgoto: "Fossa", // Rede Pública, Fossa, Céu aberto
    energia: "Regular", // Regular, Instável/Gato
    rua: "Terra/Dificuldade de tráfego em chuvas", // Pavimentada, Terra/Dificuldade de tráfego em chuvas
    piso: "Lajota cerâmica simples / cimento", // Piso identificado nas fotos

    // Bens
    bensTextoPadrao: "O conjunto de bens descritos a seguir demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade econômica. Nenhum bem de alto valor comercial foi encontrado.",
    bensListagem: "fogão simples de 4 bocas, geladeira antiga, 2 camas de casal, 1 ventilador e 1 aparelho de TV de tubo."
  },

  // 5. Despesas Mensais Gerais
  despesas: {
    habitacao: 0,
    habitacaoObs: "Não possui gasto direto com aluguel pois reside em imóvel cedido, porém há custos de conservação e manutenção básica.",
    energia: 120.00,
    energiaObs: "Conta média residencial.",
    agua: 45.00,
    aguaObs: "Tarifa social básica.",
    alimentacao: 450.00,
    alimentacaoObs: "Valor abaixo do mínimo nutricional recomendado, indicando risco de insegurança alimentar severa.",
    transporte: 100.00,
    transporteObs: "Família necessita de transporte extraordinário para consultas médicas especializadas.",
    saude: 200.00,
    saudeObs: "Tratamento pelo SUS. O deslocamento até os centros de referência é financeiramente inviável com a renda atual e a irregularidade no acompanhamento compromete a evolução do quadro de saúde."
  },

  // 6. Conclusão e Parecer Técnico
  conclusao: {
    dataVisita: "",
    nomeEntrevistado: "",
    fonteRendaDescricao: "Transferência de renda (Programa Bolsa Família) e eventuais bicos informais esporádicos",
    rendaTotalExtenso: "insuficiente para prover as necessidades básicas alimentares, de higiene, tratamento de saúde e transporte especializado",
    vulnerabilidadeEconomicaSevera: true,
    necessidadeTratamentoContinuo: true,
    naoDispoeMeiosProprios: true,
    rendaAtendeCriterioLoas: true,
    parecerFavoravel: true, // true = POSSUI amparo, false = NÃO POSSUI
    textoParecerComplementar: "Assim, o(a) requerente POSSUI amparo legal e social para a concessão do Benefício de Prestação Continuada - BPC (art. 20 da Lei 8.742/93)."
  },

  // 7. Classificação da Perícia
  classificacao: {
    complexidade: 2, // 1 a 3
    risco: 2,
    distancia: 2,
    dificuldadeAcesso: 3,
    riscoSocial: 3,
    justificativa: "Grau 3 em dificuldade e risco social, porque o endereço do requerente está localizado em área periférica/ressaca, distante do centro urbano, com vias sem pavimentação e carência severa de transporte público e saneamento."
  },

  // 8. Encerramento
  encerramento: {
    municipio: "Macapá",
    uf: "AP",
    dataPericia: "",
    horaPericia: "14:30 h",
    nomePerito: "Assistente Social Perito(a) Judicial",
    cress: "CRESS/AP nº 0000"
  }
};

/**
 * Função utilitária para cálculo de Renda Per Capita conforme Art. 20 da LOAS (Lei nº 8.742/93)
 */
function calcularRendaPerCapita(membrosFamilia, salarioMinimo = 1412.00) {
  if (!Array.isArray(membrosFamilia) || membrosFamilia.length === 0) {
    return {
      totalMembros: 1,
      rendaTotal: 0,
      rendaPerCapita: 0,
      limiteUmQuartoSM: salarioMinimo / 4,
      atendeCriterioObjetivo: true
    };
  }

  const totalMembros = membrosFamilia.length;
  const rendaTotal = membrosFamilia.reduce((acc, curr) => {
    const val = typeof curr.rendaMensal === "number" ? curr.rendaMensal : parseFloat(String(curr.rendaMensal).replace(/[^\d.-]/g, "")) || 0;
    return acc + val;
  }, 0);

  const rendaPerCapita = totalMembros > 0 ? (rendaTotal / totalMembros) : 0;
  const limiteUmQuarto = salarioMinimo / 4;

  return {
    totalMembros,
    rendaTotal: Number(rendaTotal.toFixed(2)),
    rendaPerCapita: Number(rendaPerCapita.toFixed(2)),
    limiteUmQuartoSM: Number(limiteUmQuarto.toFixed(2)),
    atendeCriterioObjetivo: rendaPerCapita <= limiteUmQuarto
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_FORM_DATA, calcularRendaPerCapita };
}
