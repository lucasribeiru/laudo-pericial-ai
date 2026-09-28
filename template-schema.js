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
