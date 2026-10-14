import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { fontFamilyFor, lineHeightFor, urduStyle } from '../urduFont';
import { useUrduFont } from '../useUrduFont';

let mockLang = 'en';
let mockFontEvaluated = 0;
const mockLoadAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ lang: mockLang }) }));
jest.mock('expo-font', () => ({ loadAsync: (...a: unknown[]) => mockLoadAsync(...a) }));
jest.mock('@expo-google-fonts/noto-nastaliq-urdu', () => {
  mockFontEvaluated += 1; // evaluated only if something imports the package
  return { NotoNastaliqUrdu_400Regular: 1, NotoNastaliqUrdu_500Medium: 2, NotoNastaliqUrdu_700Bold: 3 };
}, { virtual: true });

const flat = (s: unknown) => StyleSheet.flatten(s as never) as never;

describe('fontFamilyFor', () => {
  it('ur + ready maps each weight to the Nastaliq face', () => {
    expect(fontFamilyFor('ReadexPro-300', 'ur', true)).toBe('NotoNastaliqUrdu_400Regular');
    expect(fontFamilyFor('ReadexPro-400', 'ur', true)).toBe('NotoNastaliqUrdu_400Regular');
    expect(fontFamilyFor('ReadexPro-500', 'ur', true)).toBe('NotoNastaliqUrdu_500Medium');
    expect(fontFamilyFor('ReadexPro-700', 'ur', true)).toBe('NotoNastaliqUrdu_700Bold');
    expect(fontFamilyFor('NotoSansArabic-500', 'ur', true)).toBe('NotoNastaliqUrdu_500Medium');
  });
  it('ur not ready, other languages and unknown families are unchanged', () => {
    expect(fontFamilyFor('ReadexPro-700', 'ur', false)).toBe('ReadexPro-700');
    for (const lang of ['ar', 'en', 'hi', 'bn', 'tl', 'fil']) {
      expect(fontFamilyFor('ReadexPro-700', lang, true)).toBe('ReadexPro-700');
      expect(fontFamilyFor('NotoSansArabic-400', lang, true)).toBe('NotoSansArabic-400');
    }
    expect(fontFamilyFor('MaterialSymbolsRounded', 'ur', true)).toBe('MaterialSymbolsRounded');
    expect(fontFamilyFor(undefined, 'ur', true)).toBeUndefined();
  });
});

describe('lineHeightFor / urduStyle', () => {
  it('raises the line height to 1.7x for ur only', () => {
    expect(lineHeightFor(20, 16, 'ur', true)).toBe(27);
    expect(lineHeightFor(40, 16, 'ur', true)).toBe(40);
    expect(lineHeightFor(20, 16, 'en', true)).toBe(20);
    expect(lineHeightFor(20, 16, 'ur', false)).toBe(20);
  });
  it('returns the same style reference for other languages', () => {
    const style = { fontFamily: 'ReadexPro-400', fontSize: 16, lineHeight: 20 };
    expect(urduStyle(style, flat, 'en', true)).toBe(style);
    expect(urduStyle(style, flat, 'ur', false)).toBe(style);
    expect(urduStyle(style, flat, 'ur', true)).toEqual({ fontFamily: 'NotoNastaliqUrdu_400Regular', fontSize: 16, lineHeight: 27 });
  });
});

describe('useUrduFont', () => {
  it('never imports the font package when the language is not ur', async () => {
    mockLang = 'en';
    const { result } = await renderHook(() => useUrduFont());
    await act(async () => {});
    expect(result.current.urduFontReady).toBe(false);
    expect(mockFontEvaluated).toBe(0);
    expect(mockLoadAsync).not.toHaveBeenCalled();
  });

  it('for ur loads the faces, becomes ready and switches mounted Text without a remount', async () => {
    mockLang = 'ur';
    const RN = require('react-native');
    const OriginalText = RN.Text;
    const style = { fontFamily: 'ReadexPro-500', fontSize: 16, lineHeight: 20 };
    const { result } = await renderHook(() => useUrduFont());
    await waitFor(() => expect(result.current.urduFontReady).toBe(true));
    expect(mockFontEvaluated).toBe(1);
    expect(mockLoadAsync).toHaveBeenCalledWith(expect.objectContaining({ NotoNastaliqUrdu_700Bold: 3 }));
    expect(result.current.urduFontReady).toBe(true);
    expect(RN.Text).not.toBe(OriginalText);
    const view = await render(<RN.Text testID="u" style={style}>x</RN.Text>);
    expect(view.getByTestId('u').props.style).toEqual({ fontFamily: 'NotoNastaliqUrdu_500Medium', fontSize: 16, lineHeight: 27 });
  });
});
