// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Modal, Image as RNImage } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge } from '../../src/components/ui';
import { Image } from 'expo-image';
import { apiFetch } from '../../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FETUS_DATA } from '../../src/data/fetus-data';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const { width } = Dimensions.get('window');

// 40-Week Medical Database in Arabic
const WEEKS_DATA: Record<number, {
  size: string;
  len: string;
  weight: string;
  stage: string;
  desc: string;
  milestones: string[];
  tips: string[];
}> = {
  1: {
    size: 'بذرة خشخاش', len: '0.1 مم', weight: 'أقل من 1 جم', stage: 'الثلث الأول',
    desc: 'تبدأ الدورة الشهرية وتجهيز بطانة الرحم للاحتضان وتكبير الجريب.',
    milestones: ['انقسام الخلية البكر في اتجاه الرحم', 'تجهيز بطانة الرحم وتثبيت الهرمونات'],
    tips: ['تناولي حمض الفوليك (400 ميكروجرام) يومياً.', 'تجنبي التدخين والكافيين تماماً.']
  },
  2: {
    size: 'بذرة سمسم', len: '0.2 مم', weight: 'أقل من 1 جم', stage: 'الثلث الأول',
    desc: 'تحدث عملية الإباضة وتلتقي البويضة بالحيوان المنوي لتشكيل الزيجوت.',
    milestones: ['حدوث التخصيب وانقسام النواة الأولى', 'تحرك البويضة الملقحة نحو جدار الرحم'],
    tips: ['حافظي على علاقة زوجية منتظمة في أيام الخصوبة.', 'احرصي على تناول الفيتامينات والمعادن.']
  },
  3: {
    size: 'بذرة خردل', len: '0.3 مم', weight: 'أقل من 1 جم', stage: 'الثلث الأول',
    desc: 'تنغرس البويضة المخصبة (الكيسة الأريمية) في بطانة الرحم الغنية بالدم.',
    milestones: ['انغراس الكيسة الأريمية وتثبيت الحمل أولياً', 'بدء إفراز هرمون الحمل HCG'],
    tips: ['قد تشعرين بنزف الانغراس الخفيف وهو طبيعي.', 'تجنبي المجهود البدني العنيف.']
  },
  4: {
    size: 'بذرة خشخاش كبيرة', len: '1 مم', weight: 'أقل من 1 جم', stage: 'الثلث الأول',
    desc: 'يتكون الأنبوب العصبي الذي سيشكل الدماغ والحبل الشوكي للجنين.',
    milestones: ['تكون الطبقات الجنينية الثلاث الأساسية', 'تكون الأنبوب العصبي والحبل الشوكي البدائي'],
    tips: ['قومي بعمل اختبار حمل منزلي لتأكيد النتيجة.', 'احجزي موعدك الأول مع الطبيبة.']
  },
  5: {
    size: 'حبة سمسم', len: '2 مم', weight: 'أقل من 1 جم', stage: 'الثلث الأول',
    desc: 'يبدأ القلب البدائي بالنبض، وتتشكل براعم صغيرة ستصبح الأطراف.',
    milestones: ['النبض الأول للقلب البدائي للجنين', 'تكون الحبل السري الأولي لتغذية الجنين'],
    tips: ['ابدئي المتابعة الدورية والفحوصات الطبية الأولى.', 'تناولي وجبات خفيفة لمقاومة الغثيان الصباحي.']
  },
  6: {
    size: 'حبة عدس', len: '5 مم', weight: 'أقل من 1 جم', stage: 'الثلث الأول',
    desc: 'تتشكل ملامح الوجه الأولية مثل تجاويف العينين والأنف والأذنين.',
    milestones: ['انقسام الدماغ لثلاثة أجزاء رئيسية', 'تطور ملامح الوجه البدائية وظهور نقطتي العينين'],
    tips: ['تناولي وجبات صغيرة مقسمة على مدار اليوم.', 'اشربي الزنجبيل الدافئ لتخفيف الغثيان.']
  },
  7: {
    size: 'حبة عنب بري', len: '1.2 سم', weight: '1 جم', stage: 'الثلث الأول',
    desc: 'يتضاعف حجم الدماغ، وتبدأ الأصابع الصغيرة بالظهور في براعم اليدين.',
    milestones: ['تكون نصفي الكرة المخية وتضاعف خلايا الدماغ', 'تكون الغدة الدرقية وبراعم الأصابع البدائية'],
    tips: ['تجنبي الروائح النفاذة التي تثير الغثيان.', 'حافظي على روتين ترطيب خفيف للبشرة.']
  },
  8: {
    size: 'حبة فاصوليا', len: '1.6 سم', weight: '2 جم', stage: 'الثلث الأول',
    desc: 'تتشكل جميع الأعضاء الأساسية، وتتكون الغضاريف اللينة لعظام الجنين.',
    milestones: ['تكون المرفقين والركبتين وبداية حركات غير محسوسة', 'تطور شبكية العين وبداية بناء هيكل الأذن الداخلية'],
    tips: ['احصلي على قسط كافٍ من النوم والراحة.', 'اهتمي بتناول الألياف لتجنب الإمساك.']
  },
  9: {
    size: 'حبة زيتون', len: '2.3 سم', weight: '3 جم', stage: 'الثلث الأول',
    desc: 'يختفي الذيل الجنيني تماماً، وتتكون العضلات ليبدأ الجنين بالحركة.',
    milestones: ['اختفاء الذيل الجنيني وتطور الجهاز العضلي', 'تكون بصيلات الشعر وبراعم التذوق في اللسان'],
    tips: ['اشربي الكثير من السوائل والماء (على الأقل 2 لتر يومياً).', 'احرصي على تناول الحليب المدعم.']
  },
  10: {
    size: 'حبة برقوق', len: '3.1 سم', weight: '4 جم', stage: 'الثلث الأول',
    desc: 'تكتمل الأعضاء الحيوية وتبدأ بالعمل، وتظهر الأظافر الصغيرة جداً.',
    milestones: ['بدء عمل الكبد والكليتين لإفراز البول والصفراء', 'تكون مفاصل الأطراف وأظافر الأصابع الدقيقة'],
    tips: ['مارسي رياضة المشي الخفيف لتنشيط الدورة الدموية.', 'تجنبي الوقوف الطويل أو المفاجئ.']
  },
  11: {
    size: 'حبة تين', len: '4.1 سم', weight: '7 جم', stage: 'الثلث الأول',
    desc: 'يستطيع الجنين فتح وإغلاق فمه والبلع، وتتكون الأسنان اللبنية تحت اللثة.',
    milestones: ['تكون الأسنان اللبنية تحت خط اللثة الجنيني', 'تطور الأعضاء التناسلية الخارجية داخلياً'],
    tips: ['اهتمي بالأطعمة الغنية بالكالسيوم لنمو العظام.', 'احرصي على فحص مستوى فيتامين د.']
  },
  12: {
    size: 'حبة ليمون', len: '5.4 سم', weight: '14 جم', stage: 'الثلث الأول',
    desc: 'تكتمل ردود الأفعال ويحرك يديه، وتعمل الكلى بشكل كامل لإنتاج البول.',
    milestones: ['اكتمال ردود الأفعال الانعكاسية (فتح وقفل قبضة اليد)', 'تكون الغدة النخامية وبدء إفراز الهرمونات'],
    tips: ['هذا آخر أسبوع في الثلث الأول، سيبدأ الغثيان بالتحسن قريباً.', 'استشيري طبيبتك حول فيتامينات الثلث الثاني.']
  },
  13: {
    size: 'قرن بازلاء', len: '7.4 سم', weight: '23 جم', stage: 'الثلث الثاني',
    desc: 'تظهر البصمات المميزة على الأصابع، وتتشكل الحبال الصوتية للحنجرة.',
    milestones: ['تكون البصمات على أصابع اليدين والقدمين', 'تكون الحبال الصوتية البدائية وتطور البنكرياس'],
    tips: ['ابدئي بالإعلان عن الحمل للمقربين إذا كنتِ جاهزة.', 'اهتمي بتناول مكملات الحديد والبروتينات.']
  },
  14: {
    size: 'حبة ليمون هندي', len: '8.7 سم', weight: '43 جم', stage: 'الثلث الثاني',
    desc: 'بداية الثلث الثاني، تظهر تعبيرات الوجه المتنوعة ويبدأ الشعر بالنمو.',
    milestones: ['نمو زغب الشعر الناعم لحماية الجلد (Lanugo)', 'القدرة على مص الإبهام والعبوس والابتسام'],
    tips: ['استغلي طاقة الثلث الثاني في تنظيم وجباتك ونشاطك الخفيف.', 'نامي على وسائد مريحة لدعم الظهر.']
  },
  15: {
    size: 'حبة تفاح', len: '10.1 سم', weight: '70 جم', stage: 'الثلث الثاني',
    desc: 'يشعر بالضوء الخارجي من خلال جفونه المغلقة، وتتطور حاسة التذوق.',
    milestones: ['حساسية العين للضوء الخارجي بالرغم من إغلاق الجفون', 'تكون الهيكل العظمي الغضروفي وبدء تصلبه'],
    tips: ['ارتدي ملابس قطنية فضفاضة ومريحة.', 'تابعي ضغط الدم بانتظام لتجنب الارتفاع المفاجئ.']
  },
  16: {
    size: 'حبة أفوكادو', len: '11.6 سم', weight: '100 جم', stage: 'الثلث الثاني',
    desc: 'يضخ القلب كميات كبيرة من الدم، وقد تشعرين بحركات خفيفة للجنين.',
    milestones: ['ضخ القلب لحوالي 25 لتر من الدم يومياً', 'الشعور بأولى حركات الجنين الخفيفة (الرفرفة)'],
    tips: ['احجزي موعد السونار التفصيلي التشريحي (Anomaly Scan).', 'تجنبي الاستلقاء على الظهر لفترات طويلة.']
  },
  17: {
    size: 'حبة لفت', len: '13 سم', weight: '140 جم', stage: 'الثلث الثاني',
    desc: 'تتكون طبقة دهنية تحت جلد الجنين لحمايته ودفئه، وتقوى العظام.',
    milestones: ['تراكم الدهون البنية المفيدة تحت الجلد وعزل الحرارة', 'تصلب عظام الأذن الوسطى وبداية نقل الأصوات'],
    tips: ['احرصي على النوم على الجانب الأيسر لدعم تدفق الدم للمشيمة.', 'تناولي أطعمة غنية بـ أوميجا 3.']
  },
  18: {
    size: 'حبة فلفل حلو', len: '14.2 سم', weight: '190 جم', stage: 'الثلث الثاني',
    desc: 'تتطور حاسة السمع ويمكنه سماع نبضات قلبك والضوضاء الخارجية بوضوح.',
    milestones: ['تطور السمع الكامل وسماع نبضات قلبك والأصوات الخارجية', 'تكون طبقة الميالين حول الحبل الشوكي لحمايته'],
    tips: ['تحدثي مع جنينك واقرئي له بصوت هادئ.', 'تجنبي الأصوات العالية والضوضاء المزعجة.']
  },
  19: {
    size: 'حبة طماطم كبيرة', len: '15.3 سم', weight: '240 جم', stage: 'الثلث الثاني',
    desc: 'تتكون طبقة الطلاء الدهني لحماية بشرته الحساسة من السائل الأمنيوسي.',
    milestones: ['تكون طلاء الفيرنكس الدهني (Vernix) لحماية الجلد', 'تطور الحواس الخمس في الدماغ (المناطق المخصصة لها)'],
    tips: ['استخدمي كريمات طبيعية لترطيب بطنك ومنع علامات التمدد.', 'حافظي على شرب الماء بانتظام.']
  },
  20: {
    size: 'حبة موز', len: '25 سم', weight: '300 جم', stage: 'الثلث الثاني',
    desc: 'منتصف الحمل! يبتلع الجنين السائل الأمنيوسي، وتتطور دورات النوم واليقظة.',
    milestones: ['ابتلاع السائل لتمرين الجهاز الهضمي والبلع', 'تكون دورات نوم ويقظة شبيهة بالأطفال حديثي الولادة'],
    tips: ['تأكدي من عمل فحص الدم والحديد للاطمئنان على مستويات الهيموجلوبين.', 'خذي قسطاً من الراحة عند التعب.']
  },
  21: {
    size: 'حبة جزر', len: '26.7 سم', weight: '360 جم', stage: 'الثلث الثاني',
    desc: 'يزداد نشاط وحركة الجنين، ويبدأ نخاع العظم بإنتاج خلايا الدم.',
    milestones: ['إنتاج خلايا الدم الحمراء بواسطة نخاع العظم بدلاً من الكبد', 'تطور حركة الجنين لتشمل الركل والتقلب بوضوح'],
    tips: ['ارفعي قدميك عند الجلوس لتقليل تورم الكاحلين.', 'تجنبي الوقوف الطويل والمستمر.']
  },
  22: {
    size: 'حبة كوسة كبيرة', len: '27.8 سم', weight: '430 جم', stage: 'الثلث الثاني',
    desc: 'تتطور حاسة اللمس، وتظهر الحواجب والرموش بشكل واضح وجلي.',
    milestones: ['ظهور الحواجب والرموش والشفتين بملامح واضحة', 'استكشاف الجنين لمحيطه بلمس جدار الرحم والوجه'],
    tips: ['احرصي على تناول اللحوم الحمراء والسبانخ لزيادة مخزون الحديد.', 'مارسي تمارين كيجل بعد استشارة الطبيبة.']
  },
  23: {
    size: 'حبة مانجو', len: '28.9 سم', weight: '500 جم', stage: 'الثلث الثاني',
    desc: 'يبدأ الجنين بالتفاعل السريع مع الأصوات والحركة المحيطة بالأم.',
    milestones: ['تطور الأذن الداخلية وسرعة الاستجابة للصوت الخارجي', 'تكون الأوعية الدموية في الرئة استعداداً للتنفس'],
    tips: ['حافظي على هدوئك وتجنبي التوتر لأنه يؤثر على نبض الجنين.', 'احرصي على ترطيب الجسم.']
  },
  24: {
    size: 'كوز ذرة', len: '30 سم', weight: '600 جم', stage: 'الثلث الثاني',
    desc: 'تتكون الأكياس الهوائية في الرئتين، وتبدأ البشرة بالامتلاء التدريجي بالدهون.',
    milestones: ['تكون أكياس الرئة الهوائية وبداية إفراز مادة السورفاكتانت', 'امتلاء البشرة والجلد بالدهون ليصبح أقل تجعداً'],
    tips: ['قومي بعمل فحص تحمل الجلوكوز لتشخيص سكر الحمل في هذا الوقت.', 'استمري في تناول الفيتامينات.']
  },
  25: {
    size: 'حبة قرنبيط', len: '34.6 سم', weight: '660 جم', stage: 'الثلث الثاني',
    desc: 'يستجيب الجنين لصوت الأم بشكل مميز، وتمتلئ الأطراف بالدهون تدريجياً.',
    milestones: ['الاستجابة الحركية والقلبية المباشرة لصوت الأم والوالد', 'تطور بنية المخ والاتصالات العصبية المعقدة'],
    tips: ['تجنبي النوم تماماً على الظهر، واعتمدي الجانب الأيسر.', 'احرصي على وجبات تحتوي على الكالسيوم.']
  },
  26: {
    size: 'حبة خس', len: '35.6 سم', weight: '760 جم', stage: 'الثلث الثاني',
    desc: 'تبدأ العينان بالانفتاح التدريجي، وتستعد الرئتان لعملية التنفس الأولى.',
    milestones: ['انفتاح جفون العينين وتطور الجهاز العصبي البصري', 'استنشاق الجنين للسائل الأمنيوسي لتمرين الرئتين'],
    tips: ['مارسي تمارين التمدد الخفيفة للتخلص من آلام أسفل الظهر.', 'تجنبي المجهود الشديد.']
  },
  27: {
    size: 'حبة باذنجان', len: '36.6 سم', weight: '875 جم', stage: 'الثلث الثاني',
    desc: 'نهاية الثلث الثاني، ينتظم نشاط الدماغ وتتطور دورات النوم بوضوح كبير.',
    milestones: ['انتظام نشاط الموجات الدماغية وتطور النوم العميق', 'اكتمال نمو الهيكل البصري وقدرته على الرمش'],
    tips: ['ابدئي بتجهيز حقيبة الولادة والتسوق لمستلزمات الرضيع.', 'احرصي على المتابعة الدورية.']
  },
  28: {
    size: 'حبة قرنبيط كبيرة', len: '37.6 سم', weight: '1.0 كجم', stage: 'الثلث الثالث',
    desc: 'بداية الثلث الثالث، يفتح عينيه ويغمضهما ويرى الضوء المتسرب عبر جدار البطن.',
    milestones: ['تطور القدرة على الإبصار وتمييز الضوء المتسرب', 'بدء إنتاج خلايا الدم الحمراء بالكامل في نخاع العظام'],
    tips: ['تابعي حركة الجنين يومياً (يجب ألا تقل عن 10 حركات في ساعتين).', 'تجنبي الوجبات الحارة لمنع الحموضة.']
  },
  29: {
    size: 'حبة كرنب', len: '38.6 سم', weight: '1.2 كجم', stage: 'الثلث الثالث',
    desc: 'تقوى العضلات وتكتمل الرئتان تدريجياً، ويحتاج الجنين للمزيد من الكالسيوم.',
    milestones: ['تطور القوة العضلية وركلات قوية تشعر بها الأم بوضوح', 'تراكم الكالسيوم بكثافة في عظام الجنين لبنائها'],
    tips: ['تناولي الحليب والأجبان بكثرة لدعم عظام الجنين.', 'احرصي على تمارين التنفس والاسترخاء.']
  },
  30: {
    size: 'حبة كوسة كبيرة جداً', len: '39.9 سم', weight: '1.3 كجم', stage: 'الثلث الثالث',
    desc: 'ينمو الدماغ بسرعة وتتشكل تلافيفه، ويبدأ زغب الشعر بالاختفاء من الجسم.',
    milestones: ['تطور تلافيف الدماغ وزيادة سرعة النبضات العصبية', 'تساقط زغب الشعر الجنيني الناعم وبقاء طلاء الفيرنكس'],
    tips: ['تجنبي حمل الأشياء الثقيلة لحماية أسفل ظهرك وحوضك.', 'جهزي رقم الطبيب والطوارئ في مكان بارز.']
  },
  31: {
    size: 'حبة أناناس', len: '41.1 سم', weight: '1.5 كجم', stage: 'الثلث الثالث',
    desc: 'تكتمل الحواس الخمس تماماً، ويستطيع تتبع الضوء وتدوير الرأس بالداخل.',
    milestones: ['اكتمال عمل الحواس الخمس وإرسال الإشارات للدماغ', 'توجيه الرأس وتدويره نحو مصادر الضوء القريبة'],
    tips: ['قللي من تناول الموالح والمخللات لتجنب احتباس السوائل.', 'ارفعي قدميك كلما أتيحت الفرصة.']
  },
  32: {
    size: 'حبة قرع شتوي', len: '42.4 سم', weight: '1.7 كجم', stage: 'الثلث الثالث',
    desc: 'يتدرب الجنين على التنفس ببلع وطرد السائل، ويتخذ وضعية الرأس للأسفل.',
    milestones: ['اتخاذ الجنين لوضعية الرأس للأسفل (Cephalic) استعداداً للولادة', 'تصلب معظم العظام باستثناء عظام الجمجمة المرنة'],
    tips: ['اجعلي زيارات المتابعة الطبية كل أسبوعين من الآن فصاعداً.', 'احرصي على المشي الخفيف اليومي.']
  },
  33: {
    size: 'حبة كرفس', len: '43.7 سم', weight: '1.9 كجم', stage: 'الثلث الثالث',
    desc: 'تقوى عظام الجمجمة مع بقائها مرنة لتسهيل الولادة عبر القناة المهبلية.',
    milestones: ['بقاء عظام الجمجمة غير ملتحمة لتتداخل أثناء المخاض', 'تطور الجهاز المناعي الذاتي عبر نقل الأجسام المضادة للأم'],
    tips: ['تجنبي الجلوس الطويل دون حركة لتفادي جلطات الساق وتورم القدمين.', 'اشربي الكثير من الماء.']
  },
  34: {
    size: 'حبة جوز هند', len: '45 سم', weight: '2.1 كجم', stage: 'الثلث الثالث',
    desc: 'يكتمل نمو الجهاز العصبي المركزي وتستقر الرئتان بشكل شبه كامل ومستقر.',
    milestones: ['نضوج الرئتين الكامل وقدرتهما على التنفس الذاتي', 'تطور الجهاز العصبي المركزي وتنسيق حركات التنفس والبلع'],
    tips: ['تأكدي من تجهيز حقيبة المستشفى وأغراض الرضيع بالكامل.', 'احصلي على قسط وافر من الراحة والنوم.']
  },
  35: {
    size: 'حبة شمام', len: '46.2 سم', weight: '2.4 كجم', stage: 'الثلث الثالث',
    desc: 'يكتسب الجنين وزناً سريعاً وتصبح أطرافه ممتلئة وبشرته وردية وناعمة.',
    milestones: ['تراكم الدهون تحت الجلد ليصبح ناعماً ووردياً بالكامل', 'نمو أظافر اليدين لتغطي أطراف الأصابع بالكامل'],
    tips: ['تعرفي على أعراض الطلق الفعلي والفرق بينه وبين الطلق الكاذب.', 'تابعي حركة الجنين بدقة.']
  },
  36: {
    size: 'حبة خس روماني', len: '47.4 - 48 سم', weight: '2.6 كجم', stage: 'الثلث الثالث',
    desc: 'ينزل الجنين إلى الحوض، ويقل معدل حركاته القوية بسبب ضيق المساحة.',
    milestones: ['نزول رأس الجنين في تجويف الحوض (Engagement)', 'اكتمال نمو كافة أجهزة الجسم واستقرار الوزن'],
    tips: ['احرصي على مراجعة الطبيبة أسبوعياً لمتابعة نبض الجنين وعنق الرحم.', 'تجنبي المجهود الزائد.']
  },
  37: {
    size: 'حبة سلق سويسري', len: '48.6 سم', weight: '2.9 كجم', stage: 'الثلث الثالث',
    desc: 'يعتبر الحمل مكتملاً سريرياً، والرئتان جاهزتان للتنفس خارج الرحم تماماً.',
    milestones: ['اكتمال الحمل سريرياً (Full Term Baby)', 'جاهزية الرئتين والجهاز الهضمي للعمل المستقل خارج الرحم'],
    tips: ['المشي اليومي الخفيف يساعد على فتح الحوض وتسهيل الولادة.', 'تناولي التمر لفوائده لعضلات الرحم.']
  },
  38: {
    size: 'حبة قرع كبير', len: '49.8 سم', weight: '3.1 كجم', stage: 'الثلث الثالث',
    desc: 'يتساقط معظم الشعر الناعم والطلاء الدهني، ويستمر الكبد والكلية بالعمل بانتظام.',
    milestones: ['تساقط كافة الشعر الناعم والطلاء الدهني في السائل الأمنيوسي', 'تكون قبضة يد قوية جداً للجنين وتطور منعكس المص'],
    tips: ['استرخي وخذي حماماً دافئاً لتخفيف آلام الظهر وتشنجات الحوض.', 'حافظي على ترطيب بشرتك.']
  },
  39: {
    size: 'حبة بطيخ صغير', len: '50.7 سم', weight: '3.3 كجم', stage: 'الثلث الثالث',
    desc: 'يكتمل نمو الجنين تماماً، ويصبح قادراً على قبض يده بقوة استعداداً للمخاض والولادة.',
    milestones: ['اكتمال بناء الأجهزة واستقرار الوزن النهائي للجنين', 'تراكم الأجسام المضادة للأم لضمان مناعة قوية للرضيع'],
    tips: ['كوني على تواصل مستمر مع طبيبتك ومستشفى الولادة.', 'راقبي نزول أي سوائل أو إفرازات غريبة.']
  },
  40: {
    size: 'حبة يقطين كبيرة', len: '51.2 سم', weight: '3.5 كجم', stage: 'الثلث الثالث',
    desc: 'موعد الولادة المتوقع! الجنين بكامل نموه وجاهز لبدء حياته في العالم الخارجي.',
    milestones: ['جاهزية الجنين الكاملة للخروج والولادة الطبيعية', 'بلوغ الوزن والطول المتوسط المثالي لحديثي الولادة'],
    tips: ['تمنياتنا لك بولادة ميسرة وطفل سليم! استرخي وامشي بانتظام.', 'اتبعي كافة إرشادات فريقك الطبي بالمستشفى.']
  }
};



export default function BabyDevelopmentScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  const [selectedWeek, setSelectedWeek] = useState(28);
  const [is3DMode, setIs3DMode] = useState(false);

  // Gesture Values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow pan if zoomed in
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ] as any
    };
  });

  useEffect(() => {
    async function loadCurrentWeek() {
      try {
        let profile = await apiFetch('/maternity/profile').catch(() => null);
        if (!profile) {
          const local = await AsyncStorage.getItem('nabd_maternity_profile');
          if (local) profile = JSON.parse(local);
        }
        
        if (profile && profile.is_pregnant) {
          const lmp = profile.last_period_date ? new Date(profile.last_period_date) : null;
          const dueDate = profile.due_date && profile.due_date !== 'transparent' ? new Date(profile.due_date) : null;
          const today = new Date();
          let calcWeek = profile.current_week || 4;
          if (lmp) {
            const diffTime = Math.abs(today.getTime() - lmp.getTime());
            calcWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
          } else if (dueDate) {
            const diffTime = dueDate.getTime() - today.getTime();
            const weeksLeft = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            calcWeek = 40 - weeksLeft;
          }
          calcWeek = Math.max(1, Math.min(40, calcWeek));
          setSelectedWeek(calcWeek);
        } else if (profile && profile.current_week) {
          setSelectedWeek(profile.current_week);
        }
      } catch (err) {
        console.error('Failed to load current week from backend', err);
      }
    }
    loadCurrentWeek();
  }, []);

  const data = WEEKS_DATA[selectedWeek] || WEEKS_DATA[28];

  const handlePrevWeek = () => {
    if (selectedWeek > 1) setSelectedWeek(selectedWeek - 1);
  };

  const handleNextWeek = () => {
    if (selectedWeek < 40) setSelectedWeek(selectedWeek + 1);
  };

  const getFruitEmoji = (week: number) => {
    const emojis: Record<number, string> = {
      1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '', 10: '',
      11: '', 12: '', 13: '', 14: '', 15: '', 16: '', 17: '', 18: '', 19: '', 20: '',
      21: '', 22: '', 23: '', 24: '', 25: '', 26: '', 27: '', 28: '', 29: '', 30: '',
      31: '', 32: '', 33: '', 34: '', 35: '', 36: '', 37: '', 38: '', 39: '', 40: ''
    };
    return emojis[week] || '';
  };

  // Convert numbers to Arabic representation
  const ar = (num: number | string) => {
    const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, w => arabicNums[+w]);
  };

  // Trimester check
  const trimesterColor = selectedWeek <= 12 ? '#23B5CE' : selectedWeek <= 27 ? '#7A6BEA' : '#EC4899';
  const progressPct = (selectedWeek / 40) * 100;

  // Dark mode background color adaptation
  const adaptivePinkBg = isDark ? '#4D0E2B' : '#FDF2F8';
  const cardBg = isDark ? colors.surface : colors.white;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h5" color="#fff">تطور ونمو الجنين</AppText>
          <View style={{ width: 36 }}/>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Dynamic Vector Visualization Card */}
        <View style={[styles.vizCard, { backgroundColor: cardBg } ]}>
          <View style={styles.visualContainer}>
            {is3DMode ? (
              <WebView 
                source={{ uri: 'https://sketchfab.com/models/65c36bfa26324e2ebab8259eaed7a2f3/embed?autostart=1&ui_controls=0&ui_infos=0&ui_inspector=0&ui_watermark=0&transparent=1' }} style={styles.fetusImage}
                scrollEnabled={false}
              />
            ) : (
              <GestureDetector gesture={composedGesture}>
                <Animated.View style={styles.fetusBox}>
                  <AnimatedImage 
                    source={FETUS_DATA[selectedWeek]?.image_path || FETUS_DATA[17]?.image_path} 
                    style={[styles.fetusImage, animatedImageStyle as any]} 
                    contentFit="contain"
                    transition={300}
                  />
                </Animated.View>
              </GestureDetector>
            )}

            <TouchableOpacity 
              style={[styles.toggle3DButton, { backgroundColor: is3DMode ? '#EC4899' : (isDark ? colors.backgroundSecondary : '#FFF') }]}
              onPress={() => setIs3DMode(!is3DMode)}
            >
              <AppText variant="caption" color={is3DMode ? '#FFF' : colors.textPrimary} style={{ fontWeight: 'bold' }}>
                {is3DMode ? 'إغلاق 3D' : 'مجسم 3D'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Instruction Label */}
          {!is3DMode && (
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.rotateLabel, { backgroundColor: isDark ? colors.backgroundSecondary : '#FCE8F1', borderWidth: 1, borderColor: '#FBC4D6' } ]}>
                <Icon name="search" size={14} color="#EC4899" />
                <AppText variant="caption" color="#EC4899" style={{ fontFamily: 'Cairo-Bold' }}>بإمكانك تكبير وتصغير الصورة (Pinch & Zoom)</AppText>
              </View>
              <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 8, fontSize: 10 }}>
                هذه الصورة قد تكون مجرد صورة توضيحية وليست دقيقة بالضرورة
              </AppText>
            </View>
          )}

          {/* Week & Stage Details */}
          <AppText variant="h3" style={styles.weekTitle}>الأسبوع {ar(selectedWeek)}</AppText>
          <Badge label={data.stage} color="#fff" bg={trimesterColor} style={styles.stageBadge} />
        </View>

        {/* Week Navigator Controller */}
        <View style={[styles.controllerCard, { backgroundColor: cardBg } ]}>
          <View style={styles.controlRow}>
            <TouchableOpacity onPress={handleNextWeek} style={[styles.navBtn, { borderColor: colors.border, backgroundColor: isDark ? colors.backgroundSecondary : colors.white } ]}>
              <Icon name="chevron_left" size={20} color="#EC4899" />
            </TouchableOpacity>
            
            <View style={styles.sliderContainer}>
              <View style={styles.sliderLineBg}>
                <View style={[styles.sliderLineFill, { width: `${progressPct}%`, backgroundColor: trimesterColor }]} />
                <View style={[styles.sliderKnob, { left: `${progressPct}%`, backgroundColor: trimesterColor }]} />
              </View>
            </View>

            <TouchableOpacity onPress={handlePrevWeek} style={[styles.navBtn, { borderColor: colors.border, backgroundColor: isDark ? colors.backgroundSecondary : colors.white } ]}>
              <Icon name="chevron_right" size={20} color="#EC4899" />
            </TouchableOpacity>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: isDark ? colors.backgroundSecondary : '#FDF4E0' } ]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <AppText variant="caption" color={colors.textSecondary}>بحجم تقريباً</AppText>
                <AppText variant="h6">{getFruitEmoji(selectedWeek)}</AppText>
              </View>
              <AppText variant="labelLG" color="#F0A526" style={{ marginTop: 2 }}>{data.size}</AppText>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? colors.backgroundSecondary : '#EBF6E9' } ]}>
              <AppText variant="caption" color={colors.textSecondary}>الوزن المقدر</AppText>
              <AppText variant="labelLG" color="#5BA84F" style={{ marginTop: 2 }}>{data.weight}</AppText>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? colors.backgroundSecondary : '#E8F1FB' } ]}>
              <AppText variant="caption" color={colors.textSecondary}>الطول المقدر</AppText>
              <AppText variant="labelLG" color="#4889D4" style={{ marginTop: 2 }}>{data.len}</AppText>
            </View>
          </View>
        </View>

        {/* Development Description */}
        <Card style={[styles.detailsCard, { backgroundColor: cardBg } ]}>
          <AppText variant="h6" style={styles.cardHeader}>تطورات هذا الأسبوع</AppText>
          <AppText variant="bodySM" color={colors.textSecondary} style={styles.descText}>
            {data.desc}
          </AppText>

          <View style={styles.divider} />

          <AppText variant="h6" style={[styles.cardHeader, { marginBottom: 6 } ]}>النمو الحيوي للجنين</AppText>
          {data.milestones.map((milestone, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <AppText variant="bodySM" color={colors.textPrimary} style={styles.bulletText}>
                {milestone}
              </AppText>
              <View style={styles.bulletPoint} />
            </View>
          ))}
        </Card>

        {/* Mother Advice / Tips */}
        <View style={[styles.adviceCard, { backgroundColor: adaptivePinkBg } ]}>
          <AppText variant="h6" color={isDark ? '#FFF' : '#9D174D'} style={styles.adviceHeader}>نصائح لكِ أيتها الأم</AppText>
          {data.tips.map((tip, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <AppText variant="bodySM" color={isDark ? '#FBCFE8' : '#BE185D'} style={styles.bulletText}>
                {tip}
              </AppText>
              <AppText variant="bodySM" color={isDark ? '#FBCFE8' : '#BE185D'}>•</AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  
  vizCard: { margin: 16, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  visualContainer: { width: '100%', minHeight: 280, borderRadius: 20, overflow: 'hidden' },
  toggle3DButton: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  fetusBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fetusImage: { width: '100%', height: 280, borderRadius: 16 },
  
  rotateLabel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  weekTitle: { marginTop: 14, fontWeight: '800' },
  stageBadge: { marginTop: 6 },

  controllerCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 22, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 18 },
  navBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  sliderContainer: { flex: 1, marginHorizontal: 14, height: 20, justifyContent: 'center' },
  sliderLineBg: { height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, position: 'relative', width: '100%' },
  sliderLineFill: { height: '100%', borderRadius: 3, position: 'absolute', left: 0 },
  sliderKnob: { width: 16, height: 16, borderRadius: 8, position: 'absolute', top: -5, marginLeft: -8, borderWidth: 2, borderColor: '#FFF' },

  statsRow: { flexDirection: 'row-reverse', gap: 10, width: '100%' },
  statBox: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center' },

  detailsCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 22, padding: 18 },
  cardHeader: { fontWeight: '800', textAlign: 'right', marginBottom: 10 },
  descText: { textAlign: 'right', lineHeight: 22 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 14 },
  
  bulletRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 5, gap: 10 },
  bulletText: { flex: 1, textAlign: 'right', lineHeight: 22 },
  bulletPoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EC4899', marginTop: 10 },

  adviceCard: { marginHorizontal: 16, borderRadius: 22, padding: 18, gap: 8 },
  adviceHeader: { fontWeight: '800', textAlign: 'right', marginBottom: 6 },
});
