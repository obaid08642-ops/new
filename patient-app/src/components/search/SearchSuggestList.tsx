import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { highlightParts, type Suggestion } from '../../utils/searchSuggest';
import { markByScript } from '../../utils/localizedField';
import { markTextProps } from '../LocalizedField';

interface Props {
  items: Suggestion[];
  /** The text typed in the box: the matched part of each name is drawn bold. */
  query: string;
  onPick: (item: Suggestion) => void;
}

/** The instant suggestions under a search box. Names come from the server and are drawn as plain text. */
export function SearchSuggestList({ items, query, onPick }: Props) {
  const { colors, lang } = useApp();
  if (items.length === 0) return null;
  return (
    <View style={[st.box, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <ScrollView keyboardShouldPersistTaps="handled" style={st.scroll}>
        {items.map((item) => (
          <TouchableOpacity
            key={`${item.type}:${item.id}`}
            onPress={() => onPick(item)}
            style={st.row}
            accessibilityRole="button"
          >
            <Text style={[st.text, { color: colors.textPrimary }, markTextProps(markByScript(lang, item.name)).style]}>
              {highlightParts(item.name, query).map((part, i) => (
                <Text key={i} style={part.match ? st.match : undefined}>{part.text}</Text>
              ))}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, marginTop: 6, overflow: 'hidden' },
  scroll: { maxHeight: 280 },
  row: { paddingHorizontal: 14, paddingVertical: 12 },
  text: { fontSize: 15 },
  match: { fontWeight: '700' },
});
