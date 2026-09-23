/**
 * Gerador Oficial de Documento Microsoft Word (.docx)
 * Modelo: Poder Judiciário / Justiça Federal / Seção Judiciária do Amapá
 * Anexo IV - Peritos Assistentes Sociais
 * Utiliza a biblioteca docx.js (versão UMD para navegador)
 */

class PericiaDocxGenerator {
  constructor(formData) {
    this.data = formData;
    this.docx = window.docx || (typeof docx !== "undefined" ? docx : null);
  }

  /**
   * Converte valores numéricos para formato de moeda brasileira (R$ 0,00)
   */
  formatMoney(value) {
    const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, "")) || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  /**
   * Retorna representação de checkbox preenchido ou vazio
   */
  cb(condition, label) {
    return `${condition ? "( X )" : "(   )"} ${label}`;
  }

  /**
   * Gera o arquivo .docx e dispara o download no navegador
   */
  async downloadDocx(filename = "Formulario_Pericia_Socioeconomica.docx") {
    const doc = this.buildDocument();
    const blob = await this.docx.Packer.toBlob(doc);
    
    if (window.saveAs) {
      window.saveAs(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
    return true;
  }

  /**
   * Constrói o documento Word estruturado com todas as 8 seções oficiais
   */
  buildDocument() {
    const {
      Document,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      AlignmentType,
      WidthType,
      BorderStyle,
      HeadingLevel,
      ShadingType
    } = this.docx;

    const FONT_FAMILY = "Arial";
    const COLOR_PRIMARY = "003366"; // Azul judiciário escuro
    const COLOR_TEXT = "1A1A1A";
    const COLOR_BG_HEADER = "F0F4F8";
    const COLOR_BORDER = "B0BEC5";

    // Helper para criar títulos de seção padronizados
    const createSectionHeader = (title) => {
      return new Paragraph({
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 22, // 11pt
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
          })
        ]
      });
    };

    // Helper para linhas de campo (Rótulo em negrito + Valor)
    const createFieldParagraph = (label, value, extraSpaceAfter = 80) => {
      return new Paragraph({
        spacing: { before: 40, after: extraSpaceAfter, line: 260 },
        children: [
          new TextRun({
            text: label + ": ",
            bold: true,
            size: 20, // 10pt
            font: FONT_FAMILY,
            color: COLOR_TEXT
          }),
          new TextRun({
            text: value ? String(value) : "___________________________",
            size: 20,
            font: FONT_FAMILY,
            color: COLOR_TEXT
          })
        ]
      });
    };

    // Helper para célula com bordas finas padronizadas
    const createBorderedCell = (children, widthPercent, isHeader = false, colSpan = 1) => {
      return new TableCell({
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        columnSpan: colSpan,
        shading: isHeader ? { fill: "EAEFF5", type: ShadingType.CLEAR } : undefined,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
        },
        children: Array.isArray(children) ? children : [
          new Paragraph({
            children: [
              new TextRun({
                text: String(children),
                bold: isHeader,
                size: 18, // 9pt
                font: FONT_FAMILY,
                color: COLOR_TEXT
              })
            ]
          })
        ]
      });
    };

    const d = this.data;

    // --- SEÇÃO 1: CABEÇALHO OFICIAL DO TRIBUNAL ---
    const headerParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: "PODER JUDICIÁRIO",
            bold: true,
            size: 22,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: "JUSTIÇA FEDERAL / SEÇÃO JUDICIÁRIA DO AMAPÁ",
            bold: true,
            size: 20,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 140 },
        children: [
          new TextRun({
            text: "ANEXO IV - PERITOS ASSISTENTES SOCIAIS",
            bold: true,
            size: 18,
            font: FONT_FAMILY,
            color: "555555"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 240 },
        children: [
          new TextRun({
            text: "FORMULÁRIO DE PERÍCIA SOCIOECONÔMICA (BPC/LOAS)",
            bold: true,
            size: 24, // 12pt
            font: FONT_FAMILY,
            color: COLOR_PRIMARY,
            underline: {}
          })
        ]
      })
    ];

    // --- SEÇÃO 1: DADOS GERAIS E IDENTIFICAÇÃO ---
    const sec1 = [
      createSectionHeader("1. DADOS GERAIS E IDENTIFICAÇÃO"),
      createFieldParagraph("PROCESSO Nº", d.identificacao.processo),
      createFieldParagraph("PERICIADO(A)", d.identificacao.periciado),
      createFieldParagraph("REPRESENTANTE LEGAL", d.identificacao.representanteLegal || "O próprio"),
      
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "CPF: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.identificacao.cpf || "___.___.___-__", size: 20, font: FONT_FAMILY }),
          new TextRun({ text: "     RG: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.identificacao.rg || "___________", size: 20, font: FONT_FAMILY }),
          new TextRun({ text: "     DATA NASC.: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.identificacao.dataNascimento || "__/__/____", size: 20, font: FONT_FAMILY })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "SEXO: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${this.cb(d.identificacao.sexo === "M", "Masculino")}   ${this.cb(d.identificacao.sexo === "F", "Feminino")}`, size: 20, font: FONT_FAMILY })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "OBJETO: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${this.cb(true, "Benefício de Prestação Continuada - BPC")}   ${this.cb(false, "Outro: _________________")}`, size: 20, font: FONT_FAMILY })
        ]
      }),

      createFieldParagraph("ESCOLARIDADE", d.identificacao.escolaridade),
      createFieldParagraph("PROFISSÃO ANTERIOR", d.identificacao.profissaoAnterior),
      createFieldParagraph("PROFISSÃO ATUAL", d.identificacao.profissaoAtual),
      
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "NIS / CÓD. FAMILIAR: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.identificacao.nis || "___________", size: 20, font: FONT_FAMILY }),
          new TextRun({ text: "     ESTADO CIVIL: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.identificacao.estadoCivil || "___________", size: 20, font: FONT_FAMILY }),
          new TextRun({ text: "     NATURALIDADE: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.identificacao.naturalidade || "___________", size: 20, font: FONT_FAMILY })
        ]
      }),

      createFieldParagraph("ENDEREÇO COMPLETO", d.identificacao.endereco),
      createFieldParagraph("TELEFONE DE CONTATO", d.identificacao.telefone)
    ];

    // --- SEÇÃO 2: SITUAÇÃO PESSOAL ---
    const sec2 = [
      createSectionHeader("2. SITUAÇÃO PESSOAL"),
      
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Está em idade de trabalhar (>16 anos)? ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${this.cb(d.situacaoPessoal.idadeTrabalhar === "Sim", "Sim")}   ${this.cb(d.situacaoPessoal.idadeTrabalhar === "Não", "Não")}`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.situacaoPessoal.idadeTrabalharQual ? ` (${d.situacaoPessoal.idadeTrabalharQual})` : "", size: 20, font: FONT_FAMILY })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Possui cursos profissionalizantes? ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${this.cb(d.situacaoPessoal.cursosProfissionalizantes === "Sim", "Sim")}   ${this.cb(d.situacaoPessoal.cursosProfissionalizantes === "Não", "Não")}`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.situacaoPessoal.cursosQual ? ` - Qual: ${d.situacaoPessoal.cursosQual}` : "", size: 20, font: FONT_FAMILY })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Já exerceu alguma atividade remunerada? ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${this.cb(d.situacaoPessoal.jaExerceuAtividade === "Sim", "Sim")}   ${this.cb(d.situacaoPessoal.jaExerceuAtividade === "Não", "Não")}`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.situacaoPessoal.jaExerceuQual ? ` - Qual: ${d.situacaoPessoal.jaExerceuQual}` : "", size: 20, font: FONT_FAMILY })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({ text: "Teve a CTPS (Carteira de Trabalho) assinada em algum momento? ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${this.cb(d.situacaoPessoal.teveCtpsAssinada === "Sim", "Sim")}   ${this.cb(d.situacaoPessoal.teveCtpsAssinada === "Não", "Não")}`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.situacaoPessoal.teveCtpsDetalhes ? ` (${d.situacaoPessoal.teveCtpsDetalhes})` : "", size: 20, font: FONT_FAMILY })
        ]
      })
    ];

    // --- SEÇÃO 3: SITUAÇÃO FAMILIAR E RENDA DOS INTEGRANTES ---
    const tableHeaderRow = new TableRow({
      tableHeader: true,
      children: [
        createBorderedCell("Nome Completo", 26, true),
        createBorderedCell("Parentesco", 14, true),
        createBorderedCell("Idade / Nasc.", 14, true),
        createBorderedCell("CPF / NIS", 16, true),
        createBorderedCell("Ocupação", 16, true),
        createBorderedCell("Renda Mensal", 14, true)
      ]
    });

    const tableFamilyRows = (d.familia && d.familia.length > 0 ? d.familia : [
      {
        nome: d.identificacao.periciado || "Requerente",
        parentesco: "Requerente",
        idadeNasc: d.identificacao.dataNascimento || "-",
        cpfNis: d.identificacao.cpf || "-",
        ocupacao: "Sem ocupação",
        rendaMensal: 0,
        tipoRenda: "Sem renda"
      }
    ]).map((membro) => {
      return new TableRow({
        children: [
          createBorderedCell(membro.nome || "-", 26),
          createBorderedCell(membro.parentesco || "-", 14),
          createBorderedCell(membro.idadeNasc || "-", 14),
          createBorderedCell(membro.cpfNis || "-", 16),
          createBorderedCell(membro.ocupacao || "-", 16),
          createBorderedCell(this.formatMoney(membro.rendaMensal) + (membro.tipoRenda ? ` (${membro.tipoRenda})` : ""), 14)
        ]
      });
    });

    // Linha de total na tabela
    const tableTotalRow = new TableRow({
      children: [
        createBorderedCell("RENDA TOTAL DO GRUPO FAMILIAR", 70, true, 4),
        createBorderedCell("", 16, true),
        createBorderedCell(this.formatMoney(d.rendaTotalFamilia), 14, true)
      ]
    });

    const familyTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [tableHeaderRow, ...tableFamilyRows, tableTotalRow]
    });

    const sec3 = [
      createSectionHeader("3. SITUAÇÃO FAMILIAR E RENDA DOS INTEGRANTES"),
      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({
            text: "Relação de todos os integrantes que compõem o núcleo familiar e suas respectivas rendas:",
            size: 20,
            font: FONT_FAMILY,
            italics: true
          })
        ]
      }),
      familyTable,
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: "Diagnóstico de CTPS: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.carteiraAssinadaFamilia || "Nenhum membro possui carteira assinada atualmente.", size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text: "CÁLCULO DA RENDA PER CAPITA (Art. 20 da LOAS): ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `${this.formatMoney(d.rendaPerCapita)} por pessoa (Limite legal de 1/4 SM: R$ 353,00).`,
            bold: true,
            size: 20,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
          })
        ]
      }),
      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({ text: "Observação CadÚnico: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.rendaObservacao || "Família enquadrada nos critérios socioeconômicos da assistência social.", size: 20, font: FONT_FAMILY })
        ]
      })
    ];

    // --- SEÇÃO 4: SITUAÇÃO DE MORADIA ---
    const m = d.moradia;
    const sec4 = [
      createSectionHeader("4. SITUAÇÃO DE MORADIA"),
      
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Tipo de Imóvel: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `${this.cb(m.tipo === "Casa", "Casa")}   ${this.cb(m.tipo === "Apartamento", "Apartamento")}   ${this.cb(m.tipo === "Abrigo/Asilo", "Abrigo/Asilo")}   ${this.cb(m.tipo === "Outro", m.tipoOutro ? `Outro: ${m.tipoOutro}` : "Outro")}`,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Construção: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `${this.cb(m.construcao === "alvenaria", "Alvenaria")}   ${this.cb(m.construcao === "madeira", "Madeira")}   ${this.cb(m.construcao === "mista", "Mista")}`,
            size: 20,
            font: FONT_FAMILY
          }),
          new TextRun({ text: "     Cobertura: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `${this.cb(m.cobertura.includes("amianto"), "Telha de amianto")}   ${this.cb(m.cobertura.includes("barro"), "Telha de barro")}`,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Cômodos: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${m.comodos} cômodos`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: "     Localização: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `${this.cb(m.zona === "urbana", "Urbana")}   ${this.cb(m.zona === "rural", "Rural")}`,
            size: 20,
            font: FONT_FAMILY
          }),
          new TextRun({ text: "     Acesso: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `${this.cb(m.acesso === "fácil", "Fácil")}   ${this.cb(m.acesso === "difícil", "Difícil")}`,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Tempo de Residência: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: m.tempoResidencia || "5 anos", size: 20, font: FONT_FAMILY }),
          new TextRun({ text: "     Regime: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `${this.cb(m.regimeImovel === "Próprio", "Próprio")}   ${this.cb(m.regimeImovel === "Alugado", "Alugado")}   ${this.cb(m.regimeImovel.includes("Cedido"), "Cedido por terceiro")}`,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Infraestrutura Básica: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `Água: ${m.agua} | Esgoto: ${m.esgoto} | Energia: ${m.energia} | Rua: ${m.rua}`,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text: "Inventário de Bens Móveis: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: m.bensTextoPadrao || "O conjunto de bens descritos demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade econômica.",
            size: 20,
            font: FONT_FAMILY,
            italics: true
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({ text: "Descrição dos bens encontrados: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: m.bensListagem || "Bens de uso essencial em estado de conservação regular a desgastado.", size: 20, font: FONT_FAMILY })
        ]
      })
    ];

    // --- SEÇÃO 5: DESPESAS MENSAIS GERAIS ---
    const desp = d.despesas;
    const despRows = [
      new TableRow({
        tableHeader: true,
        children: [
          createBorderedCell("Item de Despesa", 25, true),
          createBorderedCell("Valor Mensal", 20, true),
          createBorderedCell("Observações e Justificativas Circunstanciadas", 55, true)
        ]
      }),
      new TableRow({
        children: [
          createBorderedCell("Habitação / Aluguel", 25),
          createBorderedCell(this.formatMoney(desp.habitacao), 20),
          createBorderedCell(desp.habitacaoObs || "Reside em imóvel próprio/cedido.", 55)
        ]
      }),
      new TableRow({
        children: [
          createBorderedCell("Energia Elétrica", 25),
          createBorderedCell(this.formatMoney(desp.energia), 20),
          createBorderedCell(desp.energiaObs || "Consumo básico essencial.", 55)
        ]
      }),
      new TableRow({
        children: [
          createBorderedCell("Água Encanada", 25),
          createBorderedCell(this.formatMoney(desp.agua), 20),
          createBorderedCell(desp.aguaObs || "Taxa social mínima.", 55)
        ]
      }),
      new TableRow({
        children: [
          createBorderedCell("Alimentação Básica", 25),
          createBorderedCell(this.formatMoney(desp.alimentacao), 20),
          createBorderedCell(desp.alimentacaoObs || "Cesta de consumo essencial.", 55)
        ]
      }),
      new TableRow({
        children: [
          createBorderedCell("Transporte", 25),
          createBorderedCell(this.formatMoney(desp.transporte), 20),
          createBorderedCell(desp.transporteObs || "Deslocamento até unidades básicas e especializadas.", 55)
        ]
      }),
      new TableRow({
        children: [
          createBorderedCell("Saúde e Medicamentos", 25),
          createBorderedCell(this.formatMoney(desp.saude), 20),
          createBorderedCell(desp.saudeObs || "Tratamento pelo SUS. O deslocamento até os centros de referência é financeiramente inviável com a renda atual e a irregularidade compromete a evolução do quadro de saúde.", 55)
        ]
      })
    ];

    const despTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: despRows
    });

    const sec5 = [
      createSectionHeader("5. DESPESAS MENSAIS GERAIS"),
      despTable
    ];

    // --- SEÇÃO 6: CONCLUSÃO E PARECER TÉCNICO ---
    const c = d.conclusao;
    const sec6 = [
      createSectionHeader("6. CONCLUSÃO E PARECER TÉCNICO"),
      
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: "Data da Visita Domiciliar: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: c.dataVisita || "__/__/____", size: 20, font: FONT_FAMILY }),
          new TextRun({ text: "     Entrevistado(a): ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: c.nomeEntrevistado || d.identificacao.periciado, size: 20, font: FONT_FAMILY })
        ]
      }),

      createFieldParagraph("Fontes de Renda Identificadas", c.fonteRendaDescricao),
      createFieldParagraph("Diagnóstico da Renda Global", c.rendaTotalExtenso),

      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Constatações Técnicas Socioeconômicas:", bold: true, size: 20, font: FONT_FAMILY })
        ]
      }),

      new Paragraph({
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({ text: `${this.cb(c.vulnerabilidadeEconomicaSevera, "Vulnerabilidade econômica severa")}`, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({ text: `${this.cb(c.necessidadeTratamentoContinuo, "Necessidade de tratamento médico/multiprofissional contínuo")}`, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({ text: `${this.cb(c.naoDispoeMeiosProprios, "Não dispõe de meios próprios ou da família para prover a subsistência")}`, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 20, after: 80 },
        children: [
          new TextRun({ text: `${this.cb(c.rendaAtendeCriterioLoas, "Atende ao critério objetivo de renda per capita (art. 20, § 3º da Lei 8.742/93)")}`, size: 20, font: FONT_FAMILY })
        ]
      }),

      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text: "PARECER CONCLUSIVO: ", bold: true, size: 22, font: FONT_FAMILY, color: COLOR_PRIMARY }),
          new TextRun({
            text: `${this.cb(c.parecerFavoravel, "POSSUI")} amparo legal e social     ${this.cb(!c.parecerFavoravel, "NÃO POSSUI")} amparo legal e social`,
            bold: true,
            size: 22,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({
            text: c.textoParecerComplementar || "Diante do estudo social realizado in loco, conclui-se que a parte requerente atende integralmente aos requisitos da legislação assistencial em vigor.",
            size: 20,
            font: FONT_FAMILY
          })
        ]
      })
    ];

    // --- SEÇÃO 7: CLASSIFICAÇÃO DA PERÍCIA ---
    const cl = d.classificacao;
    const sec7 = [
      createSectionHeader("7. CLASSIFICAÇÃO DA PERÍCIA"),
      
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: `Complexidade: Grau ${cl.complexidade}   |   Risco: Grau ${cl.risco}   |   Distância: Grau ${cl.distancia}   |   Dificuldade de Acesso: Grau ${cl.dificuldadeAcesso}   |   Risco Social: Grau ${cl.riscoSocial}`, bold: true, size: 20, font: FONT_FAMILY, color: COLOR_PRIMARY })
        ]
      }),

      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({ text: "Justificativa Técnica: ", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: cl.justificativa || "Grau justificado pela localização periférica e severidade dos fatores de vulnerabilidade constatados.", size: 20, font: FONT_FAMILY })
        ]
      })
    ];

    // --- SEÇÃO 8: ENCERRAMENTO E ASSINATURA ---
    const enc = d.encerramento;
    const sec8 = [
      createSectionHeader("8. ENCERRAMENTO"),
      
      new Paragraph({
        spacing: { before: 60, after: 160 },
        children: [
          new TextRun({
            text: `Perícia social in loco realizada em ${enc.municipio}/${enc.uf}, na data de ${enc.dataPericia || "__/__/____"} às ${enc.horaPericia || "14:30 h"}.`,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360, after: 40 },
        children: [
          new TextRun({
            text: "_________________________________________________________",
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({
            text: enc.nomePerito || "Assistente Social Perito(a) Judicial",
            bold: true,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({
            text: enc.cress || "CRESS/AP nº 0000",
            size: 18,
            font: FONT_FAMILY,
            color: "555555"
          })
        ]
      })
    ];

    // Monta o documento final completo
    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 2.54 cm
                bottom: 1440,
                left: 1700, // ~3 cm
                right: 1440 // 2.54 cm
              }
            }
          },
          children: [
            ...headerParagraphs,
            ...sec1,
            ...sec2,
            ...sec3,
            ...sec4,
            ...sec5,
            ...sec6,
            ...sec7,
            ...sec8
          ]
        }
      ]
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PericiaDocxGenerator };
}
