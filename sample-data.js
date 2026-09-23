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
      { nome: "Certidao_Nascimento_Menor.pdf", tipo: "application/pdf", tamanho: "190 KB" },
      { nome: "Extrato_Consulta_CadUnico_Mazagao.pdf", tipo: "application/pdf", tamanho: "210 KB" },
      { nome: "Relatorio_Social_Comunitario.pdf", tipo: "application/pdf", tamanho: "340 KB" },
      { nome: "Foto_Casa_Mazagao_Velho.jpg", tipo: "image/jpeg", tamanho: "1.5 MB" }
    ],
    textoObservacoes: "Estudo social no Município de Mazagão/AP referente ao infante E.L.P.S representado pela mãe Emilly. Região ribeirinha/interiorana com acesso fluvial/estrada de terra vicinal. Dependência total de transferência de renda do governo federal.",
    dados: {
      cabecalho: {
        tribunal: "PODER JUDICIÁRIO / JUSTIÇA FEDERAL / SEÇÃO JUDICIÁRIA DO AMAPÁ",
        anexo: "ANEXO IV - PERITOS ASSISTENTES SOCIAIS",
        titulo: "FORMULÁRIO DE PERÍCIA SOCIOECONÔMICA (BPC/LOAS)"
      },
      identificacao: {
        processo: "1001420-12.2025.4.01.3100",
        periciado: "E. L. P. S.",
        representanteLegal: "Emilly de Oliveira Pantoja",
        cpf: "042.891.232-15",
        rg: "421890 SSP/AP",
        dataNascimento: "14/05/2019",
        sexo: "F",
        objeto: "Benefício de Prestação Continuada - BPC",
        objetoOutro: "",
        escolaridade: "Educação Infantil Incompleta",
        profissaoAnterior: "Menor impúbere",
        profissaoAtual: "Sem ocupação laboral",
        nis: "165.74829.40-1",
        estadoCivil: "Solteira",
        naturalidade: "Mazagão/AP",
        endereco: "Comunidade Ribeirinha, s/n, Zona Rural, Mazagão - AP",
        telefone: "(96) 99120-4482"
      },
      situacaoPessoal: {
        idadeTrabalhar: "Não",
        idadeTrabalharQual: "Criança de 7 anos",
        cursosProfissionalizantes: "Não",
        cursosQual: "",
        jaExerceuAtividade: "Não",
        jaExerceuQual: "",
        teveCtpsAssinada: "Não",
        teveCtpsDetalhes: ""
      },
      familia: [
        {
          nome: "E. L. P. S.",
          estadoCivil: "Solteira",
          cpfNis: "042.891.232-15",
          idadeNasc: "14/05/2019 (7 anos)",
          parentesco: "Requerente",
          ocupacao: "Estudante",
          rendaMensal: 0,
          tipoRenda: "Sem renda"
        },
        {
          nome: "Emilly de Oliveira Pantoja",
          estadoCivil: "Solteira",
          cpfNis: "782.119.042-30",
          idadeNasc: "10/02/1997 (29 anos)",
          parentesco: "Genitora / Representante Legal",
          ocupacao: "Agricultura de subsistência / Cuidadora",
          rendaMensal: 600.00,
          tipoRenda: "Bolsa Família"
        },
        {
          nome: "Manoel de Oliveira Pantoja",
          estadoCivil: "Solteiro",
          cpfNis: "055.332.112-90",
          idadeNasc: "05/08/2021 (5 anos)",
          parentesco: "Irmão",
          ocupacao: "Menor",
          rendaMensal: 0,
          tipoRenda: "Sem renda"
        }
      ],
      carteiraAssinadaFamilia: "Nenhum membro da família possui CTPS assinada atualmente.",
      carteiraAssinadaQtd: 0,
      rendaTotalFamilia: 600.00,
      rendaPerCapita: 200.00,
      rendaObservacao: "Conforme CAD ÚNICO em anexo, a família possui renda total de R$ 600,00 proveniente do Bolsa Família, perfazendo renda per capita de R$ 200,00, atestando estado de extrema miserabilidade.",
      moradia: {
        tipo: "Casa",
        tipoOutro: "",
        construcao: "madeira",
        cobertura: "telha de barro",
        comodos: 2,
        zona: "rural",
        acesso: "difícil",
        tempoResidencia: "8 anos",
        regimeImovel: "Próprio",
        proprietarioImovel: "Genitora",
        caraterResidencia: "Habitual",
        agua: "Poço",
        esgoto: "Fossa",
        energia: "Regular",
        rua: "Terra/Dificuldade de tráfego em chuvas",
        bensTextoPadrao: "O conjunto de bens descritos a seguir demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade econômica. Nenhum bem de alto valor comercial foi encontrado.",
        bensListagem: "1 fogão a gás comum, 1 geladeira simples, 1 cama de casal e 1 rede de dormir."
      },
      despesas: {
        habitacao: 0,
        habitacaoObs: "Imóvel próprio de madeira rústica.",
        energia: 60.00,
        energiaObs: "Tarifa rural subsidiada.",
        agua: 0,
        aguaObs: "Abastecimento por poço caseiro / água de chuva.",
        alimentacao: 380.00,
        alimentacaoObs: "Alimentação complementada por pesca artesanal e mandioca de subsistência.",
        transporte: 150.00,
        transporteObs: "Deslocamento de barco/rabeta e transporte coletivo rural até o centro de Mazagão e Macapá para consultas pediátricas.",
        saude: 90.00,
        saudeObs: "Gastos com pomadas e xaropes não disponíveis na UBS ribeirinha."
      },
      conclusao: {
        dataVisita: "18/09/2026",
        nomeEntrevistado: "Emilly de Oliveira Pantoja",
        fonteRendaDescricao: "Programa Bolsa Família",
        rendaTotalExtenso: "insuficiente para atender o custeio de vida, moradia digna e desenvolvimento saudável da menor",
        vulnerabilidadeEconomicaSevera: true,
        necessidadeTratamentoContinuo: true,
        naoDispoeMeiosProprios: true,
        rendaAtendeCriterioLoas: true,
        parecerFavoravel: true,
        textoParecerComplementar: "A menor necessita de amparo contínuo e acompanhamento especializado. A família sobrevive em condição de acentuada exclusão geográfica e vulnerabilidade social. O parecer técnico conclui que a requerente POSSUI amparo legal para concessão do BPC/LOAS."
      },
      classificacao: {
        complexidade: 3,
        risco: 2,
        distancia: 3,
        dificuldadeAcesso: 3,
        riscoSocial: 3,
        justificativa: "Grau 3 em todos os quesitos de distância e acesso, pois o local da perícia fica em área ribeirinha do interior de Mazagão/AP, dependendo de embarcação para travessia fluvial, com severo isolamento comunitário."
      },
      encerramento: {
        municipio: "Mazagão",
        uf: "AP",
        dataPericia: "22/09/2026",
        horaPericia: "11:00 h",
        nomePerito: "Assistente Social Perito(a) Judicial",
        cress: "CRESS/AP nº 1420"
      }
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SAMPLE_CASES };
}
