# StreamVault Analytics Upgrade

## O que foi adicionado
- Curva de retenção segundo a segundo
- Filtros por período: hoje, ontem, 7d, 14d, 30d
- Análise de abandono por momento do vídeo
- Métrica de tempo médio de visualização
- Insights automáticos para otimizar conteúdo

## Arquivos
- `index.html` → painel/admin + analytics + embed standalone
- `embed.js` → custom element `<sv-player>` com tracking
- `setup.sql` → inclui a tabela `video_events`

## Como atualizar
1. Rode o novo `setup.sql` no SQL Editor do Supabase.
2. Suba o novo `index.html` e o novo `embed.js` no Netlify.
3. Reabra o painel.
4. Vá na aba `Analytics`.

## Como os dados são coletados
O `embed.js` e o modo iframe registram eventos na tabela `video_events`:
- play
- pause
- progress
- ended
- abandon

Com isso o painel calcula retenção, abandono e tempo médio.

## Observação
As policies continuam abertas para simplificar seu uso pessoal. Se depois quiser, dá para fechar com autenticação.
