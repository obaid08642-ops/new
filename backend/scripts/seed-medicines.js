const { MongoClient } = require('mongodb');

async function seed() {
  const uri = 'mongodb://localhost:27017/nabd';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('nabd');
    const col = db.collection('medicines_master');

    // Clear existing
    await col.deleteMany({});
    console.log('Cleared existing medicines');

    const mockMedicines = [
      {
        id: "1",
        name_ar: "بانادول اكسترا ٥٠٠ مج",
        name_en: "Panadol Extra 500 mg",
        active_ingredient: "باراسيتامول + كافيين",
        category: "medications",
        price: 12.50,
        image: "https://pub-XXXX.r2.dev/panadol.jpg", // Mock R2 URL
        description_ar: "مسكن للآلام وخافض للحرارة",
        requires_prescription: false,
        verified: true,
        form: "أقراص",
        manufacturer: "GSK",
        usage_count: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        name_ar: "فيتامين سي ١٠٠٠ مج",
        name_en: "Vitamin C 1000 mg",
        active_ingredient: "حمض الأسكوربيك",
        category: "supplements",
        price: 45.00,
        image: "https://pub-XXXX.r2.dev/vitaminc.jpg", // Mock R2 URL
        description_ar: "مكمل غذائي لدعم المناعة",
        requires_prescription: false,
        verified: true,
        form: "فوار",
        manufacturer: "Bayer",
        usage_count: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        name_ar: "أوجمنتين ١ جرام",
        name_en: "Augmentin 1g",
        active_ingredient: "أموكسيسيلين + كلافولانات",
        category: "medications",
        price: 78.00,
        image: "https://pub-XXXX.r2.dev/augmentin.jpg", // Mock R2 URL
        description_ar: "مضاد حيوي واسع المجال",
        requires_prescription: true,
        verified: true,
        form: "أقراص",
        manufacturer: "GSK",
        usage_count: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "4",
        name_ar: "بروفين ٤٠٠ مج",
        name_en: "Brufen 400 mg",
        active_ingredient: "إيبوبروفين",
        category: "medications",
        price: 15.00,
        image: "https://pub-XXXX.r2.dev/brufen.jpg", // Mock R2 URL
        description_ar: "مسكن ومضاد للالتهابات",
        requires_prescription: false,
        verified: true,
        form: "أقراص",
        manufacturer: "Abbott",
        usage_count: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await col.insertMany(mockMedicines);
    console.log('Successfully seeded 4 medicines!');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.close();
  }
}

seed();
