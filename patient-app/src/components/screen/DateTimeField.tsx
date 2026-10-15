import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Input } from '../../../../packages/ui-native/src';
import { useConsultFormat } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from './ScreenKit';

/**
 * A date and time field (issue 688): the system picker on the phone (Android: the date then the time dialog; iOS: the
 * spinner under the field), the chosen moment shown in the person's language. On the web build, where the native picker
 * does not exist, it stays a text field for an ISO date and time (`hint`).
 */
export function DateTimeField({ label, value, onChange, hint, minimumDate, testID }: {
  label: string;
  value: Date | null;
  onChange: (next: Date) => void;
  hint?: string;
  minimumDate?: Date;
  testID?: string;
}) {
  const { theme, t, c, flow, k } = useScreenUi();
  const fmt = useConsultFormat();
  const [iosOpen, setIosOpen] = useState(false);
  const [text, setText] = useState('');

  if (Platform.OS === 'web') {
    return (
      <Input
        label={label}
        hint={hint}
        value={text}
        onChange={(v) => {
          setText(v);
          const d = new Date(v);
          if (v.trim() && !Number.isNaN(d.getTime())) onChange(d);
        }}
        theme={theme}
        testID={testID}
      />
    );
  }

  const open = () => {
    const start = value ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        minimumDate,
        onChange: (event: DateTimePickerEvent, day?: Date) => {
          if (event.type !== 'set' || !day) return;
          DateTimePickerAndroid.open({
            value: day,
            mode: 'time',
            onChange: (e2: DateTimePickerEvent, time?: Date) => {
              if (e2.type !== 'set' || !time) return;
              const next = new Date(day);
              next.setHours(time.getHours(), time.getMinutes(), 0, 0);
              onChange(next);
            },
          });
        },
      });
    } else {
      setIosOpen((v) => !v);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${fmt.dateTime(value)}` : label}
        onPress={open}
        testID={testID}
        style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border.strong, backgroundColor: c.bg.surface, opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ ...scale(t, 'body', 'regular'), color: value ? c.text.primary : c.text.secondary, ...flow }}>{value ? fmt.dateTime(value) : k('common.chooseDateTime')}</Text>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker value={value ?? new Date()} mode="datetime" display="spinner" minimumDate={minimumDate} onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) onChange(d); }} />
      ) : null}
    </View>
  );
}
