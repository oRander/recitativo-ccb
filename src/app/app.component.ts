import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';

interface Verse {
  number: number;
  text: string;
  selected: boolean;
}

type BackMode = 'mirror-horizontal' | 'mirror-vertical' | 'rotate-180' | 'same';

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
  recitativeDate = '';
  assistant = '';
  pastedText = `1 O Senhor é o meu pastor; nada me faltará.\n2 Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.\n3 Refrigera a minha alma; guia-me pelas veredas da justiça, por amor do seu nome.\n4 Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.\n5 Preparas uma mesa perante mim na presença dos meus inimigos; unges a minha cabeça com óleo, o meu cálice transborda.\n6 Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na casa do Senhor por longos dias.`;
  backMode: BackMode = 'mirror-horizontal';
  verses = signal<Verse[]>([]);
  error = signal('');

  selectedVerses = computed(() => this.verses().filter((verse) => verse.selected));

  constructor() {
    this.parseVerses();
  }

  parseVerses(): void {
    this.error.set('');
    const normalized = this.pastedText
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!normalized) {
      this.verses.set([]);
      this.error.set('Cole o texto do capítulo para separar os versículos.');
      return;
    }

    const pattern = /(?:^|\n)\s*(\d{1,3})[.º°:\-]?\s+([\s\S]*?)(?=(?:\n\s*\d{1,3}[.º°:\-]?\s+)|$)/g;
    const parsed: Verse[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(normalized)) !== null) {
      parsed.push({
        number: Number(match[1]),
        text: match[2].replace(/\n+/g, ' ').trim(),
        selected: true
      });
    }

    if (parsed.length === 0) {
      this.error.set('Não consegui identificar os versículos. Coloque cada verso em uma linha iniciada pelo número, por exemplo: “1 No princípio...”.');
      this.verses.set([]);
      return;
    }

    this.verses.set(parsed);
  }

  toggleVerse(number: number): void {
    this.verses.update((items) => items.map((item) => item.number === number ? { ...item, selected: !item.selected } : item));
  }

  selectAll(value: boolean): void {
    this.verses.update((items) => items.map((item) => ({ ...item, selected: value })));
  }

  updateVerseText(number: number, text: string): void {
    this.verses.update((items) => items.map((item) => item.number === number ? { ...item, text } : item));
  }

  generateFrontPdf(): void {
    if (!this.validate()) return;
    const pdf = this.createPdf();
    this.drawPages(pdf, 'front');
    pdf.save(this.fileName('frentes'));
  }

  generateBackPdf(): void {
    if (!this.validate()) return;
    const pdf = this.createPdf();
    this.drawPages(pdf, 'back');
    pdf.save(this.fileName('versos'));
  }

  generateCompletePdf(): void {
    if (!this.validate()) return;
    const pdf = this.createPdf();
    this.drawPages(pdf, 'front');
    pdf.addPage();
    this.drawPages(pdf, 'back', false);
    pdf.save(this.fileName('completo'));
  }

  private validate(): boolean {
    this.error.set('');
    if (!this.book.trim() || !this.chapter || !this.recitativeDate || !this.assistant.trim()) {
      this.error.set('Preencha livro, capítulo, data e auxiliar.');
      return false;
    }
    if (this.selectedVerses().length === 0) {
      this.error.set('Selecione pelo menos um versículo.');
      return false;
    }
    return true;
  }

  private createPdf(): jsPDF {
    return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  }

  private drawPages(pdf: jsPDF, side: 'front' | 'back', keepFirstPage = true): void {
    const items = this.selectedVerses();
    const perPage = 10;
    const totalPages = Math.ceil(items.length / perPage);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0 || !keepFirstPage) pdf.addPage();
      const pageItems = items.slice(pageIndex * perPage, pageIndex * perPage + perPage);
      pageItems.forEach((verse, index) => {
        const position = side === 'back' ? this.mapBackPosition(index) : index;
        const { x, y } = this.positionFor(position);
        if (side === 'front') this.drawFront(pdf, x, y, verse);
        else this.drawBack(pdf, x, y, verse);
      });
    }
  }

  private positionFor(index: number): { x: number; y: number } {
    const cardWidth = 90;
    const cardHeight = 55;
    const gapX = 6;
    const marginX = 12;
    const marginY = 11;
    const column = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: marginX + column * (cardWidth + gapX),
      y: marginY + row * cardHeight
    };
  }

  private mapBackPosition(index: number): number {
    const row = Math.floor(index / 2);
    const column = index % 2;

    switch (this.backMode) {
      case 'mirror-horizontal': return row * 2 + (1 - column);
      case 'mirror-vertical': return (4 - row) * 2 + column;
      case 'rotate-180': return (4 - row) * 2 + (1 - column);
      case 'same': return index;
    }
  }

  private drawFront(pdf: jsPDF, x: number, y: number, verse: Verse): void {
    const width = 90;
    const height = 55;
    pdf.setDrawColor(95, 64, 55);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(x, y, width, height, 2, 2);

    pdf.setTextColor(92, 38, 52);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10.5);
    pdf.text('CONGREGAÇÃO CRISTÃ NO BRASIL', x + width / 2, y + 7, { align: 'center' });

    pdf.setTextColor(48, 41, 38);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    this.field(pdf, x + 6, y + 15, 'NOME:', '', 70);
    this.field(pdf, x + 6, y + 23, 'LIVRO:', this.book, 69);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`CAPÍTULO: ${this.chapter}`, x + 6, y + 32);
    pdf.text(`VERSO: ${verse.number}`, x + 52, y + 32);

    pdf.setFont('helvetica', 'normal');
    pdf.text('RECITATIVO PARA O DIA:', x + 6, y + 41);
    pdf.setFont('helvetica', 'bold');
    pdf.text(this.formatDate(this.recitativeDate), x + 46, y + 41);

    pdf.setFont('helvetica', 'normal');
    pdf.text('AUXILIAR:', x + 6, y + 49);
    pdf.setFont('helvetica', 'bold');
    pdf.text(this.assistant, x + 23, y + 49);
  }

  private drawBack(pdf: jsPDF, x: number, y: number, verse: Verse): void {
    const width = 90;
    const height = 55;
    pdf.setDrawColor(95, 64, 55);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(x, y, width, height, 2, 2);

    pdf.setTextColor(92, 38, 52);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.text(`${this.book.toUpperCase()} ${this.chapter}:${verse.number}`, x + width / 2, y + 8, { align: 'center' });

    pdf.setTextColor(45, 38, 35);
    pdf.setFont('times', 'normal');
    const fontSize = verse.text.length > 280 ? 7.6 : verse.text.length > 190 ? 8.4 : verse.text.length > 120 ? 9.3 : 10.2;
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(verse.text, width - 14) as string[];
    const lineHeight = fontSize * 0.42;
    const blockHeight = lines.length * lineHeight;
    const startY = Math.max(y + 16, y + 30 - blockHeight / 2);
    pdf.text(lines, x + width / 2, startY, { align: 'center', lineHeightFactor: 1.25, maxWidth: width - 14 });
  }

  private field(pdf: jsPDF, x: number, y: number, label: string, value: string, lineWidth: number): void {
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x, y);
    const labelWidth = pdf.getTextWidth(label) + 2;
    pdf.line(x + labelWidth, y + 0.8, x + lineWidth, y + 0.8);
    if (value) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, x + labelWidth + 1, y);
    }
  }

  private formatDate(value: string): string {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private fileName(suffix: string): string {
    const safeBook = this.book.trim().toLowerCase().replace(/[^a-z0-9áàâãéèêíïóôõöúçñ]+/gi, '-');
    return `recitativo-${safeBook}-${this.chapter}-${suffix}.pdf`;
  }
}
