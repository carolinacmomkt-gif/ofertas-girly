-- Gerado por scripts/gerar-seed.mjs. Rode depois de 0001_schema.sql.
begin;
insert into public.admins (email) values ('carolinacmomkt@gmail.com') on conflict do nothing;

insert into public.categorias (nome, slug, ordem) values
  ('Beleza', 'beleza', 1),
  ('Skincare', 'skincare', 2),
  ('Moda', 'moda', 3),
  ('Acessórios', 'acessorios', 4),
  ('Casa', 'casa', 5),
  ('Papelaria', 'papelaria', 6)
on conflict (slug) do nothing;

insert into public.produtos (nome, descricao, categoria_id, preco, preco_antes, desconto, loja, link, foto_url, ordem, ativo, preco_manual, preco_atualizado_em)
select v.nome, v.descricao, c.id, v.preco, v.preco_antes, v.desconto, v.loja, v.link, v.foto_url, v.ordem, v.ativo, v.loja ilike 'shopee', now()
from (values
  ('Massageador facial com LED bivolt', null, 'skincare', null, null, null, 'Shopee', 'https://s.shopee.com.br/1gJL2UaVTD', 'https://down-br.img.susercontent.com/file/br-11134201-820mh-mqx3exgg3090de', 1, true),
  ('Óculos de sol gradiente retangular sem aro', null, 'acessorios', null, null, null, 'Shopee', 'https://s.shopee.com.br/3VkzDrTWka', 'https://down-br.img.susercontent.com/file/sg-11134301-7ra2l-mbnjlvip51sm72', 1, true),
  ('Meleira de vidro transparente 550 ml', null, 'casa', null, null, null, 'Shopee', 'https://s.shopee.com.br/3LRZ1YUA5Z', 'https://down-br.img.susercontent.com/file/br-11134207-7r98o-lyogd8r6big5a6', 1, true),
  ('Kit 4 pratos rasos Oxford Flat Chuvisco 26 cm', null, 'casa', null, null, null, 'Shopee', 'https://s.shopee.com.br/3qNpcTSG4g', 'https://down-br.img.susercontent.com/file/sg-11134201-7rcdg-ltbd5v8rrp2u24', 2, true),
  ('Protetor solar Tocobo SPF50+', null, 'skincare', null, null, null, 'Shopee', 'https://s.shopee.com.br/3g4PQAStPf', 'https://down-br.img.susercontent.com/file/sg-11134207-7qvfq-li3u0vfy2wvrdf', 2, true),
  ('VT Cosmetics Reedle Shot Essence', null, 'skincare', null, null, null, 'Shopee', 'https://s.shopee.com.br/7VH7zFHgXb', 'https://down-br.img.susercontent.com/file/sg-11134207-824iv-me42k70ywk5h28', 3, true),
  ('Ampola Skin1004 Centella Boosting Shot 30 ml', null, 'skincare', null, null, null, 'Shopee', 'https://s.shopee.com.br/5VW3beA508', 'https://down-br.img.susercontent.com/file/sg-11134207-823oz-mp8skoxnur5u6a', 4, true),
  ('Medicube Age-R Booster Pro', null, 'beleza', null, null, null, 'Shopee', 'https://s.shopee.com.br/5LCdPLAiL7', 'https://down-br.img.susercontent.com/file/sg-11134207-81zvt-mmm1f07vr40634', 1, true),
  ('Bolsa de viagem dobrável grande', null, 'acessorios', null, null, null, 'Shopee', 'https://s.shopee.com.br/5q8u0G8oKE', null, 2, true),
  ('Pijama macacão Stitch kigurumi infantil', null, 'moda', null, null, null, 'Shopee', 'https://s.shopee.com.br/5fpTnx9RfD', 'https://down-br.img.susercontent.com/file/f9ad4bd2003c932f9ab70d867675f4ae', 1, true),
  ('Arco modelador de tranças para cabelo', null, 'beleza', null, null, null, 'Shopee', 'https://s.shopee.com.br/AAHtADsJX6', 'https://down-br.img.susercontent.com/file/sg-11134201-8259f-msqdwbktr3m03c', 2, true),
  ('Achadinho Shopee (complete no painel)', null, 'acessorios', null, null, null, 'Shopee', 'https://shope.ee/9zYZl56gQT', null, 3, false)
) as v(nome, descricao, categoria_slug, preco, preco_antes, desconto, loja, link, foto_url, ordem, ativo)
join public.categorias c on c.slug = v.categoria_slug
where not exists (select 1 from public.produtos p where p.link = v.link);
commit;
