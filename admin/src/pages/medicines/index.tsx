import { GetServerSideProps } from 'next';
import { PublicDirectory, fetchDirectory } from '../../components/PublicDirectory';

export default function MedicinesPage({ items }: { items: any[] }) {
  return (
    <PublicDirectory
      config={{
        type: 'medicine', icon: '',
        title: 'الأدوية والمنتجات',
        description: 'قاعدة معرفة دوائية: التركيب، دواعي الاستعمال، التداخلات، البدائل، والأسعار.',
        itemLine: (e) => [e.active_ingredient || e.generic_name, e.manufacturer].filter(Boolean).join(' · '),
        itemBadge: (e) => (e.price ? `${e.price} ر.س` : null),
      }}
      items={items}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const items = await fetchDirectory('/medicines');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return { props: { items } };
};
