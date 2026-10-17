jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: jest.fn(), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Stack: { Screen: () => null }, useLocalSearchParams: () => ({}), useFocusEffect: jest.fn() }));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

import { faqText } from '../src/components/account/HelpView';

/**
 * GET /support/faqs sends each FAQ in Arabic (question, answer) and English (question_en, answer_en); the Help screen
 * ignored the English text, so every non-Arabic patient read Arabic questions.
 */
const faq = { question: 'كيف أحجز؟', answer: 'من قسم العيادات', question_en: 'How do I book?', answer_en: 'From the clinics section' };

describe('FAQ text by language', () => {
  it('is Arabic for Arabic', () => expect(faqText(faq, 'ar')).toEqual({ question: 'كيف أحجز؟', answer: 'من قسم العيادات' }));
  it.each(['en', 'ur', 'hi', 'bn', 'fil'])('is the English text for %s', (lang) => expect(faqText(faq, lang)).toEqual({ question: 'How do I book?', answer: 'From the clinics section' }));
  it('keeps the Arabic text when the admin wrote no English', () => expect(faqText({ question: 'س', answer: 'ج' }, 'en')).toEqual({ question: 'س', answer: 'ج' }));
});
