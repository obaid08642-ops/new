# External API findings — review batch 01

## Records 100002 and 100004

The Arabic and English product API responses were retrieved from the staging product endpoint with `fields=FULL` and SAR currency. These responses are evidence only; they do not grant medical approval, taxonomy approval, indexing eligibility, or publication eligibility.

### 100002

The Arabic and English responses identify the product as Abilify / aripiprazole 15 mg, 28 tablets. The API exposes prescription status, brand, category, images, price, and extensive medical description fields. Arabic classification is under psychiatric and neurological medicines, while English classification is under CNS. The product is therefore clearly a medicine rather than a supplement for this sampled record, but its medical content remains subject to source and editorial verification. The response also shows `forceOutOfStock` and the prescription label; availability and prescription status must not be copied into a static catalog as permanent facts without a freshness policy.

### 100004

The Arabic and English responses identify the product as ACC Long 600 mg / acetylcysteine 600 mg effervescent tablets, 10 tablets. The API exposes a cough/cold/allergy category, brand, images, price, prescription status, and extensive medical description fields. Arabic and English descriptions are substantially aligned in product identity, active ingredient, strength, dosage form, indications, warnings, and storage text. The content includes medical claims and dosage instructions, so it must remain behind the medical review gate. The response also exposes stock and commerce fields that are time-sensitive and should be separated from the static catalog.

## Decision

The API evidence is sufficient to improve **identity evidence** for these two sample records, but not sufficient by itself to mark them `approved_for_display`, `medical_publish_approved`, or `indexing_eligibility=true`. Dynamic price, stock, prescription state, and commerce fields should not be embedded in immutable locale shards; they belong in a live availability/pricing layer with timestamps.

### 100006

The Arabic and English API responses identify Acetab 25 mg as captopril 25 mg tablets. They expose the heart/hypertension category, brand, prescription and extensive dosage, indication, warning, and storage content. The two language responses are aligned at the product identity level, but the medical content is high-risk and must remain pending medical/editorial verification. The API also contains dynamic price, stock, and commerce fields that must not be copied into immutable shards.

### 100078

The Arabic and English API responses identify Amistop domperidone suspension, 200 ml, under the kids and infants category. The product is marked non-prescription in the API and includes pediatric-use language, age/weight dosing context, and medical claims. This is a sensitive pediatric record; the API evidence supports identity and category evidence but does not authorize a medical claim, dosage recommendation, or publication. It must remain in a pediatric review queue.

## Additional decision

The sample confirms that the raw legacy category `أدوية ومكملات` can contain clear medicines such as aripiprazole, acetylcysteine, and captopril, while `الأم والطفل` can also contain medicines. Therefore, category alone must not determine `product_kind`; identity, dosage form, active ingredient, prescription state, and authoritative evidence need a separate review rule.
