import { GetServerSideProps } from 'next';
import { PublicDirectory, fetchDirectory } from '../../components/PublicDirectory';

export default function ArticlesPage({ items }: { items: any[] }) {
  return (
    <PublicDirectory
      config={{
        type: 'article', icon: '',
        title: 'المقالات الصحية',
        description: 'محتوى صحي موثوق: وقاية، تغذية، أمومة وطفولة، أمراض مزمنة، وصحة نفسية.',
        itemLine: (e) => e.excerpt_ar || [e.category, (e.tags || []).join(' · ')].filter(Boolean).join(' · '),
        itemBadge: (e) => (e.category || null),
      }}
      items={items}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const items = await fetchDirectory('/articles?limit=50');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return { props: { items } };
};
