// Função agendada do Netlify: a cada 10 minutos chama a rotina de preços do site.
// Cada chamada atualiza uma fatia dos produtos (os de coleta mais antiga primeiro),
// então todos ficam com o preço de no máximo ~2 h atrás.
// Só roda no site publicado (não em deploy preview nem no `netlify dev`).

export default async () => {
  const site = process.env.URL;
  const segredo = process.env.CRON_SECRET;
  if (!site || !segredo) {
    console.error('Configure CRON_SECRET nas variáveis de ambiente do Netlify.');
    return;
  }
  const res = await fetch(`${site}/api/cron/precos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${segredo}` },
  });
  console.log('Rotina de preços:', res.status, await res.text());
};

export const config = { schedule: '*/10 * * * *' };
