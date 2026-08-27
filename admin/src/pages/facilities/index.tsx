import { GetServerSideProps } from 'next';
import { PublicDirectory, fetchDirectory } from '../../components/PublicDirectory';

export default function FacilitiesPage({ items }: { items: any[] }) {
  return (
    <PublicDirectory
      config={{
        type: 'facility', icon: '',
        title: 'المنشآت الصحية',
        description: 'مستشفيات وعيادات وصيدليات ومعامل ومراكز أشعة معتمدة في منصة نبض.',
        itemLine: (e) => [e.type || e.kind, e.city, e.address].filter(Boolean).join(' · '),
        itemBadge: (e) => (e.rating?` ${e.rating}`: null),
      }}
      items={items}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const items = await fetchDirectory('/care/facilities?limit=300');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return { props: { items } };
};
