/**
 * Casos Reais Pré-configurados para Demonstração e Testes
 * Caso 1: Lucas de Sousa Ribeiro (Caso real da conversa compartilhada no Gemini)
 * Caso 2: Emilly (Representante legal no Município de Mazagão/AP)
 */

const SAMPLE_CASES = {
  lucas: {
    nomeCaso: "Caso Lucas de Sousa Ribeiro (TEA/TDAH - Macapá)",
    arquivosSimulados: [
      { nome: "Documento_Identificacao_Lucas.pdf", tipo: "application/pdf", tamanho: "245 KB" },
      { nome: "Comprovante_CadUnico_Familia.pdf", tipo: "application/pdf", tamanho: "180 KB" },
      { nome: "Laudo_Medico_Multiprofissional_TEA.pdf", tipo: "application/pdf", tamanho: "310 KB" },
      { nome: "Foto_Fachada_Residencia_Brasil_Novo.jpg", tipo: "image/jpeg", tamanho: "1.2 MB" },
      { nome: "Foto_Interior_Comodos.jpg", tipo: "image/jpeg", tamanho: "980 KB" }
    ],
    textoObservacoes: "Visita domiciliar realizada na Rua Mamoeiro, 1001, Bairro Brasil Novo em Macapá-AP. O periciado Lucas é assistido pela genitora Francisca Regina. Diagnosticado com Transtorno do Espectro Autista (CID 11: 6A02.0 / CID 10: F84) e TDAH (CID 11: 6A05.2). Necessidade de acompanhamento contínuo. Residência em madeira coberta com telha de amianto, 3 cômodos em via não pavimentada. A renda é composta pelo Bolsa Família da mãe e pequenos bicos esporádicos.",
    dados: {
      cabecalho: {
        tribunal: "PODER JUDICIÁRIO / JUSTIÇA FEDERAL / SEÇÃO JUDICIÁRIA DO AMAPÁ",
        anexo: "ANEXO IV - PERITOS ASSISTENTES SOCIAIS",
        titulo: "FORMULÁRIO DE PERÍCIA SOCIOECONÔMICA (BPC/LOAS)"
      },
      identificacao: {
        processo: "1002845-67.2025.4.01.3100",
        periciado: "Lucas de Sousa Ribeiro",
        representanteLegal: "Francisca Regina de Sousa",
        cpf: "030.184.192-60",
        rg: "355596 (Expedição: 10/01/2024)",
        dataNascimento: "01/09/1998",
        sexo: "M",
        objeto: "Benefício de Prestação Continuada - BPC",
        objetoOutro: "",
        escolaridade: "Ensino Médio Técnico Completo",
        profissaoAnterior: "Auxiliar de Manutenção",
        profissaoAtual: "Técnico de Eletricidade, Eletrônica e Telecomunicações (Inapto/Desempregado)",
        nis: "162.83940.12-3",
        estadoCivil: "Solteiro",
        naturalidade: "Macapá/AP",
        endereco: "Rua Mamoeiro, nº 1001, Bairro Brasil Novo, Macapá - AP, CEP 68909-324",
        telefone: "(96) 98146-1881"
      },
      situacaoPessoal: {
        idadeTrabalhar: "Sim",
        idadeTrabalharQual: "27 anos",
        cursosProfissionalizantes: "Sim",
        cursosQual: "Técnico em Eletricidade e Telecomunicações",
        jaExerceuAtividade: "Sim",
        jaExerceuQual: "Serviços informais autônomos pontuais",
        teveCtpsAssinada: "Não",
        teveCtpsDetalhes: "Nunca obteve vínculo formal permanente em virtude das limitações decorrentes do neurodesenvolvimento"
      },
      familia: [
        {
          nome: "Lucas de Sousa Ribeiro",
          estadoCivil: "Solteiro",
          cpfNis: "030.184.192-60",
          idadeNasc: "01/09/1998 (27 anos)",
          parentesco: "Requerente",
          ocupacao: "Sem ocupação laboral",
          rendaMensal: 0,
          tipoRenda: "Sem renda"
        },
        {
          nome: "Francisca Regina de Sousa",
          estadoCivil: "Divorciada",
          cpfNis: "863.481.912-49",
          idadeNasc: "13/04/1975 (50 anos)",
          parentesco: "Genitora / Representante",
          ocupacao: "Do lar / Cuidadora",
          rendaMensal: 600.00,
          tipoRenda: "Bolsa Família"
        },
        {
          nome: "José Bonfim de Souza Ribeiro",
          estadoCivil: "Separado de fato",
          cpfNis: "Não informado",
          idadeNasc: "Não informada",
          parentesco: "Genitor",
          ocupacao: "Autônomo (não reside no núcleo)",
          rendaMensal: 0,
          tipoRenda: "Sem contribuição fixa"
        },
        {
          nome: "Thiago de Sousa Ribeiro",
          estadoCivil: "Solteiro",
          cpfNis: "057.212.732-40",
          idadeNasc: "16/12/2004 (21 anos)",
          parentesco: "Irmão",
          ocupacao: "Desempregado / Estudante",
          rendaMensal: 0,
          tipoRenda: "Sem renda"
        },
        {
          nome: "Geidson Lima Lopes",
          estadoCivil: "Solteiro",
          cpfNis: "014.295.932-45",
          idadeNasc: "20/01/1994 (32 anos)",
          parentesco: "Agregado familiar",
          ocupacao: "Acompanhamento médico crônico",
          rendaMensal: 0,
          tipoRenda: "Sem renda"
        }
      ],
      carteiraAssinadaFamilia: "Nenhum membro da família possui CTPS assinada atualmente.",
      carteiraAssinadaQtd: 0,
      rendaTotalFamilia: 600.00,
      rendaPerCapita: 150.00, // Dividido pelos 4 membros residentes
      rendaObservacao: "Conforme CAD ÚNICO em anexo, a família possui renda total de R$ 600,00 (proveniente de benefício socioassistencial eventual), resultando em renda per capita de R$ 150,00, manifestamente inferior a 1/4 do salário mínimo vigente.",
      moradia: {
        tipo: "Casa",
        tipoOutro: "",
        construcao: "madeira",
        cobertura: "telha de amianto",
        comodos: 3,
        zona: "urbana",
        acesso: "difícil",
        tempoResidencia: "6 anos",
        regimeImovel: "Cedido",
        proprietarioImovel: "Parente próximo",
        caraterResidencia: "Habitual",
        agua: "Rede Pública",
        esgoto: "Fossa",
        energia: "Regular",
        rua: "Terra/Dificuldade de tráfego em chuvas",
        bensTextoPadrao: "O conjunto de bens descritos a seguir demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade econômica. Nenhum bem de alto valor comercial foi encontrado.",
        bensListagem: "1 fogão de 4 bocas desgastado, 1 geladeira usada, 2 camas de casal, 1 ventilador e 1 televisor antigo."
      },
      despesas: {
        habitacao: 0,
        habitacaoObs: "Imóvel cedido por parentes, sem aluguel formal, ocorrendo gastos apenas com manutenções emergenciais na madeira.",
        energia: 115.00,
        energiaObs: "Fornecimento regularizado com tarifa social básica.",
        agua: 42.00,
        aguaObs: "Rede pública com taxa mínima.",
        alimentacao: 400.00,
        alimentacaoObs: "Valor severamente limitado pela renda, dependendo de doações de cestas básicas e apoio de terceiros.",
        transporte: 120.00,
        transporteObs: "Deslocamentos periódicos para atendimento multiprofissional em centros de saúde de Macapá.",
        saude: 180.00,
        saudeObs: "Acompanhamento no SUS e SARAH/CRDT. Custos recorrentes com medicamentos de suporte e suplementação não fornecidos com regularidade pelo sistema público."
      },
      conclusao: {
        dataVisita: "15/09/2026",
        nomeEntrevistado: "Francisca Regina de Sousa (Genitora)",
        fonteRendaDescricao: "Benefício Programa Bolsa Família e auxílios de parentes",
        rendaTotalExtenso: "manifestamente insuficiente para assegurar alimentação equilibrada e custos do tratamento do periciado",
        vulnerabilidadeEconomicaSevera: true,
        necessidadeTratamentoContinuo: true,
        naoDispoeMeiosProprios: true,
        rendaAtendeCriterioLoas: true,
        parecerFavoravel: true,
        textoParecerComplementar: "O periciado possui acompanhamento multiprofissional ininterrupto devido ao diagnóstico de Transtorno do Espectro Autista sem comprometimento intelectual (CID 11: 6A02.0 / CID 10: F84) e TDAH (CID 11: 6A05.2 / CID 10: F90). O núcleo conta também com o acompanhamento médico do Sr. Geidson (SARAH/CRDT). Diante de todo o quadro sociofamiliar e habitacional constatado, conclui-se que o requerente POSSUI amparo legal e social para a concessão do Benefício de Prestação Continuada - BPC."
      },
      classificacao: {
        complexidade: 2,
        risco: 2,
        distancia: 2,
        dificuldadeAcesso: 3,
        riscoSocial: 3,
        justificativa: "Grau 3 em dificuldade de acesso e risco social, porque o endereço do requerente está localizado em área periférica do Bairro Brasil Novo em Macapá/AP, distante das linhas regulares de transporte rápido, com via não pavimentada sujeita a alagamentos em períodos chuvosos, dificultando o deslocamento para os tratamentos médicos contínuos."
      },
      encerramento: {
        municipio: "Macapá",
        uf: "AP",
        dataPericia: "21/09/2026",
        horaPericia: "15:00 h",
        nomePerito: "Assistente Social Perito(a) Judicial",
        cress: "CRESS/AP nº 1420"
      }
    }
  },

  mazagao: {
    nomeCaso: "Caso E.L.P.S. (Representante Emilly - Mazagão/AP)",
    arquivosSimulados: [
      { nome: "Documento_Identificacao_Menor_RG_CPF.pdf", tipo: "application/pdf", tamanho: "215 KB" },
      { nome: "Comprovante_CadUnico_Mazagao.pdf", tipo: "application/pdf", tamanho: "185 KB" },
      { nome: "Laudo_Medico_HCAL_NANDE_Transtorno.pdf", tipo: "application/pdf", tamanho: "340 KB" },
      { nome: "Relatorio_Pedagogico_Especializado.pdf", tipo: "application/pdf", tamanho: "290 KB" },
      { nome: "Fotos_Localidade_Frente_Imovel.jpg", tipo: "image/jpeg", tamanho: "1.4 MB" },
      { nome: "Fotos_Comodos_Sala_Cozinha_Quartos.jpg", tipo: "image/jpeg", tamanho: "2.1 MB" }
    ],
    textoObservacoes: "Perícia socioeconômica judicial in loco no Município de Mazagão/AP referente ao infante E.L.P.S representado pela mãe Emilly Gleyda Mota Paixão. Residência em área rural na Rodovia Macapá Mazagão nº 1099, em casa de alvenaria e telha de amianto com 5 cômodos, cedida pela avó Deusa Correia da Silva. Família composta pela genitora (do lar, Bolsa Família R$ 600) e genitor (auxiliar de serviços gerais autônomo R$ 400). Renda per capita no CadÚnico de R$ 105,00. Tratamento contínuo no HCAL/NANDE em Macapá (distância 64 km ida e volta).",
    dados: {
      cabecalho: {
        tribunal: "PODER JUDICIÁRIO\nJUSTIÇA FEDERAL\nSEÇÃO JUDICIÁRIA DO AMAPÁ\nCOORDENAÇÃO DOS JUIZADOS ESPECIAIS FEDERAIS\nPORTARIA COJEF/NUCOD/AP Nº 01 de 10/02/2015\nANEXO IV - PERITOS ASSISTENTES SOCIAIS",
        anexo: "ANEXO IV - PERITOS ASSISTENTES SOCIAIS",
        titulo: "PERÍCIA SOCIOECONÔMICA",
        rodape: "Rodovia Norte Sul, s/n – Bairro Infraero II, CEP. 68908-911 - Macapá-AP, site: portal.trf1.jus.br/sjap. Fones: 3251-5507"
      },
      identificacao: {
        processo: "1006778-05.2026.4.01.3100",
        periciado: "E.L.P.S",
        representanteLegal: "EMILLY GLEYDA MOTA PAIXÃO",
        cpf: "065.385.402-10",
        rg: "968752",
        dataNascimento: "14/11/2017",
        sexo: "M",
        objeto: "Benefício de Prestação Continuada- BPC",
        objetoOutro: "",
        escolaridade: "3 ano fundamental",
        profissaoAnterior: "Estudante",
        profissaoAtual: "Estudante",
        codF: "5392856845",
        nis: "23831498861",
        estadoCivil: "Solteiro",
        naturalidade: "Macapá/AP",
        endereco: "Area Rural Anauerapucu, Rodovia Macapá Mazagão Nº 1099; Mazagão/AP, CEP: 68940-000",
        telefone: "(96) 99151-6520"
      },
      situacaoPessoal: {
        idadeTrabalhar: "Não",
        idadeTrabalharQual: "Menor de 16 anos (8 anos de idade)",
        cursosProfissionalizantes: "Não",
        cursosQual: "",
        jaExerceuAtividade: "Não",
        jaExerceuQual: "",
        teveCtpsAssinada: "Não",
        teveCtpsDetalhes: "Não possui idade laboral e nunca teve CTPS assinada",
        historicoCtps: []
      },
      familia: [
        {
          nome: "Emilly Mota Paixão",
          estadoCivil: "União Estável",
          cpfNis: "009.455.762-42",
          idadeNasc: "25/08/1994",
          parentesco: "Genitora",
          ocupacao: "Do lar",
          rendaMensal: 600.00,
          tipoRenda: "Comprovada (Bolsa Família)"
        },
        {
          nome: "Luís André Correa da Silva",
          estadoCivil: "União Estável",
          cpfNis: "884.220.542-72",
          idadeNasc: "28/09/1986",
          parentesco: "Genitor",
          ocupacao: "Autônomo /Auxiliar Serviço Gerais",
          rendaMensal: 400.00,
          tipoRenda: "Declarada"
        }
      ],
      carteiraAssinadaFamilia: "Nenhum membro da família possui CTPS assinada atualmente.",
      carteiraAssinadaQtd: 0,
      rendaTotalFamilia: 1000.00,
      rendaPerCapita: 105.00,
      rendaObservacao: "Conforme CAD ÚNICO em anexo, a genitora do autor possui renda per capita no valor de R$ 105,00 (cento e cinco reais).",
      moradia: {
        tipo: "Casa",
        tipoOutro: "",
        construcao: "alvenaria",
        cobertura: "telha de amianto",
        comodos: 5,
        comodosDescricao: "uma sala, um quarto, uma suite, uma cozinha conjugada, banheiro, area de servico",
        zona: "rural",
        acesso: "difícil",
        tempoResidencia: "10 anos",
        regimeImovel: "Cedido",
        proprietarioImovel: "avó do requerente Sra. Deusa Correia da Silva",
        caraterResidencia: "Habitual",
        agua: "Ausência de abastecimento público de água tratada (poço)",
        esgoto: "Ausência de rede de esgoto (fossa)",
        energia: "Iluminação elétrica regular, porém instável em horários de pico",
        rua: "Rua pavimentada, mas com trechos degradados e de difícil trafegabilidade em período chuvoso e Sistema de telefonia e internet instável ou inexistente, dificultando comunicação e emergência",
        piso: "Lajota cerâmica simples com acabamento rústico",
        bensTextoPadrao: "O conjunto de bens descritos a seguir demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade. Nenhum bem de alto valor comercial ou que indique capacidade econômica foi encontrado.",
        bensListagem: "01 (um) fogão cooktop, 01 (um) ar-condicionado, 02 (duas) caixa de som, 01 (uma) cama de casal, 01 (uma) mesa de madeira, 01 (uma) mesa plástica infantil, 01 (uma) cama de solteiro, 01 (uma) Tv Samsung, 01 (uma) Máquina de Lavar Electrolux, 01 (uma) Geladeira Panasonic, (um) Freezer cônsul, 01 (um) Bebedouro Esmaltec, 01 (um) ventilador de mesa Arno, 01 (uma) comada de madeira, 01 (um) Guarda roupa de três portas, 01 (um) sofá, 01 (um) som Samsung, 01 (um) rack em MDF, 01 (uma) central de ar."
      },
      despesas: {
        habitacao: 0,
        habitacaoObs: "Não possui gasto neste item porque residem em imóvel cedido, ou seja, sem custos fixos, porém, há custos indiretos altos, como manutenção de poço, fossa e estrutura.",
        energia: 350.00,
        energiaObs: "É fornecida pela empresa Equatorial no valor de R$ 350,00 (trezentos e cinquenta reais). Valor proporcional ao mínimo necessário.",
        agua: 0,
        aguaObs: "Sem custo de concessionária de água tratada; manutenção periódica de poço artesiano.",
        alimentacao: 600.00,
        alimentacaoObs: "O requerente possui seletividade alimentar. Gastam em média R$ 600,00 (seiscentos reais) mensais, valor abaixo do mínimo nutricional recomendado, indicando insegurança alimentar.",
        transporte: 250.00,
        transporteObs: "A família realiza o deslocamento a pé em virtude de ser área rural, o requerente usa transporte escolar para ir à escola. E na vila não existe transporte coletivo local. Ausência de transporte público impacta nos deslocamentos a Macapá e exigem gastos extraordinários como: combustível, alimentação durante deslocamento, o itinerário é de aproximadamente 64 km (ida e volta). Esses custos são incompatíveis com a renda familiar, dificultando a continuidade do tratamento do infante.",
        saude: 200.00,
        saudeObs: "O requerente realiza tratamento médico contínuo pelo SUS do Governo do Estado do Amapá, através de tratamento médico contínuo no Hospital de Clínica Alberto Lima-HCAL/Núcleo de Avaliação do Neurodesenvolvimento-NANDE e também do Centro de Referência em Doenças Tropicais e quando necessário em situações do cotidiano utilizam concomitantemente os serviços SUS no município de Mazagão, através da UBS desta localidade. Ressalto que há Necessidade de acompanhamento regular em Macapá para consultas, avaliações e possíveis terapias, conforme Relatórios e Laudo Médico em anexo. O deslocamento é financeiramente inviável com a renda atual e a irregularidade no acompanhamento compromete a evolução do quadro de saúde. A falta de recursos financeiros contribui para o não comparecimento às consultas com a regularidade necessária para a evolução do tratamento e caracteriza risco social, risco à saúde e impedimento de desenvolvimento adequado, o que reforça a necessidade do benefício."
      },
      conclusao: {
        dataVisita: "07 de setembro de 2026",
        nomeEntrevistado: "Srª Emilly Gleyda Mota Paixão",
        fonteRendaDescricao: "Benefício Programa Bolsa Família e atividade laboral autônoma como auxiliar de serviços gerais",
        rendaTotalExtenso: "manifestamente insuficiente para assegurar alimentação equilibrada e tratamento digno",
        vulnerabilidadeEconomicaSevera: true,
        necessidadeTratamentoContinuo: true,
        naoDispoeMeiosProprios: true,
        rendaAtendeCriterioLoas: true,
        parecerFavoravel: true,
        textoParecerComplementar: "Este estudo social foi elaborado após visita domiciliar 'In Lócus' no dia 07 de setembro de 2026, após informações fornecidas pela genitora do requerente Srª Emilly Gleyda Mota Paixão. A qual informou que o infante não possui no momento nenhum tipo de renda própria. A prole possui duas fontes, uma provida pelo programa social do Bolsa Família no valor de R$ 600,00 (Seiscentos reais) e outra provida pela atividade laboral do genitor na função de autônomo na atividade auxiliar de serviços gerais que desenvolve renda está não fixa de aproximadamente R$ 400,00, a qual é insuficiente para prover todas as necessidades básicas que o infante precisa.\n\nRessaltou que possuem muita dificuldade para realizar o tratamento de saúde, pois, na vila onde residem não tem este tipo de tratamento de saúde e não possuem recursos financeiros para se deslocarem até a capital (Macapá) com a frequência necessária que o tratamento requer. Portanto, é fulcral adquiri-lo, pois, o mesmo irá contribuir para custear o transporte até os equipamentos sociais onde realizam às terapias multidisciplinar, ou seja, na capital, as quais são fulcrais para evolução da saúde e qualidade de vida.\n\nPortanto, analisando o que preconiza a Fundamentação Legal: a elegibilidade do infante encontra amparo nos seguintes dispositivos: Lei Orgânica da Assistência Social - LOAS – Lei 8.742/93 (Art. 1º, Art. 2º inciso V, Art. 20 - renda per capita inferior a 1/4 do salário-mínimo); Estatuto da Criança e do Adolescente – ECA, Lei nº 8.069/90 (Art. 4º - Prioridade absoluta, Art. 7º - Condições dignas de vida e saúde); e Normas Técnicas da Assistência Social.\n\nApós criteriosa análise técnica, fundamentada em visita domiciliar, entrevista, documentação anexa e legislação vigente, conclui-se que: O infante encontra-se em situação de vulnerabilidade econômica severa. Possui necessidade comprovada de tratamento contínuo, cuja manutenção depende de recursos. A família não dispõe de meios próprios para prover sua subsistência digna. A renda per capita atende ao critério objetivo da LOAS. O ambiente social, familiar e territorial agrava a vulnerabilidade e aumenta o risco social.\n\nAssim, o requerente possui amparo legal e social para a concessão do Benefício de Prestação Continuada BPC."
      },
      classificacao: {
        complexidade: 3,
        risco: 3,
        distancia: 3,
        dificuldadeAcesso: 3,
        riscoSocial: 3,
        justificativa: "Grau 3, porque o endereço do requerente está localizado em área rural no Município de Mazagão distantes de Macapá aproximadamente 32 Km, indo pela BR Jucelino Kubitschek, em média são 1h e meia de viagem, porém, tendo que percorrer total de 64 km (ida e volta) por conseguinte, a maior dificuldade foi distância e o acesso ao celular que costuma ficar desconectado, ou seja, não funciona bem a internet naquela localidade."
      },
      encerramento: {
        municipio: "Mazagão",
        uf: "AP",
        dataPericia: "05 de setembro de 2026",
        horaPericia: "08:00 h",
        nomePerito: "Ivonete Ferreira Maciel",
        cargoPerito: "Doutora em Serviço Social",
        cress: "CRESS 104 24ª Região-AP"
      }
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SAMPLE_CASES };
}
