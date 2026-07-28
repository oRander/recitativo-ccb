# Gerador de Recitativos — CCB

Aplicação Angular que separa um capítulo bíblico em versículos e gera cartões frente e verso em PDF.

## O que já funciona

- Um cartão para cada versículo.
- Campo Nome vazio para preenchimento manual.
- Livro, capítulo, data e auxiliar na frente.
- Texto do versículo no verso.
- Seleção e edição dos versículos.
- Folha A4 com 10 cartões de 90 × 55 mm.
- PDF apenas das frentes.
- PDF apenas dos versos.
- PDF completo.
- Quatro modos de posicionamento para impressão frente e verso manual.

## Como executar no Windows

Abra o PowerShell dentro da pasta do projeto e rode:

```powershell
npm install
npm start
```

Depois acesse:

```text
http://localhost:4200
```

## Como colar o capítulo

Cada versículo precisa começar em uma linha com o número:

```text
1 Primeiro versículo...
2 Segundo versículo...
3 Terceiro versículo...
```

## Impressora sem frente e verso automático

1. Gere e imprima o arquivo **Frentes**.
2. Recoloque as folhas impressas na bandeja.
3. Gere e imprima o arquivo **Versos**.
4. Teste primeiro com uma única folha.
5. Caso não alinhe, troque o modo de posição dos versos na tela.

O modo inicial é **Espelhar horizontalmente**, comum quando a folha é virada pela lateral.
