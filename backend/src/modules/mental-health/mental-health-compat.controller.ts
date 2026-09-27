import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {  } from '../../common/auth.guard';

const PHQ9_QUESTIONS = [
  'قلة الاهتمام أو المتعة في فعل الأشياء',
  'الشعور بالإحباط أو الاكتئاب أو اليأس',
  'صعوبة في النوم أو النوم الزائد',
  'الشعور بالتعب أو قلة الطاقة',
  'فقدان الشهية أو الإفراط في الأكل',
  'الشعور بالسوء تجاه نفسك أو أنك فاشل',
  'صعوبة في التركيز على الأشياء',
  'بطء في الحركة أو الكلام أو فرط الحركة بشكل ملحوظ',
  'أفكار بأنك أفضل حالاً ميتاً أو بإيذاء نفسك',
];

const GAD7_QUESTIONS = [
  'الشعور بالعصبية أو القلق أو التوتر',
  'عدم القدرة على إيقاف أو السيطرة على القلق',
  'القلق المفرط حول أشياء مختلفة',
  'صعوبة في الاسترخاء',
  'التململ بحيث يصعب الجلوس بثبات',
  'الانزعاج بسهولة أو سرعة الغضب',
  'الشعور بالخوف كأن شيئاً فظيعاً قد يحدث',
];

const ASSESSMENT_SCALE = [
  { value: 0, label_ar: 'أبداً', label_en: 'Not at all' },
  { value: 1, label_ar: 'عدة أيام', label_en: 'Several days' },
  { value: 2, label_ar: 'أكثر من نصف الأيام', label_en: 'More than half the days' },
  { value: 3, label_ar: 'تقريباً كل يوم', label_en: 'Nearly every day' },
];

@Controller('mental-health')
export class MentalHealthCompatController {
  @Get('assessment-questions')
  questions(@Query('type') type = 'phq9') {
    const t = String(type).toLowerCase();
    const isGad = t === 'gad7' || t === 'gad';
    const items = isGad ? GAD7_QUESTIONS : PHQ9_QUESTIONS;
    return {
      type: isGad ? 'gad7' : 'phq9',
      title_ar: isGad ? 'مقياس القلق العام GAD-7' : 'استبيان صحة المريض PHQ-9',
      instruction_ar: 'خلال الأسبوعين الماضيين، كم مرة أزعجتك المشكلات التالية؟',
      scale: ASSESSMENT_SCALE,
      questions: items.map((q, i) => ({ n: i + 1, text_ar: q })),
      max_score: items.length * 3,
    };
  }
}
