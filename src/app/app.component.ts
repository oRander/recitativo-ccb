import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';

interface Verse {
  number: number;
  text: string;
  selected: boolean;
}

interface BibleBook {
  name: string;
  code: string;
}

type BackMode =
  | 'mirror-horizontal'
  | 'mirror-vertical'
  | 'rotate-180'
  | 'same';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  book = 'Salmos';
  chapter = 23;

  books = signal<BibleBook[]>([]);

  selectedBookCode = '';

  loadingBooks = signal(false);
  loadingChapter = signal(false);

  recitativeDate = '';
  assistant = '';

  backMode: BackMode = 'mirror-horizontal';

  verses = signal<Verse[]>([]);
  error = signal('');

  selectedVerses = computed(() =>
    this.verses().filter((verse) => verse.selected)
  );

  constructor() {
    this.carregarLivros();
  }

  async carregarLivros(): Promise<void> {
    this.loadingBooks.set(true);
    this.error.set('');

    try {
      const response = await fetch(
        'https://recitativo-ccb-api.vercel.app/api/biblia?acao=livros'
      );

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      this.books.set(data.livros ?? []);

      if (this.books().length > 0) {
        const salmos = this.books().find(
          (item) => item.code === 'sal'
        );

        const initialBook =
          salmos ?? this.books()[0];

        this.book = initialBook.name;
        this.selectedBookCode = initialBook.code;
        this.chapter = 23;
      }

    } catch (error) {
      console.error(
        'Erro ao carregar livros:',
        error
      );

      this.error.set(
        'Não foi possível carregar a lista de livros.'
      );

    } finally {
      this.loadingBooks.set(false);
    }
  }

  async buscarCapitulo(): Promise<void> {
    this.error.set('');

    if (!this.selectedBookCode) {
      this.error.set(
        'Selecione um livro.'
      );
      return;
    }

    if (!this.chapter || this.chapter < 1) {
      this.error.set(
        'Informe um capítulo válido.'
      );
      return;
    }

    this.loadingChapter.set(true);

    try {
      const url =
        `https://recitativo-ccb-api.vercel.app/api/biblia` +
        `?livro=${this.selectedBookCode}` +
        `&capitulo=${this.chapter}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          this.error.set(
            'Capítulo não encontrado.'
          );
          return;
        }

        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const data = await response.json();

      if (
        !data.versos ||
        data.versos.length === 0
      ) {
        this.error.set(
          'Nenhum versículo encontrado.'
        );
        return;
      }

      const versos: Verse[] =
        data.versos.map(
          (
            verse: {
              number: number | string;
              text: string;
            }
          ) => ({
            number: Number(verse.number),
            text: verse.text,
            selected: true
          })
        );

      const selectedBook =
        this.books().find(
          (item) =>
            item.code ===
            this.selectedBookCode
        );

      if (selectedBook) {
        this.book = selectedBook.name;
      }

      this.verses.set(versos);

    } catch (error) {
      console.error(
        'Erro ao buscar capítulo:',
        error
      );

      this.error.set(
        'Não foi possível buscar este capítulo.'
      );

    } finally {
      this.loadingChapter.set(false);
    }
  }

  toggleVerse(number: number): void {
    this.verses.update((items) =>
      items.map((item) =>
        item.number === number
          ? {
              ...item,
              selected: !item.selected
            }
          : item
      )
    );
  }

  selectAll(value: boolean): void {
    this.verses.update((items) =>
      items.map((item) => ({
        ...item,
        selected: value
      }))
    );
  }

  updateVerseText(
    number: number,
    text: string
  ): void {
    this.verses.update((items) =>
      items.map((item) =>
        item.number === number
          ? {
              ...item,
              text
            }
          : item
      )
    );
  }

  generateFrontPdf(): void {
    if (!this.validate()) {
      return;
    }

    const pdf = this.createPdf();

    this.drawPages(
      pdf,
      'front'
    );

    pdf.save(
      this.fileName('frentes')
    );
  }

  generateBackPdf(): void {
    if (!this.validate()) {
      return;
    }

    const pdf = this.createPdf();

    this.drawPages(
      pdf,
      'back'
    );

    pdf.save(
      this.fileName('versos')
    );
  }

  generateCompletePdf(): void {
    if (!this.validate()) {
      return;
    }

    const pdf = this.createPdf();

    this.drawPages(
      pdf,
      'front'
    );

    pdf.addPage();

    this.drawPages(
      pdf,
      'back',
      false
    );

    pdf.save(
      this.fileName('completo')
    );
  }

  private validate(): boolean {
    this.error.set('');

    if (
      !this.book.trim() ||
      !this.chapter ||
      !this.recitativeDate ||
      !this.assistant.trim()
    ) {
      this.error.set(
        'Preencha livro, capítulo, data e auxiliar.'
      );

      return false;
    }

    if (
      this.selectedVerses().length === 0
    ) {
      this.error.set(
        'Selecione pelo menos um versículo.'
      );

      return false;
    }

    return true;
  }

  private createPdf(): jsPDF {
    return new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  private drawPages(
    pdf: jsPDF,
    side: 'front' | 'back',
    keepFirstPage = true
  ): void {

    const items =
      this.selectedVerses();

    const perPage = 10;

    const totalPages =
      Math.ceil(
        items.length / perPage
      );

    for (
      let pageIndex = 0;
      pageIndex < totalPages;
      pageIndex++
    ) {
      if (
        pageIndex > 0 ||
        !keepFirstPage
      ) {
        pdf.addPage();
      }

      const pageItems =
        items.slice(
          pageIndex * perPage,
          pageIndex * perPage + perPage
        );

      pageItems.forEach(
        (verse, index) => {

          const position =
            side === 'back'
              ? this.mapBackPosition(index)
              : index;

          const { x, y } =
            this.positionFor(position);

          if (side === 'front') {
            this.drawFront(
              pdf,
              x,
              y,
              verse
            );
          } else {
            this.drawBack(
              pdf,
              x,
              y,
              verse
            );
          }
        }
      );
    }
  }

  private positionFor(
    index: number
  ): {
    x: number;
    y: number;
  } {

    const cardWidth = 105;
    const cardHeight = 59.4;

    const column =
      index % 2;

    const row =
      Math.floor(index / 2);

    return {
      x:
        column *
        cardWidth,

      y:
        row *
        cardHeight
    };
  }

  private mapBackPosition(
    index: number
  ): number {

    const row =
      Math.floor(index / 2);

    const column =
      index % 2;

    switch (this.backMode) {

      case 'mirror-horizontal':
        return (
          row * 2 +
          (1 - column)
        );

      case 'mirror-vertical':
        return (
          (4 - row) * 2 +
          column
        );

      case 'rotate-180':
        return (
          (4 - row) * 2 +
          (1 - column)
        );

      case 'same':
        return index;
    }
  }

  private drawFront(
    pdf: jsPDF,
    x: number,
    y: number,
    verse: Verse
  ): void {

    const width = 105;
    const height = 59.4;

    // ==========================
    // LINHAS DE DIVISÃO / CORTE
    // ==========================

    pdf.setDrawColor(
      210,
      210,
      210
    );

    pdf.setLineWidth(
      0.3
    );

    pdf.line(
      x + width,
      y,
      x + width,
      y + height
    );

    pdf.line(
      x,
      y + height,
      x + width,
      y + height
    );

    // ==========================
    // TÍTULO
    // ==========================

    pdf.setTextColor(
      20,
      20,
      20
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      10.5
    );

    pdf.text(
      'CONGREGAÇÃO CRISTÃ NO BRASIL',
      x + width / 2,
      y + 7,
      {
        align: 'center'
      }
    );

    const left =
      x + 3;

    const right =
      x + width - 4;

    // Tamanho padrão dos rótulos
    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      9.2
    );

    // ==========================
    // NOME
    // ==========================

    pdf.text(
      'NOME:',
      left,
      y + 15
    );

    pdf.line(
      left + 13,
      y + 15.7,
      right,
      y + 15.7
    );

    // ==========================
    // LIVRO
    // ==========================

    pdf.text(
      'LIVRO:',
      left,
      y + 22
    );

    pdf.line(
      left + 13,
      y + 22.7,
      right,
      y + 22.7
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      10.7
    );

    pdf.text(
      this.book,
      left + 15,
      y + 22
    );

    // ==========================
    // CAPÍTULO
    // ==========================

    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      9.2
    );

    pdf.text(
      'CAPÍTULO:',
      left,
      y + 29
    );

    pdf.line(
      left + 20,
      y + 29.7,
      left + 35,
      y + 29.7
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      10.7
    );

    pdf.text(
      String(this.chapter),
      left + 23,
      y + 29
    );

    // ==========================
    // VERSOS
    // ==========================

    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      9.2
    );

    pdf.text(
      'VERSOS:',
      left + 37,
      y + 29
    );

    pdf.line(
      left + 53,
      y + 29.7,
      left + 68,
      y + 29.7
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      10.7
    );

    pdf.text(
      String(verse.number),
      left + 56,
      y + 29
    );

    // ==========================
    // AO
    // ==========================

    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      9.2
    );

    pdf.text(
      'AO',
      left + 70,
      y + 29
    );

    pdf.line(
      left + 77,
      y + 29.7,
      right,
      y + 29.7
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      10.7
    );

    pdf.text(
      String(verse.number),
      left + 80,
      y + 29
    );

    // ==========================
    // APÓS
    // ==========================

    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      9.2
    );

    pdf.text(
      'APÓS:',
      left,
      y + 36
    );

    pdf.line(
      left + 13,
      y + 36.7,
      right,
      y + 36.7
    );

    // ==========================
    // DATA
    // ==========================

    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      9.2
    );

    pdf.text(
      'RECITATIVO PARA O DIA:',
      left,
      y + 43
    );

    pdf.line(
      left + 46,
      y + 43.7,
      right,
      y + 43.7
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      10.3
    );

    pdf.text(
      this.formatDate(
        this.recitativeDate
      ),
      left + 48,
      y + 43
    );

    // ==========================
    // AUXILIAR
    // ==========================

    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      9.2
    );

    pdf.text(
      'AUXILIAR:',
      left,
      y + 50
    );

    pdf.line(
      left + 19,
      y + 50.7,
      right,
      y + 50.7
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      10.7
    );

    pdf.text(
      this.assistant,
      left + 21,
      y + 50
    );
  }

  private drawBack(
    pdf: jsPDF,
    x: number,
    y: number,
    verse: Verse
  ): void {

    const width = 105;
    const height = 59.4;

    // Linhas de divisão / corte
    pdf.setDrawColor(
      210,
      210,
      210
    );

    pdf.setLineWidth(
      0.3
    );

    pdf.line(
      x + width,
      y,
      x + width,
      y + height
    );

    pdf.line(
      x,
      y + height,
      x + width,
      y + height
    );

    // Referência
    pdf.setTextColor(
      20,
      20,
      20
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(
      9.5
    );

    pdf.text(
      `${this.book.toUpperCase()} ${this.chapter}:${verse.number}`,
      x + width / 2,
      y + 8,
      {
        align: 'center'
      }
    );

    // Texto
    pdf.setFont(
      'times',
      'normal'
    );

    pdf.setTextColor(
      20,
      20,
      20
    );

    const availableWidth =
      width - 14;

    const fontSize =
      verse.text.length > 350
        ? 7
        : verse.text.length > 260
          ? 7.5
          : verse.text.length > 180
            ? 8
            : verse.text.length > 110
              ? 8.8
              : 9.5;

    pdf.setFontSize(
      fontSize
    );

    const lines =
      pdf.splitTextToSize(
        verse.text,
        availableWidth
      ) as string[];

    const lineHeight =
      fontSize * 0.42;

    const blockHeight =
      lines.length *
      lineHeight;

    const contentTop =
      y + 13;

    const contentBottom =
      y + height - 5;

    const availableHeight =
      contentBottom -
      contentTop;

    let startY =
      contentTop +
      (
        availableHeight -
        blockHeight
      ) / 2;

    if (
      startY <
      contentTop
    ) {
      startY =
        contentTop;
    }

    pdf.text(
      lines,
      x + width / 2,
      startY,
      {
        align: 'center',
        lineHeightFactor: 1.25,
        maxWidth: availableWidth
      }
    );
  }

  private formatDate(
    value: string
  ): string {

    if (!value) {
      return '';
    }

    const [
      year,
      month,
      day
    ] =
      value.split('-');

    const meses = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro'
    ];

    const nomeMes =
      meses[Number(month) - 1];

    return `${Number(day)} de ${nomeMes} de ${year}`;
  }

  private fileName(
    suffix: string
  ): string {

    const safeBook =
      this.book
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9áàâãéèêíïóôõöúçñ]+/gi,
          '-'
        );

    return `recitativo-${safeBook}-${this.chapter}-${suffix}.pdf`;
  }
}