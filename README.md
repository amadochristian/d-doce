# D Doce Docinho

Cardápio estático em HTML, CSS e JavaScript, pronto para publicar na Vercel. O carrinho funciona no navegador e o pedido é enviado pela conversa do WhatsApp, sem pagamento ou armazenamento de pedidos no site.

## Rodar localmente

Abra a pasta com uma extensão de servidor local no VS Code, ou execute `npx serve .`. O catálogo usa `catalog.csv` enquanto não houver uma planilha configurada.

## Ligar ao Google Sheets

1. Importe `catalog.csv` para uma nova planilha Google. A primeira linha deve permanecer como cabeçalho: `id,categoria,produto,descricao,preco,foto,disponivel,destaque,ordem`.
2. Em **Arquivo > Compartilhar > Publicar na Web**, escolha a aba do catálogo e o formato **Valores separados por vírgula (.csv)**. A publicação deixa os dados do catálogo acessíveis publicamente; não inclua informações privadas na planilha.
3. Copie a URL CSV publicada e cole em `sheetCsvUrl` dentro de `config.js`.
4. Faça deploy/redeploy. A planilha passa a ser a fonte principal. Se estiver indisponível, o site usa `catalog.csv` como contingência.

Use `SIM`/`NAO` nas colunas `disponivel` e `destaque`. O preço aceita valores como `20`, `20.00` ou `20,00`. Categorias são detectadas a partir das linhas da planilha e ordenadas pela primeira ocorrência; os produtos são ordenados pela coluna `ordem`. Uma linha com `disponivel = NAO` aparece como indisponível por padrão e não pode ser adicionada. Para ocultá-la, altere `showUnavailable` para `false` em `config.js`.

As URLs de foto ficam na coluna `foto`; use links públicos diretos de um serviço de imagens/CDN. As fotos temporárias do CSV são apenas referências visuais de demonstração e devem ser substituídas pelas fotos reais dos produtos.

## Marca e contatos

O número do WhatsApp fica em `config.js` no formato internacional, sem `+` ou pontuação. O Instagram está no `index.html`. A logo oficial não foi incluída nos arquivos recebidos; quando estiver disponível, pode substituir o nome tipográfico no cabeçalho e no rodapé.

## Publicar na Vercel

Importe este repositório na Vercel como projeto estático. Não há dependências, comando de build ou variáveis secretas. O arquivo `vercel.json` mantém URLs limpas e compatibilidade com o deploy estático.