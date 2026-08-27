import { GetServerSideProps } from 'next';
import { PublicDirectory, fetchDirectory } from '../../components/PublicDirectory';

export default function DoctorsPage({ items }: { items: any[] }) {
  return (
    <PublicDirectory
      config={{
        type:'doctor', icon:'',
        title: 'الأطباء',
        description: 'أطباء مرخصون في كل التخصصات — استشارات حضورية وأونلاين بالكاش أو التأمين.',
        itemLine: (e) => [e.specialty, e.city, e.experience_years ? `خبرة ${e.experience_years}+ سنة` : null].filter(Boolean).join(' · '),
        itemBadge: (e) => (e.consultation_fee ? `${e.consultation_fee} ر.س` : null),
      }}
      items={items}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const items = await fetchDirectory('/care/doctors?limit=300');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return { props: { items } };
};
