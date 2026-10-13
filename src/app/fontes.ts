import { Fraunces, Nunito } from 'next/font/google';

// Fraunces: @, títulos e preços (600 e 800, com itálico para o @ e os títulos das categorias).
export const fonteDisplay = Fraunces({
  subsets: ['latin'],
  weight: ['600', '800'],
  style: ['normal', 'italic'],
  variable: '--fonte-display',
  display: 'swap',
});

// Nunito: todo o resto.
export const fonteCorpo = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--fonte-corpo',
  display: 'swap',
});
