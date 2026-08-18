# دليل برومتات مرئيات تطور الجنين في نَبْض — الصور المتبقية فقط

## الغرض وطريقة الاستخدام

هذا الدليل مخصص لإنتاج **20 مرئية أسبوعية أصلية مستقلة متبقية** لتطبيق نَبْض: من `week-16.png` إلى `week-30.png`، ثم من `week-36.png` إلى `week-40.png`. الصور `week-31.png` إلى `week-35.png` **موجودة ومقبولة مرحلياً ومُدمجة بالفعل؛ لا تُنتجها مجدداً في هذه الدفعة**. يجب أن يستخدم الوكيل الآخر **صورة المرجع الموجودة** في المشروع:

```text
/home/ubuntu/nabdah-phase1-work/patient/nabd_plus/assets/images/maternity/fetus-v2/style-reference-week20.png
```

استخدم المرجع **للإضاءة، الخلفية، مستوى الفخامة، المعالجة اللونية، واتساق العرض** فقط. لا تنسخ منه تشريح الأسبوع 20 لأي أسبوع آخر؛ إذ يجب أن يحمل كل أسبوع تطوراً مختلفاً بوضوح.

> **المطلوب هنا هو مرئي PNG ثنائي الأبعاد بأسلوب “3D medical render” عالي الجودة، وليس ملف نموذج ثلاثي الأبعاد حقيقياً** مثل `GLB` أو `USDZ` أو `FBX`. يمكن أن يبدو المجسم ثلاثي الأبعاد بفضل الإضاءة والخامات والعمق، لكنه يبقى لقطة ثابتة. لا تدّعِ أنه ماسح طبي أو جنين حقيقي أو قياس فردي.

الحمل السريري يُحسب عادةً من أول يوم لآخر دورة، ولذلك يسبق العمر المحسوب زمن الإخصاب بنحو أسبوعين. كما أن الأسبوعين 16–27 يقعان في الثلث الثاني والأسابيع 28–40 في الثلث الثالث. [1] [2]

| ثابت الإنتاج | المتطلب غير القابل للتغيير |
|---|---|
| المخرجات | ملف PNG واحد لكل أسبوع، بالاسم `week-XX.png` |
| المقاس والنسبة | `1632 × 2176 px`، عمودي `3:4` |
| المرجع | `style-reference-week20.png` في كل عملية توليد |
| زاوية الكاميرا | غالباً جانب ثلاثي الأرباع ناعم، مع تغيير طفيف متعمد في الدوران والوضعية بين الأسابيع |
| الخلفية | تدرج لؤلؤي هادئ من العاجي إلى الوردي البودري والخوخي، ضباب ضوئي ناعم، بلا رحم مقطعي ولا دم |
| النمط | **premium, realistic, softly stylized 3D medical illustration**؛ ليس كرتوناً ولا صورة ولادة ولا صورة سونار |
| النص والشعارات | ممنوع تماماً داخل الصورة |
| الخصوصية والسلامة | لا جنس ظاهر، لا أعضاء داخلية، لا تشريح جراحي، لا أوعية دموية ظاهرة، لا دم، لا مشيمة أو حبل سري واقعي مزعج |

## البرومت الرئيسي الإلزامي

انسخ الكتلة التالية **كما هي** لكل أسبوع، ثم ألصق بعدها مباشرة فقرة الأسبوع المحددة في القسم التالي. يُفضّل أن يكون البرومت باللغة الإنجليزية لأن نتائج نماذج الصور تكون أدق في هذا النوع من الوصف.

```text
Create one original premium educational prenatal-development still image for the Nabdah pregnancy app.

Use the supplied style-reference image only to match the elegant visual language: a calm ivory, blush-pink and peach gradient atmosphere; soft halo illumination; refined clinical calm; clean, modern, premium medical-education quality. Do not copy the reference fetus pose or age.

Subject: exactly one anatomically respectful human fetus at [INSERT GESTATIONAL WEEK] weeks of gestational age, matching the week-specific anatomy and proportions below. The fetus is gently floating in a natural curled fetal posture with relaxed limbs and a calm neutral expression. Keep the entire fetus visible and centred with generous breathing room; head-to-toe framing, 3/4 side view, subtle depth and gentle rotation. The fetus must look age-appropriate, not like a newborn before the late third trimester.

Visual treatment: highly refined realistic 3D medical illustration, physically plausible soft translucent-to-opaque skin appropriate for the week, pearlescent subsurface softness, sculpted but gentle form, delicate warm peach and rose lighting, smooth clean materials, cinematic studio depth, polished mobile-app hero asset. No text and no labels in the image.

Composition: vertical 3:4, exactly 1632 by 2176 pixels. Background is an abstract, non-anatomical ivory-to-blush-to-peach gradient with a subtle luminous haze and a soft floating halo. The subject occupies approximately 62–72% of image height. Maintain a premium, calm, inclusive and non-alarming healthcare mood.

Strict exclusions: no blood, no open organs, no exposed vessels, no surgery, no placenta close-up, no medical instruments, no ultrasound screen, no mother’s torso cross-section, no pregnancy-belly cutaway, no umbilical cord as the main subject, no genital display, no clinical labels, no logos, no typography, no watermark, no cartoon style, no doll-like plastic texture, no horror, no uncanny face, no adult body proportions, no newborn-sized infant in an early week, no duplicate limbs, no malformed hands, no extra fingers, no missing limbs, no distorted skull, no harsh black background.

Output one clean standalone PNG hero visual only.
```

## البرومت السلبي الإلزامي

إن كان الوكيل أو النموذج يدعم **Negative Prompt**، استخدم هذه الكتلة كاملة بعد البرومت الرئيسي:

```text
cartoon, 2D flat illustration, line drawing, anime, fetus inside transparent womb cutaway, red amniotic fluid, blood, gore, surgery, organs, veins, placenta anatomy, medical specimen, dead fetus, scary face, crying newborn, adult infant proportions, premature newborn clothes, diaper, gender reveal, visible genitals, umbilical cord close-up, multiple fetuses, twins, duplicate arms, duplicate legs, extra fingers, fused fingers, deformed hands, deformed feet, distorted anatomy, malformed skull, face distortion, black void background, dark horror lighting, harsh shadow, text, captions, letters, numbers, watermark, logo, frame, low resolution, blurry, oversharpened skin, wax doll, plastic toy, stock photo, ultrasound image
```

## قواعد التدرج التشريحي قبل البدء

لا يجوز أن يظهر الجنين في الأسابيع 16–24 كطفل حديث الولادة مصغر؛ الرأس يظل أكبر نسبياً، والجلد أدق، والامتلاء أقل. في الثلث الثالث يجب زيادة الامتلاء والدهون تحت الجلد تدريجياً، مع وضعية أكثر تقوساً وانكماشاً بسبب المساحة. في الأسبوع 16 تكون الرأس أكثر استقامة، وتقترب الأذنان من موضعهما النهائي، وتصبح الحركات أكثر تنسيقاً؛ في الأسابيع 17–27 تظهر تدريجياً الأظافر والرموش/الحواجب واللانوجو والفيرنكس وتزداد نعومة الجلد مع اكتساب الدهون. [1] [3]

لا تعرض أي سمة غير قابلة للرؤية في لقطة ثابتة، مثل السمع أو الاستجابة للصوت أو نشاط الدماغ، على هيئة تأثيرات ضوئية أو رموز أو نصوص. عالجها فقط باختيار وضعية هادئة أو يد قريبة من الوجه، من دون ادعاء بصري غير علمي. وتجنب إظهار الأوعية الدموية أو الشفافية القوية حتى في الأسابيع التي يكون فيها الجلد أرق؛ الهدف تجربة صحية راقية غير دموية.

## البرومتات الأسبوعية التفصيلية للصور المتبقية

> في كل صف: انسخ **البرومت الرئيسي الإلزامي**، واستبدل `[INSERT GESTATIONAL WEEK]` برقم الأسبوع، ثم ألصق **ملحق الأسبوع** كاملاً في نهاية البرومت. لا تختصر ملحق الأسبوع. لا تُنتج الأسابيع 31–35 في هذه الدفعة.

| الملف | ملحق الأسبوع القابل للنسخ بالإنجليزية |
|---|---|
| `week-16.png` | **Week-specific anatomy for 16 gestational weeks:** Show an early second-trimester fetus with a still proportionally large rounded head, a more upright neck than earlier weeks, ears close to their final position, gently closed eyelids, a small defined nose and lips, a slim torso, and long but delicate limbs. Use a relaxed side-curled pose: one forearm softly bent near the chest and the other resting along the torso; legs slightly bent. Skin is soft pink-peach, delicate and smooth, not translucent enough to show vessels. Make the fetus clearly smaller, slimmer and less filled-out than weeks 20 onward. |
| `week-17.png` | **Week-specific anatomy for 17 gestational weeks:** Show a slender, gently curled fetus with a large head-to-body ratio that is beginning to balance, thin limbs, clearly separate tiny toes and fingers but no exaggerated detail, and an early suggestion of small toenails. Pose the fetus in a graceful floating turn, with knees loosely bent and one hand near the lower face. Add only a very subtle soft protective-skin sheen; do not make the body plump or newborn-like. Maintain a refined calm face with closed eyelids. |
| `week-18.png` | **Week-specific anatomy for 18 gestational weeks:** Show an age-appropriate mid-second-trimester fetus with slightly more defined ears, gentle facial contour, thin shoulders and limbs, softly flexed hands, and a light fine suggestion of lanugo texture that is visible only as a delicate peach-fuzz softness around the shoulders and upper back. Use a three-quarter side fetal curl with the chin gently tucked and both legs bent. The body remains lean, small and delicate, with no mature cheeks, no open eyes, and no visible vascular anatomy. |
| `week-19.png` | **Week-specific anatomy for 19 gestational weeks:** Show a slim fetus with a noticeably more human proportion than week 16, but still delicate and not chubby. The head remains relatively prominent; eyelids are closed; eyebrows are only faint; fingers are slender and relaxed. Depict a very subtle, elegant pearly protective-skin sheen inspired by early vernix, not thick white coating. Use a peaceful side profile with one hand near the mouth and gentle folded knees. The skin should look smooth rosy-peach with no vessels, no wetness, and no clinical realism that feels alarming. |
| `week-20.png` | **Week-specific anatomy for 20 gestational weeks:** Show the halfway-stage fetus with a harmonious yet still youthful head-to-body proportion, distinct soft nose, lips, ear outline, closed eyes, slender fingers, and a longer torso. Use a classic calm floating fetal curl: spine softly curved, both knees flexed, one hand hovering near the chin, the other resting near the abdomen. The body has a touch more roundness than week 19 but remains slim and developmentally early, not a miniature newborn. Keep a balanced premium hero composition. |
| `week-21.png` | **Week-specific anatomy for 21 gestational weeks:** Show a fetus modestly longer and more coordinated than week 20, with fine lanugo implied as an extremely soft, barely visible velvet texture on shoulders and back, a light natural-looking protective sheen, closed eyes, and longer elegant limbs. Pose: three-quarter side view, thumb or fingers gently close to the mouth without forcing a clear sucking action; legs comfortably folded. Preserve a slim waist and light body mass. Do not show a thick hairy coat, thick vernix, or a mature infant face. |
| `week-22.png` | **Week-specific anatomy for 22 gestational weeks:** Show gentle visual emergence of delicate eyebrows and fine scalp hair without making either dark, long, or adult-like. The facial planes are clearer, the hands are slightly more expressive, and the body has begun a very small increase in fullness while remaining slender. Pose the fetus in a calm mid-turn, one arm curved across the chest and the other lowered, legs flexed asymmetrically. Use closed eyelids, serene expression, subtle peach-fuzz texture, soft rose skin, and an elegant edge light. |
| `week-23.png` | **Week-specific anatomy for 23 gestational weeks:** Show a lean fetus with longer limbs and slightly more defined palms and soles. Keep eyelids closed and facial features soft. The skin should read as thin and gently wrinkled in a tasteful artistic way, but never transparent, red, veiny, wet, or medically graphic. Pose: gentle curled side view, one palm open near the face, toes naturally flexed, clear but tiny individual fingers. Maintain a smaller, fragile but peaceful silhouette—no chubby cheeks and no newborn proportions. |
| `week-24.png` | **Week-specific anatomy for 24 gestational weeks:** Show a longer fetus with a softly wrinkled surface, a delicately rounded forehead, closed eyes, tiny eyelashes only hinted at, and very slim arms and legs. The body should still look light and not heavily padded with fat. Use a balanced three-quarter view with the spine in a smooth C-curve, arms resting inward, and knees drawn toward the abdomen. Skin must remain refined warm pink-beige, matte-satin, and opaque enough for comfort. No visible ribs, veins, organs, or strong translucency. |
| `week-25.png` | **Week-specific anatomy for 25 gestational weeks:** Show the first clearly perceptible gradual softening of the face and body, while retaining a slim mid-second-trimester silhouette. Eyelids remain closed, eyebrows are delicate, and fingers and toes are refined. Pose the fetus with one hand gently resting near the cheek and the other around the abdomen, as if in a quiet resting moment; legs folded and feet relaxed. Create a natural protective-skin sheen and sparse fine lanugo, but keep the rendering polished and minimal rather than hairy or clinical. |
| `week-26.png` | **Week-specific anatomy for 26 gestational weeks:** Show a fetus with more visibly formed eyebrows and eyelashes, a slightly rounder face, and modest increase in soft tissue over the limbs. Keep the eyes fully closed or only implied beneath closed lids; do not show large open eyes. Pose: soft side curl, forearms bent, hands close to face and chest, knees deeply but naturally flexed. The skin is smoother than week 24 but still light and not newborn-plump. Use a premium soft blush glow and clear separation of each small finger without extra digits. |
| `week-27.png` | **Week-specific anatomy for 27 gestational weeks:** Show the transition toward the third trimester with a smoother skin surface, slightly fuller cheeks and limbs, visible fine eyelashes, and a calmer more compact curled posture. If showing the eyes, use only a tiny natural suggestion of partially opened eyelids; a closed-eye pose is preferred to avoid uncanny results. The fetus remains noticeably preterm in proportion and scale, not full-term. Place one hand under the chin and one near the chest, with feet softly crossed or close together. |
| `week-28.png` | **Week-specific anatomy for 28 gestational weeks:** Show the start of the third trimester. The fetus is larger, more rounded, and more compact, with smoother pink-peach skin, fuller upper arms and thighs, soft cheeks, fine eyelashes, and a gentle closed-eye expression. Use a head-down-inspired curl without implying a diagnosis: head resting lower in the frame, chin toward chest, knees drawn upward, hands close to the face. Avoid a newborn scale; the head remains proportionately prominent and the body is still smaller and leaner than weeks 34–40. |
| `week-29.png` | **Week-specific anatomy for 29 gestational weeks:** Show a visibly more compact fetus with modest fat accumulation under smooth skin, rounded calves and forearms, and a relaxed, less stretched pose suggesting reduced room without showing a womb. Position in a gentle diagonal three-quarter view: head slightly downward, one knee near the abdomen, one foot tucked behind, arms softly gathered near the chest. Facial features are soft, eyes closed, lips neutral, hair minimal. The result must be a graceful premium medical render, not a baby-photo portrait. |
| `week-30.png` | **Week-specific anatomy for 30 gestational weeks:** Show increased body roundness and skin smoothness, with a fuller forehead, cheeks, shoulders, thighs and upper arms than week 29. Keep the fetus distinctly fetal: curled spine, knees close to the torso, hands relaxed near chin or chest, head slightly larger relative to body than a newborn. Skin is warm rose-beige, smooth and softly illuminated; only a faint trace of lanugo may remain. Use a mild low-angle three-quarter side view for a clearly different pose from week 29. |
| `week-36.png` | **Week-specific anatomy for 36 gestational weeks:** Show a large, comfortably rounded near-term fetus with little to no visible lanugo, soft short scalp hair, more mature cheeks, smooth warm skin, and limbs tucked tightly due to reduced space. Pose in a peaceful head-down-inspired curl: crown lower in the frame, face in soft side profile, hands near forehead or cheek, legs bent and close. Do not make the fetus a dressed newborn or show mature long hair. The visual must remain a clean educational 3D render. |
| `week-37.png` | **Week-specific anatomy for 37 gestational weeks:** Show an early-term fetus with smooth full skin, proportionally mature cheeks, fuller shoulders and thighs, short fine hair, and toenails that reach the toe tips only as subtle detail. Use a compact, tranquil, head-down-leaning curl with hands gathered near the face and feet neatly tucked. The fetus can look nearly ready for birth but must not be shown as a newborn or outside the body. Keep a respectful calm expression with closed eyelids and no birth-related imagery. |
| `week-38.png` | **Week-specific anatomy for 38 gestational weeks:** Show a very rounded late-term fetus with smooth, soft, opaque skin, fuller cheeks, arms and legs, subtle natural skin folds at wrists and ankles, short fine scalp hair, and a compact fetal posture. Use a gentle frontal three-quarter angle where the face, one hand, and folded knees are visible; avoid direct photographic portrait framing. The body should look a little more filled out than week 37, with a clean pearlescent highlight and serene ivory-blush atmosphere. |
| `week-39.png` | **Week-specific anatomy for 39 gestational weeks:** Show a full-term-appearance fetus, but still clearly within a stylised educational prenatal scene. The body is smoothly rounded and compact, with soft cheeks, gentle short hair, closed eyes, relaxed lips, delicate nails, and naturally curled hands. Use a premium hero composition: fetus in a complete floating curl, head in three-quarter profile, hands near cheek, knees and feet tucked upward. Make this the most balanced, peaceful and refined image in the series; no birth, no crying, no clothing, no diaper, and no external-world context. |
| `week-40.png` | **Week-specific anatomy for 40 gestational weeks:** Show the final expected-due-week prenatal hero visual. The fetus is fully developed in an age-appropriate, softly rounded, compact curl with smooth opaque warm skin, fuller cheeks and limbs, short fine scalp hair, closed eyes, calm face, relaxed hands and curled feet. Use a gently rotated three-quarter side pose distinct from week 39, with the back softly catching the halo light and face turned slightly toward the viewer. It should feel complete, tranquil, premium and hopeful—an educational prenatal image only, never an actual delivery, scan, or individual medical representation. |

## بروتوكول توليد يمنع اختلاف السلسلة

ولكي لا يخرج كل أسبوع بأسلوب مختلف، يجب أن ينفذ الوكيل الخطوات نفسها في كل مرة. يبدأ بتحميل صورة المرجع، ثم يستخدم البرومت الرئيسي والبرومت السلبي وملحق الأسبوع. يطلب **صورة واحدة فقط لكل أسبوع**، ويحفظها بالاسم المحدد. بعد كل توليد، يقارن الصورة الجديدة مباشرة بالصورة السابقة في السلسلة: ينبغي أن يكون الفرق في الحجم والامتلاء ووضعية الجنين تدريجياً، لا قفزة من جنين نحيل إلى رضيع ممتلئ.

| نقطة فحص | قبول | رفض مباشر |
|---|---|---|
| تسلسل الحجم | زيادة بصرية طفيفة ومقنعة من أسبوع إلى الذي يليه | الأسبوع 17 أو 22 يبدو أكبر من 28 أو 32 |
| العمر التشريحي | رأس كبير نسبياً وأطراف أنحف في 16–24، امتلاء متدرج بعد ذلك | طفل حديث ولادة كامل في أي أسبوع قبل 32 |
| الخلفية | عاجي/وردي/خوخي فاتح هادئ متناسق | أسود أو أزرق طبي قاسٍ أو رحم أحمر واقعي |
| الجودة | رندر ثلاثي الأبعاد ناعم، تشريح واضح، عناصر نظيفة | رسم كرتوني، دمية شمعية، وجه مرعب، تشويش أو تشوه |
| الأطراف | ذراعان، ساقان، يدان وقدمان منطقية | أصابع زائدة، أطراف مكررة، التواءات غير ممكنة |
| السلامة | لقطة تعليمية مجردة بلا عناصر طبية صادمة | دم، تشريح داخلي، مشيمة بارزة، جنس ظاهر، نص داخل الصورة |

## التسمية والحفظ

```text
week-16.png
week-17.png
week-18.png
week-19.png
week-20.png
week-21.png
week-22.png
week-23.png
week-24.png
week-25.png
week-26.png
week-27.png
week-28.png
week-29.png
week-30.png
week-36.png
week-37.png
week-38.png
week-39.png
week-40.png
```

## توضيح صريح للحالة الحالية

بعد مراجعة الأرشيف المقدم، تم قبول صور `week-31.png` إلى `week-35.png` **قبولاً مرحلياً** ودمجها في التطبيق. أما صور `week-16.png` إلى `week-30.png` فرفضت للدمج لأنها جعلت الجنين يبدو كرضيع مكتمل مبكراً ولم تُظهر تدرجاً تشريحياً أسبوعياً كافياً؛ كما لم تُرسل صور 36–40. لذلك يقتصر هذا الدليل على إعادة إنتاج **16–30 و36–40 فقط**.

أما الصور الأسبوعية نفسها فهي **لقطات PNG ثابتة** ذات مظهر رندر ثلاثي الأبعاد، وليست نماذج Mesh حقيقية قابلة للتصدير والدوران. يوجد في التطبيق عارض محلي تفاعلي إجرائي يستقبل السحب ويحوّل هندسة بسيطة ثلاثية الأبعاد إلى لقطة منظورية؛ لذلك هو تفاعل ثلاثي الأبعاد فعلي في الواجهة، لكنه **ليس نموذج جنين واقعي عالي الدقة بصيغة GLB/FBX**. إذا كان المطلوب “3D حقيقي” بمستوى تطبيقات متخصصة، فالمرحلة التالية تحتاج لكل أسبوع نموذج `GLB/USDC` مرخصاً أو مصنوعاً فنياً، مع خرائط خامات وقيود هيكلية، وليس صور PNG فقط.

## المراجع

[1]: https://www.mayoclinic.org/healthy-lifestyle/pregnancy-week-by-week/in-depth/fetal-development/art-20046151 "Mayo Clinic — Fetal development: The 2nd trimester"
[2]: https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/ "NHS — Week-by-week guide to pregnancy"
[3]: https://my.clevelandclinic.org/health/articles/7247-fetal-development-stages-of-growth "Cleveland Clinic — Fetal development stages of growth"
