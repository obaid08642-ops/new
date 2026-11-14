import { buildVariantGroups, comparePower, parseVariantName } from './variant-grouping';

/** Owner decision D (issue 1556): one product with a picker for records that differ by power, colour or shade. */
describe('parseVariantName', () => {
  it('reads a lens power with two decimals, any sign spelling', () => {
    expect(parseVariantName('Diva Lenses Hazel Gray -2.50')).toMatchObject({ power: -2.5, colour: 'hazel gray', base: 'diva lenses', context: 'lens' });
    expect(parseVariantName('Diva Lens Brown (−3.00)')).toMatchObject({ power: -3, colour: 'brown', base: 'diva lens' });
    expect(parseVariantName('Diva Contact Lens Ocean Blue Power +1.25')).toMatchObject({ power: 1.25, colour: 'ocean blue', base: 'diva contact lens' });
    expect(parseVariantName('Diva Lens Gray Plano')).toMatchObject({ power: 0, colour: 'gray' });
  });

  it('never reads a pack or a weight as a power, nor a colour outside lenses and lip products', () => {
    expect(parseVariantName('Acretin Cream 0.025% - 30 Gm').power).toBeUndefined();
    expect(parseVariantName('Green Tea Shampoo 250 ml')).toEqual({ base: 'green tea shampoo 250 ml', context: null });
    expect(parseVariantName('Diva Lens Box -30 Pieces').power).toBeUndefined();
  });

  it('reads a lip shade code, or a colour word as the shade', () => {
    expect(parseVariantName('Maybelline Lip Tint Shade 03')).toMatchObject({ shade: '03', base: 'maybelline lip tint', context: 'lip' });
    expect(parseVariantName('Essence Lip Tint No. 12')).toMatchObject({ shade: '12', base: 'essence lip tint' });
    expect(parseVariantName('Essence Lip Tint Cherry')).toMatchObject({ shade: 'cherry', base: 'essence lip tint' });
  });

  it('a Lensme name with no colour keeps no attribute (the colour is only in the picture)', () => {
    expect(parseVariantName('Lensme Monthly Lenses 2 Pcs')).toEqual({ base: 'lensme monthly lenses 2 pcs', context: 'lens' });
  });
});

describe('buildVariantGroups', () => {
  const diva = [
    { id: 'd3', sku: 3, name_en: 'Diva Lenses Brown -1.00', manufacturer: 'Diva' },
    { id: 'd1', sku: 1, name_en: 'Diva Lenses Hazel Gray -2.50', manufacturer: 'Diva' },
    { id: 'd2', sku: 2, name_en: 'Diva Lenses Hazel Gray -0.25', manufacturer: 'Diva' },
    { id: 'd4', sku: 4, name_en: 'Diva Lenses Hazel Gray +1.50', manufacturer: 'Diva' },
  ];
  const lensme = [
    { id: 'l1', sku: 11, name_en: 'Lensme Monthly Lenses 2 Pcs', manufacturer: 'Lensme', images: ['l1-green.webp'] },
    { id: 'l2', sku: 12, name_en: 'Lensme Monthly Lenses 2 Pcs', manufacturer: 'Lensme', images: ['l2-blue.webp'] },
  ];

  it('groups Diva by colour then power, sorted minus (−0.25 down), then plus', () => {
    const [g] = buildVariantGroups(diva);
    expect(g.kind).toBe('colour_power');
    expect(g.variant_group).toMatch(/^vg_[0-9a-f]{16}$/);
    expect(g.members.map((m) => m.id)).toEqual(['d3', 'd2', 'd1', 'd4']);
    expect(g.members.map((m) => m.variant.position)).toEqual([0, 1, 2, 3]);
    expect(g.members[1].variant).toMatchObject({ kind: 'colour_power', colour: 'hazel gray', power: -0.25 });
    expect(g.conflicts).toEqual([]);
  });

  it('groups same-name lenses that differ only by picture, with no invented colour', () => {
    const [g] = buildVariantGroups(lensme);
    expect(g.kind).toBe('picture');
    expect(g.members.map((m) => m.variant)).toEqual([
      { kind: 'picture', position: 0, source: 'name_en-parse-2026-10' },
      { kind: 'picture', position: 1, source: 'name_en-parse-2026-10' },
    ]);
  });

  it('is idempotent: the same records in any order give the same groups', () => {
    const a = buildVariantGroups([...diva, ...lensme]);
    const b = buildVariantGroups([...lensme, ...diva].reverse());
    expect(b).toEqual(a);
  });

  it('leaves alone: single records, same-name non-lens duplicates, other makers, same-picture copies', () => {
    expect(buildVariantGroups([
      { id: 'x1', name_en: 'Panadol 500 mg', manufacturer: 'GSK' },
      { id: 'x2', name_en: 'Panadol 500 mg', manufacturer: 'GSK' },
      { id: 'y1', name_en: 'Diva Lenses Brown -1.00', manufacturer: 'Diva' },
      { id: 'y2', name_en: 'Diva Lenses Brown -1.25', manufacturer: 'Other' },
      { id: 'z1', name_en: 'Newlens Color 2 Pcs', manufacturer: 'Newlens', images: ['same.webp'] },
      { id: 'z2', name_en: 'Newlens Color 2 Pcs', manufacturer: 'Newlens', images: ['same.webp'] },
    ])).toEqual([]);
  });

  it('reports two records with the same power and colour as a conflict for the owner', () => {
    const [g] = buildVariantGroups([...diva, { id: 'd5', sku: 5, name_en: 'Diva Lenses Brown -1.00', manufacturer: 'Diva' }]);
    expect(g.conflicts).toEqual([['d3', 'd5']]);
  });

  it('comparePower: plano, minus from −0.25 down, then plus', () => {
    expect([1.5, -0.25, 0, -10, -2.5].sort(comparePower)).toEqual([0, -0.25, -2.5, -10, 1.5]);
  });
});
