import { PaginaCatalogo } from '@/components/public/PaginaCatalogo';

// A página é regenerada a cada 5 min e na hora em que algo muda no painel.
export const revalidate = 300;

export default function Home() {
  return <PaginaCatalogo />;
}
