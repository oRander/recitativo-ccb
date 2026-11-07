import * as cheerio from 'cheerio';

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      const acao = url.searchParams.get('acao');

      if (acao === 'livros') {
        return await buscarLivros();
      }

      const livro = url.searchParams.get('livro');
      const capitulo = url.searchParams.get('capitulo');

      if (!livro || !capitulo) {
        return Response.json(
          {
            erro: 'Informe livro e capitulo.'
          },
          {
            status: 400,
            headers: corsHeaders()
          }
        );
      }

      return await buscarCapitulo(livro, capitulo);

    } catch (error) {
      console.error(error);

      return Response.json(
        {
          erro: 'Erro interno.'
        },
        {
          status: 500,
          headers: corsHeaders()
        }
      );
    }
  }
};

async function buscarCapitulo(livro, capitulo) {
  const origem =
    `https://bibliaccb.com.br/livro/${livro}/${capitulo}`;

  const response = await fetch(origem, {
    headers: {
      'User-Agent': 'Mozilla/5.0 RecitativoCCB/1.0'
    }
  });

  if (!response.ok) {
    return Response.json(
      {
        erro: `Bíblia CCB respondeu ${response.status}`
      },
      {
        status: 502,
        headers: corsHeaders()
      }
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const versos = [];

  $('.versicle-description[data-number]').each(
    (_, elemento) => {
      const numero = Number(
        $(elemento).attr('data-number')
      );

      const textoBruto =
      $(elemento).attr('data-value') ||
      $(elemento).text();

    const texto = cheerio
    .load(`<div>${textoBruto}</div>`)
    .text()
    .replace(/^\s*\d+\s*/, '')
    .replace(/Loading\.\.\./gi, '')
    .replace(/\d+\s+palavras?\s+no\s+dicionário\s+para\s+este\s+versículo/gi, '')
    .replace(/\s+-\s+[A-Za-zÀ-ÿ]+\.\s+\d+:\d+\s*$/, '')
    .replace(/\s*\(\d+%\)/g, '')
    .trim();

      if (numero > 0 && texto) {
        versos.push({
          number: numero,
          text: texto
        });
      }
    }
  );

  if (versos.length === 0) {
    return Response.json(
      {
        erro: 'Nenhum versículo encontrado.'
      },
      {
        status: 404,
        headers: corsHeaders()
      }
    );
  }

  return Response.json(
    {
      livro,
      capitulo: Number(capitulo),
      quantidade: versos.length,
      versos
    },
    {
      headers: corsHeaders()
    }
  );
}

async function buscarLivros() {
  const response = await fetch(
    'https://bibliaccb.com.br/livro/gen',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 RecitativoCCB/1.0'
      }
    }
  );

  if (!response.ok) {
    return Response.json(
      {
        erro: 'Não foi possível buscar os livros.'
      },
      {
        status: 502,
        headers: corsHeaders()
      }
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const mapa = new Map();

  $('a[href^="/livro/"]').each(
    (_, elemento) => {
      const href =
        $(elemento).attr('href') ?? '';

      const texto =
        $(elemento).text().trim();

      const match =
        href.match(/^\/livro\/([^/?#]+)$/);

      if (!match || !texto) {
        return;
      }

      const codigo = match[1];

      if (!mapa.has(codigo)) {
        mapa.set(codigo, {
          name: texto,
          code: codigo
        });
      }
    }
  );

  const livros =
    Array.from(mapa.values());

  return Response.json(
    {
      quantidade: livros.length,
      livros
    },
    {
      headers: corsHeaders()
    }
  );
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}