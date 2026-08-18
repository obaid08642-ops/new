import { GetServerSideProps } from 'next';
import { PublicDirectory, fetchDirectory } from '../../components/PublicDirectory';

export default function HomeCareServicesPage({ items }: { items: any[] }) {
  return (
    <PublicDirectory
      config={{
        type: 'home-care-service', icon: '',
        title: 'الرعاية المنزلية',
        description: 'تمريض وعلاج طبيعي ورعاية منزلية مرخصة تصلك حتى باب المنزل.',
        itemLine: (e) => [e.category, e.duration].filter(Boolean).join(' · '),
        itemBadge: (e) => (e.price ? `${e.price} ر.س` : null),
      }}
      items={items}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const items = await fetchDirectory('/home-care/services');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return { props: { items } };
};
