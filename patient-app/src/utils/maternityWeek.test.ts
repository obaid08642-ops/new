import { cdnImage, parseMaternityContent, pickWeekText } from './maternityWeek';

const answer = {
  week: 12,
  week_content: { week: 12, size_ar: 'بحجم الليمونة', size_en: 'About the size of a lime', development_ar: 'نص عربي', development_en: '', image_url: 'https://cdn.nabd.plus/weeks/12.jpg' },
  read_this_week: [{ id: 'a1', slug: 'week-12', title_ar: 'مقال', title_en: 'Article', excerpt_ar: 'ملخص' }, { slug: 'bad slug', title_ar: 'x' }, { slug: 'untitled' }],
};

describe('maternity week content (GET /maternity/content)', () => {
  it('reads the entry in the app language with the other language as fallback', () => {
    expect(parseMaternityContent(answer, 'en').entry).toEqual({ week: 12, size: 'About the size of a lime', development: 'نص عربي', image: 'https://cdn.nabd.plus/weeks/12.jpg' });
    expect(parseMaternityContent({ data: answer }, 'ar').entry?.size).toBe('بحجم الليمونة');
    expect(parseMaternityContent(answer, 'tl').entry?.size).toBe('About the size of a lime');
  });

  it('keeps only articles with a valid slug and a title', () => {
    expect(parseMaternityContent(answer, 'ar').articles).toEqual([{ slug: 'week-12', title: 'مقال', excerpt: 'ملخص' }]);
    expect(parseMaternityContent(answer, 'ur').articles[0]).toEqual({ slug: 'week-12', title: 'Article', excerpt: 'ملخص' });
  });

  it('accepts only https images on the CDN', () => {
    expect(cdnImage('https://res.cloudinary.com/nabd/w.jpg')).toBe('https://res.cloudinary.com/nabd/w.jpg');
    expect(cdnImage('http://cdn.nabd.plus/w.jpg')).toBeNull();
    expect(cdnImage('https://cdn.nabd.plus.evil.com/w.jpg')).toBeNull();
    expect(cdnImage('https://user@cdn.nabd.plus/w.jpg')).toBeNull();
    expect(cdnImage(42)).toBeNull();
  });

  it('answers an honest empty view for an unfilled week, no week or a malformed answer', () => {
    expect(parseMaternityContent({ week: 30, week_content: null, read_this_week: [] }, 'ar')).toEqual({ week: 30, entry: null, articles: [] });
    expect(parseMaternityContent({ week: null, read_this_week: [{ slug: 'x', title_ar: 'x' }] }, 'ar')).toEqual({ week: null, entry: null, articles: [] });
    expect(parseMaternityContent('nope', 'en')).toEqual({ week: null, entry: null, articles: [] });
    expect(pickWeekText('ar', ' ', null)).toBeNull();
  });
});
