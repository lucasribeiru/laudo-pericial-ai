/**
 * Gerador Oficial de Documento Microsoft Word (.docx e .doc)
 * Modelo Oficial: Poder Judiciário / Justiça Federal / Seção Judiciária do Amapá
 * Coordenação dos Juizados Especiais Federais - Portaria COJEF/NUCOD/AP Nº 01 de 10/02/2015
 * Anexo IV - Peritos Assistentes Sociais
 */

class PericiaDocxGenerator {
  constructor(formData) {
    this.data = formData || {};
    this.docx = window.docx || (typeof docx !== "undefined" ? docx : null);
  }

  formatMoney(value) {
    const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, "")) || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  cb(condition, label) {
    return `${condition ? "( X )" : "(   )"} ${label}`;
  }

  /**
   * Disparo seguro de download de Blob no navegador
   */
  triggerBlobDownload(blob, filename) {
    if (window.saveAs) {
      window.saveAs(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
    }
  }

  /**
   * Gera o arquivo Word (.docx oficial com fallback garantido para .doc formatado)
   */
  async downloadDocx(filename = "Pericia_Socioeconomica.docx") {
    // Tentativa 1: Biblioteca docx.js (Gera .docx binário padrão OpenXML)
    if (this.docx && this.docx.Document && this.docx.Packer) {
      try {
        const doc = this.buildDocument();
        const blob = await this.docx.Packer.toBlob(doc);
        this.triggerBlobDownload(blob, filename);
        return true;
      } catch (err) {
        console.warn("docx.js buildDocument falhou, acionando fallback nativo do Word:", err);
      }
    }

    // Tentativa 2 (Garantia 100% de download): Word HTML/XML nativo aberto perfeitamente pelo Microsoft Word
    return this.downloadWordHtmlFallback(filename.replace(/\.docx$/i, ".doc"));
  }

  /**
   * Fallback que gera documento Microsoft Word (.doc) 100% fiel com formatação judicial e tabelas
   */
  downloadWordHtmlFallback(filename = "Pericia_Socioeconomica.doc") {
    const d = this.data || {};
    const id = d.identificacao || {};
    const sp = d.situacaoPessoal || {};
    const m = d.moradia || {};
    const desp = d.despesas || {};
    const c = d.conclusao || {};
    const cl = d.classificacao || {};
    const enc = d.encerramento || {};
    const fam = Array.isArray(d.familia) && d.familia.length > 0 ? d.familia : [];

    const brasaoImgSrc = typeof BRASAO_HEADER_BASE64 !== "undefined" ? BRASAO_HEADER_BASE64 : "brasao_header.png";

    const familyRowsHtml = fam.map(f => `
      <tr>
        <td>${f.nome || "-"}</td>
        <td>${f.estadoCivil || "-"}</td>
        <td>${f.cpfNis || "-"}</td>
        <td>${f.idadeNasc || "-"}</td>
      </tr>
    `).join("");

    const familyContRowsHtml = fam.map(f => `
      <tr>
        <td>${f.parentesco || "-"}</td>
        <td>${f.ocupacao || "-"}</td>
        <td>${this.formatMoney(f.rendaMensal)}</td>
        <td>${f.tipoRenda || "Declarada"}</td>
      </tr>
    `).join("");

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Perícia Socioeconômica</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 20mm 20mm 25mm;
            mso-header-margin: 10mm;
            mso-footer-margin: 10mm;
          }
          body {
            font-family: Arial, 'Times New Roman', serif;
            font-size: 10pt;
            line-height: 1.35;
            color: #000000;
          }
          .judicial-header {
            text-align: center;
            margin-bottom: 12px;
          }
          .judicial-header img {
            width: 480px;
            max-width: 100%;
            height: auto;
            margin-bottom: 6px;
          }
          .form-title {
            text-align: center;
            font-weight: bold;
            font-size: 11pt;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 0;
            margin: 8px 0 12px;
            text-transform: uppercase;
          }
          .section-title {
            text-align: center;
            font-weight: bold;
            font-size: 10.5pt;
            margin: 14px 0 6px;
            text-transform: uppercase;
          }
          table.bordered-box {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000;
            margin-bottom: 12px;
          }
          table.bordered-box td {
            border: 1px solid #000;
            padding: 5px 8px;
            font-size: 9.5pt;
            vertical-align: top;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          table.data-table th, table.data-table td {
            border: 1px solid #000;
            padding: 5px 6px;
            font-size: 9pt;
            text-align: left;
          }
          table.data-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .field-label {
            font-weight: bold;
          }
          .footer-note {
            font-size: 8pt;
            color: #333;
            margin-top: 4px;
            text-align: justify;
          }
          .official-page-footer {
            border-top: 1px solid #777;
            padding-top: 4px;
            margin-top: 25px;
            font-size: 8pt;
            color: #555;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="judicial-header">
          <img src="${brasaoImgSrc}" alt="Cabeçalho Oficial Justiça Federal" />
          <div class="form-title">PERÍCIA SOCIOECONÔMICA</div>
        </div>

        <table class="bordered-box">
          <tr>
            <td colspan="3"><span class="field-label">Processo nº</span> ${id.processo || "___________________"}</td>
          </tr>
          <tr>
            <td colspan="3"><span class="field-label">Periciado:</span> ${id.periciado || "___________________"}</td>
          </tr>
          <tr>
            <td colspan="3"><span class="field-label">Representante Legal:</span> ${id.representanteLegal || "O próprio"}</td>
          </tr>
          <tr>
            <td colspan="3">
              <span class="field-label">CPF:</span> ${id.cpf || "___.___.___-__"} &nbsp;&nbsp;&nbsp;&nbsp;
              <span class="field-label">RG:</span> ${id.rg || "________"} &nbsp;&nbsp;&nbsp;&nbsp;
              <span class="field-label">COD.F:</span> ${id.codF || "________"} &nbsp;&nbsp;&nbsp;&nbsp;
              <span class="field-label">NIS:</span> ${id.nis || "________"}
            </td>
          </tr>
          <tr>
            <td colspan="3">
              <span class="field-label">Sexo:</span> ${this.cb(id.sexo === "M", "M")} &nbsp;&nbsp; ${this.cb(id.sexo === "F", "F")}
            </td>
          </tr>
          <tr>
            <td colspan="3"><span class="field-label">Data Nascimento:</span> ${id.dataNascimento || "__/__/____"}</td>
          </tr>
          <tr>
            <td colspan="3"><span class="field-label">OBJETO:</span> ${id.objeto || "Benefício de Prestação Continuada- BPC"}</td>
          </tr>
          <tr>
            <td width="40%"><span class="field-label">Profissão Anterior:</span> ${id.profissaoAnterior || "Estudante"}<br><span class="field-label">Profissão Atual:</span> ${id.profissaoAtual || "Estudante"}</td>
            <td width="30%"><span class="field-label">Estado Civil:</span><br>${id.estadoCivil || "Solteiro"}</td>
            <td width="30%"><span class="field-label">Naturalidade:</span><br>${id.naturalidade || "Macapá/AP"}</td>
          </tr>
          <tr>
            <td colspan="3"><span class="field-label">Escolaridade:</span> ${id.escolaridade || "3 ano fundamental"}</td>
          </tr>
          <tr>
            <td colspan="2"><span class="field-label">Endereço da parte (igual ao local da perícia):</span> ${id.endereco || "___________________"}</td>
            <td><span class="field-label">Telefone:</span><br>${id.telefone || "___________________"}</td>
          </tr>
        </table>

        <div class="section-title">SITUAÇÃO PESSOAL</div>
        <p><span class="field-label">Está em idade de trabalhar (acima de 16 anos)?</span><br>${sp.idadeTrabalhar === "Não" ? "Não." : (sp.idadeTrabalharQual || "Sim.")}</p>
        <p><span class="field-label">Realizou cursos profissionalizantes? Especificar.</span><br>${sp.cursosProfissionalizantes === "Não" ? "Não." : (sp.cursosQual || "Sim.")}</p>
        <p><span class="field-label">Já exerceu atividade remunerada? Especificar.</span><br>${sp.jaExerceuAtividade === "Não" ? "Não." : (sp.jaExerceuQual || "Sim.")}</p>
        <p><span class="field-label">Teve a CTPS assinada? Especificar.</span><br>${sp.teveCtpsAssinada === "Não" ? "Não." : (sp.teveCtpsDetalhes || "Sim.")}</p>

        <p><span class="field-label">CTPS (Nº Série )</span></p>
        <table class="data-table">
          <thead>
            <tr><th>Nº</th><th>EMPRESA</th><th>CARGO</th><th>ENTRADA</th><th>SAÍDA</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>${sp.empresa1 || ""}</td><td>${sp.cargo1 || ""}</td><td>${sp.entrada1 || ""}</td><td>${sp.saida1 || ""}</td></tr>
            <tr><td>2</td><td>${sp.empresa2 || ""}</td><td>${sp.cargo2 || ""}</td><td>${sp.entrada2 || ""}</td><td>${sp.saida2 || ""}</td></tr>
          </tbody>
        </table>

        <div class="section-title" style="page-break-before: always;">SITUAÇÃO FAMILIAR – RENDA DOS INTEGRANTES</div>
        <table class="data-table">
          <thead>
            <tr><th>NOME COMPLETO</th><th>ESTADO CIVIL</th><th>CPF/NIS</th><th>NASCIMENTO</th></tr>
          </thead>
          <tbody>
            ${familyRowsHtml || "<tr><td colspan='4'>Nenhum integrante cadastrado</td></tr>"}
          </tbody>
        </table>

        <div class="section-title" style="font-size: 9.5pt; margin: 8px 0 4px;">CONTINUAÇÃO</div>
        <table class="data-table">
          <thead>
            <tr><th>PARENTESCO</th><th>OCUPAÇÃO</th><th>RENDA MENSAL</th><th>R. COMPROVADA?</th></tr>
          </thead>
          <tbody>
            ${familyContRowsHtml || "<tr><td colspan='4'>Nenhum registro</td></tr>"}
          </tbody>
        </table>

        <div class="footer-note">
          * “renda mensal bruta familiar: a soma dos rendimentos brutos auferidos mensalmente pelos membros da família composta por salários, proventos, pensões, pensões alimentícias, benefícios de previdência pública ou privada, comissões, pró-labore, outros rendimentos do trabalho não assalariado, rendimentos do mercado informal ou autônomo, rendimentos auferidos do patrimônio, Renda Mensal Vitalícia e Benefício de Prestação Continuada, ressalvado o disposto no parágrafo único do art. 19.” (Art. 4º, VI, do anexo do Decreto nº 6.214/2007).
        </div>

        <p style="margin-top: 10px;"><span class="field-label">Quantos possuem carteira de trabalho, CTPS, assinada?</span><br>${d.carteiraAssinadaFamilia || "Nenhum membro da família possui CTPS assinada atualmente."}</p>
        <p><span class="field-label">Qual a renda familiar per capita mensal? Especificar com cálculo, conforme art. 20 da lei nº. 8.742/93 - LOAS.</span><br>${d.rendaObservacao || `Renda per capita calculada: ${this.formatMoney(d.rendaPerCapita)}.`}</p>

        <div class="section-title" style="page-break-before: always;">SITUAÇÃO DE MORADIA</div>
        <p><span class="field-label">Reside em quê? Abrigos, asilos ou similares, casa, apartamento etc.</span><br>
        Reside em casa com construção em ${m.construcao || "alvenaria"}, coberto com ${m.cobertura || "telha de amianto"} e possui ${m.comodos || 5} cômodos ${m.comodosDescricao ? `(${m.comodosDescricao})` : ""}. A residência encontra-se em área ${m.zona || "rural"} do município, de acesso ${m.acesso || "difícil"}. Infraestrutura comunitária: ${m.agua || "Ausência de água tratada"}, ${m.esgoto || "fossa séptica"}, ${m.energia || "energia regular"}, ${m.rua || "rua de terra"}. Piso: ${m.piso || "lajota simples"}.</p>
        
        <p><span class="field-label">Há quanto tempo reside no local?</span><br>${m.tempoResidencia || "10 anos"}.</p>
        <p><span class="field-label">Imóvel próprio, alugado ou de terceiro?</span><br>É ${m.proprietarioImovel ? "de " + m.proprietarioImovel : "cedido"}.</p>
        <p><span class="field-label">Trata-se residência habitual ou temporária (de passagem)?</span><br>${m.caraterResidencia || "Residência habitual"}.</p>
        <p><span class="field-label">Especificar que bens guarnecem a residência.</span><br>${m.bensTextoPadrao || "O conjunto de bens descritos demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade."}<br><br>No imóvel continha os seguintes bens: ${m.bensListagem || "Itens básicos de sobrevivência."}</p>

        <div class="section-title" style="page-break-before: always;">DESPESAS cont....</div>
        <p><span class="field-label">Quais os gastos com moradia, água, luz etc.?</span><br>
        <strong>Habitação:</strong> ${desp.habitacaoObs || "Reside em imóvel cedido, sem custos fixos diretos."}<br>
        <strong>Energia elétrica:</strong> ${desp.energiaObs || `Valor mensal de ${this.formatMoney(desp.energia)}.`}<br>
        <strong>Alimentação:</strong> ${desp.alimentacaoObs || `Gasto médio mensal de ${this.formatMoney(desp.alimentacao)}.`}<br>
        <strong>Transporte:</strong> ${desp.transporteObs || "Deslocamentos extraordinários para tratamento de saúde e consultas médicas."}</p>

        <p><span class="field-label">Quais os gastos com saúde (tudo incluído)</span><br>
        ${desp.saudeObs || "Tratamento realizado pelo SUS. O deslocamento frequente é financeiramente inviável com a renda atual, agravando a vulnerabilidade social."}</p>

        <div class="section-title" style="page-break-before: always;">CONCLUSÕES</div>
        <p style="text-align: justify;">${(c.textoParecerComplementar || "Conclui-se que o requerente encontra-se em situação de vulnerabilidade econômica severa, atendendo aos requisitos da legislação assistencial em vigor.").replace(/\n\n/g, "</p><p style='text-align: justify;'>")}</p>

        <p><span class="field-label">Fundamentadamente, se for o caso, classifique a perícia de 1 a 3 de acordo com o grau crescente de complexidade, risco, distância e dificuldade de acesso ao local da perícia:</span><br>
        <strong>RESPOSTA:</strong> ${cl.justificativa || "Grau 3 em virtude da distância e severidade do isolamento geográfico e social."}</p>

        <p>
          Complexidade ${this.cb(cl.complexidade == 1, "1")} ${this.cb(cl.complexidade == 2, "2")} ${this.cb(cl.complexidade == 3, "3")}<br>
          Risco ${this.cb(cl.risco == 1, "1")} ${this.cb(cl.risco == 2, "2")} ${this.cb(cl.risco == 3, "3")}<br>
          Distância ${this.cb(cl.distancia == 1, "1")} ${this.cb(cl.distancia == 2, "2")} ${this.cb(cl.distancia == 3, "3")}<br>
          Dificuldade de acesso ${this.cb(cl.dificuldadeAcesso == 1, "1")} ${this.cb(cl.dificuldadeAcesso == 2, "2")} ${this.cb(cl.dificuldadeAcesso == 3, "3")}<br>
          Situação em local de risco social elevado ${this.cb(cl.riscoSocial == 1, "1")} ${this.cb(cl.riscoSocial == 2, "2")} ${this.cb(cl.riscoSocial == 3, "3")}
        </p>

        <div style="margin-top: 24px;">
          <p><strong>Pericial Social</strong><br>
          Local: ${enc.municipio || "Macapá"}/${enc.uf || "AP"}<br>
          Data da perícia in loco: ${enc.dataPericia || "05 de setembro de 2026"}<br>
          Hora da perícia in loco: ${enc.horaPericia || "08:00 h"}</p>
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <p>____________________________________________________<br>
          <strong>${enc.nomePerito || "Ivonete Ferreira Maciel"}</strong><br>
          ${enc.cargoPerito || "Doutora em Serviço Social"}<br>
          ${enc.cress || "CRESS 104 24ª Região-AP"}</p>
        </div>

        <div class="official-page-footer">
          <span>Rodovia Norte Sul, s/n – Bairro Infraero II, CEP. 68908-911 - Macapá-AP, site: portal.trf1.jus.br/sjap. Fones: 3251-5507</span>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    this.triggerBlobDownload(blob, filename);
    return true;
  }

  /**
   * Constrói o documento Word binário OpenXML via docx.js
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
      ImageRun,
      ShadingType
    } = this.docx;

    const FONT_FAMILY = "Arial";
    const COLOR_TEXT = "000000";
    const COLOR_BORDER = "000000";

    const d = this.data || {};
    const id = d.identificacao || {};
    const sp = d.situacaoPessoal || {};
    const m = d.moradia || {};
    const desp = d.despesas || {};
    const c = d.conclusao || {};
    const cl = d.classificacao || {};
    const enc = d.encerramento || {};

    const createSectionHeader = (title) => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: title, bold: true, size: 21, font: FONT_FAMILY, color: COLOR_TEXT })
      ]
    });

    const createBorderedCell = (content, widthPercent, colSpan = 1) => new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      columnSpan: colSpan,
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
        left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
        right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
      },
      children: Array.isArray(content) ? content : [
        new Paragraph({
          children: [new TextRun({ text: String(content || ""), size: 19, font: FONT_FAMILY })]
        })
      ]
    });

    // Cabeçalho Oficial
    const headerChildren = [];
    if (typeof BRASAO_RAW_BASE64 !== "undefined" && ImageRun) {
      try {
        const binaryString = atob(BRASAO_RAW_BASE64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        headerChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
            children: [
              new ImageRun({
                data: bytes,
                transformation: { width: 440, height: 110 }
              })
            ]
          })
        );
      } catch (e) {
        console.warn("Falha ao embutir imagem do brasão no OpenXML:", e);
      }
    }

    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 180 },
        children: [
          new TextRun({ text: "PERÍCIA SOCIOECONÔMICA", bold: true, size: 23, font: FONT_FAMILY, underline: {} })
        ]
      })
    );

    // Tabela 1: Identificação Judicial em Caixa Única
    const identTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Processo nº ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.processo || "___________________", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Periciado: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.periciado || "___________________", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Representante Legal: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.representanteLegal || "O próprio", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "CPF: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: `${id.cpf || "___.___.___-__"}    `, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: "RG: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: `${id.rg || "________"}    `, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: "COD.F: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: `${id.codF || "________"}    `, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: "NIS: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.nis || "________", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Sexo: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: `${this.cb(id.sexo === "M", "M")}   ${this.cb(id.sexo === "F", "F")}`, size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Data Nascimento: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.dataNascimento || "__/__/____", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "OBJETO: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.objeto || "Benefício de Prestação Continuada- BPC", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Profissão Anterior: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.profissaoAnterior || "Estudante", size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: "\nProfissão Atual: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.profissaoAtual || "Estudante", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 40),
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Estado Civil:\n", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.estadoCivil || "Solteiro", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 30),
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Naturalidade:\n", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.naturalidade || "Macapá/AP", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 30)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Escolaridade: ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.escolaridade || "3 ano fundamental", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 100, 3)
          ]
        }),
        new TableRow({
          children: [
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Endereço da parte (igual ao local da perícia): ", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.endereco || "___________________", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 70, 2),
            createBorderedCell([
              new Paragraph({
                children: [
                  new TextRun({ text: "Telefone:\n", bold: true, size: 19, font: FONT_FAMILY }),
                  new TextRun({ text: id.telefone || "(96) 99151-6520", size: 19, font: FONT_FAMILY })
                ]
              })
            ], 30)
          ]
        })
      ]
    });

    // Seção 2: Situação Pessoal
    const sec2 = [
      createSectionHeader("SITUAÇÃO PESSOAL"),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Está em idade de trabalhar (acima de 16 anos)?\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: sp.idadeTrabalhar === "Não" ? "Não." : (sp.idadeTrabalharQual || "Sim."), size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Realizou cursos profissionalizantes? Especificar.\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: sp.cursosProfissionalizantes === "Não" ? "Não." : (sp.cursosQual || "Sim."), size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Já exerceu atividade remunerada? Especificar.\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: sp.jaExerceuAtividade === "Não" ? "Não." : (sp.jaExerceuQual || "Sim."), size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Teve a CTPS assinada? Especificar.\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: sp.teveCtpsAssinada === "Não" ? "Não." : (sp.teveCtpsDetalhes || "Sim."), size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "CTPS (Nº Série )", bold: true, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createBorderedCell("Nº", 10),
              createBorderedCell("EMPRESA", 30),
              createBorderedCell("CARGO", 25),
              createBorderedCell("ENTRADA", 17),
              createBorderedCell("SAÍDA", 18)
            ]
          }),
          new TableRow({
            children: [
              createBorderedCell("1", 10),
              createBorderedCell("", 30),
              createBorderedCell("", 25),
              createBorderedCell("", 17),
              createBorderedCell("", 18)
            ]
          }),
          new TableRow({
            children: [
              createBorderedCell("2", 10),
              createBorderedCell("", 30),
              createBorderedCell("", 25),
              createBorderedCell("", 17),
              createBorderedCell("", 18)
            ]
          })
        ]
      })
    ];

    // Seção 3: Situação Familiar
    const fam = Array.isArray(d.familia) ? d.familia : [];
    const sec3 = [
      createSectionHeader("SITUAÇÃO FAMILIAR – RENDA DOS INTEGRANTES"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createBorderedCell("NOME COMPLETO", 35),
              createBorderedCell("ESTADO CIVIL", 20),
              createBorderedCell("CPF/NIS", 25),
              createBorderedCell("NASCIMENTO", 20)
            ]
          }),
          ...fam.map(f => new TableRow({
            children: [
              createBorderedCell(f.nome || "-", 35),
              createBorderedCell(f.estadoCivil || "-", 20),
              createBorderedCell(f.cpfNis || "-", 25),
              createBorderedCell(f.idadeNasc || "-", 20)
            ]
          }))
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: "CONTINUAÇÃO", bold: true, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createBorderedCell("PARENTESCO", 25),
              createBorderedCell("OCUPAÇÃO", 35),
              createBorderedCell("RENDA MENSAL", 20),
              createBorderedCell("R. COMPROVADA?", 20)
            ]
          }),
          ...fam.map(f => new TableRow({
            children: [
              createBorderedCell(f.parentesco || "-", 25),
              createBorderedCell(f.ocupacao || "-", 35),
              createBorderedCell(this.formatMoney(f.rendaMensal), 20),
              createBorderedCell(f.tipoRenda || "Declarada", 20)
            ]
          }))
        ]
      }),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: "* “renda mensal bruta familiar: a soma dos rendimentos brutos auferidos mensalmente pelos membros da família composta por salários, proventos, pensões, pensões alimentícias, benefícios de previdência pública ou privada, comissões, pró-labore, outros rendimentos do trabalho não assalariado, rendimentos do mercado informal ou autônomo, rendimentos auferidos do patrimônio, Renda Mensal Vitalícia e Benefício de Prestação Continuada, ressalvado o disposto no parágrafo único do art. 19.” (Art. 4º, VI, do anexo do Decreto nº 6.214/2007).",
            size: 16,
            font: FONT_FAMILY,
            italics: true
          })
        ]
      }),
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: "Quantos possuem carteira de trabalho, CTPS, assinada?\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.carteiraAssinadaFamilia || "Nenhum membro da família possui CTPS assinada atualmente.", size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [
          new TextRun({ text: "Qual a renda familiar per capita mensal? Especificar com cálculo, conforme art. 20 da lei nº. 8.742/93 - LOAS.\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: d.rendaObservacao || `Renda per capita: ${this.formatMoney(d.rendaPerCapita)}.`, size: 20, font: FONT_FAMILY })
        ]
      })
    ];

    // Seção 4: Situação de Moradia
    const sec4 = [
      createSectionHeader("SITUAÇÃO DE MORADIA"),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Reside em quê? Abrigos, asilos ou similares, casa, apartamento etc.\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({
            text: `Reside em casa com construção em ${m.construcao || "alvenaria"}, coberto com ${m.cobertura || "telha de amianto"} e possui ${m.comodos || 5} cômodos ${m.comodosDescricao ? `(${m.comodosDescricao})` : ""}. A residência encontra-se em área ${m.zona || "rural"} do município, de acesso ${m.acesso || "difícil"}. Infraestrutura comunitária: ${m.agua || "Ausência de abastecimento público de água tratada"}, ${m.esgoto || "fossa séptica"}, ${m.energia || "energia regular"}, ${m.rua || "rua de terra com trechos degradados"}. Piso: ${m.piso || "lajota simples com acabamento rústico"}.`,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Há quanto tempo reside no local?\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: m.tempoResidencia || "10 anos", size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Imóvel próprio, alugado ou de terceiro?\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: m.proprietarioImovel ? "É de " + m.proprietarioImovel : "Cedido", size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Trata-se residência habitual ou temporária (de passagem)?\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: m.caraterResidencia || "Residência habitual.", size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Especificar que bens guarnecem a residência.\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${m.bensTextoPadrao || "O conjunto de bens descritos demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade."}\n\nNo imóvel continha os seguintes bens: ${m.bensListagem || "Bens essenciais."}`, size: 20, font: FONT_FAMILY })
        ]
      })
    ];

    // Seção 5: Despesas
    const sec5 = [
      createSectionHeader("DESPESAS cont...."),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: "Quais os gastos com moradia, água, luz etc.?\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `Habitação: ${desp.habitacaoObs || "Reside em imóvel cedido, sem custos diretos de aluguel."}\n`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `Energia elétrica: ${desp.energiaObs || `Valor de ${this.formatMoney(desp.energia)}.`}\n`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `Alimentação: ${desp.alimentacaoObs || `Gasto mensal de ${this.formatMoney(desp.alimentacao)}.`}\n`, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `Transporte: ${desp.transporteObs || "Deslocamentos para consultas médicas e tratamento especializado."}`, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: "Quais os gastos com saúde (tudo incluído)\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: desp.saudeObs || "Tratamento contínuo pelo SUS. A distância e a falta de recursos geram impedimento ao desenvolvimento adequado, caracterizando risco social e a necessidade do amparo assistencial.", size: 20, font: FONT_FAMILY })
        ]
      })
    ];

    // Seção 6: Conclusões e Parecer
    const sec6 = [
      createSectionHeader("CONCLUSÕES"),
      new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [
          new TextRun({ text: c.textoParecerComplementar || "Conclui-se que o requerente atende integralmente aos requisitos do BPC.", size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: "Fundamentadamente, se for o caso, classifique a perícia de 1 a 3 de acordo com o grau crescente de complexidade, risco, distância e dificuldade de acesso ao local da perícia:\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `RESPOSTA: ${cl.justificativa || "Grau 3 justificado pela distância e condições de acesso."}`, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: `Complexidade ${this.cb(cl.complexidade == 1, "1")} ${this.cb(cl.complexidade == 2, "2")} ${this.cb(cl.complexidade == 3, "3")}\n`, size: 19, font: FONT_FAMILY }),
          new TextRun({ text: `Risco ${this.cb(cl.risco == 1, "1")} ${this.cb(cl.risco == 2, "2")} ${this.cb(cl.risco == 3, "3")}\n`, size: 19, font: FONT_FAMILY }),
          new TextRun({ text: `Distância ${this.cb(cl.distancia == 1, "1")} ${this.cb(cl.distancia == 2, "2")} ${this.cb(cl.distancia == 3, "3")}\n`, size: 19, font: FONT_FAMILY }),
          new TextRun({ text: `Dificuldade de acesso ${this.cb(cl.dificuldadeAcesso == 1, "1")} ${this.cb(cl.dificuldadeAcesso == 2, "2")} ${this.cb(cl.dificuldadeAcesso == 3, "3")}\n`, size: 19, font: FONT_FAMILY }),
          new TextRun({ text: `Situação em local de risco social elevado ${this.cb(cl.riscoSocial == 1, "1")} ${this.cb(cl.riscoSocial == 2, "2")} ${this.cb(cl.riscoSocial == 3, "3")}`, size: 19, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: "Pericial Social\n", bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `Local: ${enc.municipio || "Macapá"}/${enc.uf || "AP"}\nData da perícia in loco: ${enc.dataPericia || "05 de setembro de 2026"}\nHora da perícia in loco: ${enc.horaPericia || "08:00 h"}`, size: 20, font: FONT_FAMILY })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 20 },
        children: [
          new TextRun({ text: "____________________________________________________\n", size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${enc.nomePerito || "Ivonete Ferreira Maciel"}\n`, bold: true, size: 20, font: FONT_FAMILY }),
          new TextRun({ text: `${enc.cargoPerito || "Doutora em Serviço Social"}\n`, size: 18, font: FONT_FAMILY }),
          new TextRun({ text: enc.cress || "CRESS 104 24ª Região-AP", size: 18, font: FONT_FAMILY })
        ]
      })
    ];

    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1700,
                right: 1440
              }
            }
          },
          children: [
            ...headerChildren,
            identTable,
            ...sec2,
            ...sec3,
            ...sec4,
            ...sec5,
            ...sec6
          ]
        }
      ]
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PericiaDocxGenerator };
}
