import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { AppHeader, Button, EmptyState, Input, Screen, StickyFooter } from '../../../../packages/ui-native/src';
import { CARE_TONE, Gate, goBack, type GateStatus } from '../consult/ConsultKit';
import { COLUMN, step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * The chat template (flow step, Batch 6): the header, a message list that opens at the newest message, a composer
 * above the keyboard, and the shared loading / failure / empty states. Mine are ink bubbles, the others surface
 * bubbles with the sender's name; nothing here knows what the thread is, the screen gives the messages and the send
 * handler. No colour, size or sentence of its own: every text arrives as a prop.
 */

export interface ChatMessage {
  id: string;
  text: string;
  /** The sender's name, shown above a message that is not mine. */
  sender?: string;
  time?: string;
  mine: boolean;
}

export interface ChatThreadProps {
  title: string;
  /** A line under the header, e.g. the number of people in the thread. */
  subtitle?: string;
  onBack?: () => void;
  status: GateStatus;
  onRetry: () => void;
  messages: ChatMessage[];
  empty: { title: string; body: string };
  composer: { value: string; onChange: (text: string) => void; onSend: () => void; sending: boolean; placeholder: string; sendLabel: string };
  testID?: string;
}

function Bubble({ message }: { message: ChatMessage }) {
  const { t, c, flow } = useScreenUi();
  const ink = message.mine;
  return (
    <View style={{ width: '100%', alignItems: ink ? 'flex-end' : 'flex-start' }} testID={`chat-message-${message.id}`}>
      {!ink && message.sender ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, marginBottom: 2, ...flow }}>{message.sender}</Text> : null}
      <View style={{ maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: ink ? c.action.selected.bg : c.bg.surface, borderWidth: ink ? 0 : 1, borderColor: c.border.hairline }}>
        <Text style={{ ...scale(t, 'body', 'regular'), color: ink ? c.action.selected.fg : c.text.primary, ...flow }}>{message.text}</Text>
        {message.time ? <Text style={{ ...scale(t, 'tag', 'regular'), color: ink ? c.text.onInverseSecondary : c.text.tertiary, marginTop: 4, ...flow }}>{message.time}</Text> : null}
      </View>
    </View>
  );
}

export function ChatThread({ title, subtitle, onBack, status, onRetry, messages, empty, composer, testID }: ChatThreadProps) {
  const { theme, c, t, dir, k } = useScreenUi();
  const header = (
    <View style={COLUMN}>
      <AppHeader title={title} onBack={onBack ?? (() => goBack())} backLabel={k('consult.back')} theme={theme} direction={dir} />
      {subtitle ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, textAlign: 'center' }}>{subtitle}</Text> : null}
    </View>
  );
  const canSend = composer.value.trim().length > 0 && !composer.sending;
  const footer =
    status === 'error' || status === 'offline' ? undefined : (
      <StickyFooter theme={theme} direction={dir}>
        <View style={{ ...COLUMN, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input value={composer.value} onChange={composer.onChange} placeholder={composer.placeholder} theme={theme} testID="chat-input" />
          </View>
          <Button label={composer.sendLabel} disabled={!canSend} loading={composer.sending} onPress={composer.onSend} theme={theme} testID="chat-send" />
        </View>
      </StickyFooter>
    );

  if (status !== 'ready') {
    return (
      <Screen theme={theme} direction={dir} header={header} footer={footer} scroll testID={testID}>
        <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8 }}>
          <Gate status={status} onRetry={onRetry}>{null}</Gate>
        </View>
      </Screen>
    );
  }
  // The list is inverted so it opens at the newest message and a new one appears at the bottom without scrolling code.
  const newestFirst = [...messages].reverse();
  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} testID={testID}>
      <FlatList
        style={{ flex: 1 }}
        inverted={messages.length > 0}
        data={newestFirst}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Bubble message={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon="chat-circle-text" tone={CARE_TONE} title={empty.title} body={empty.body} theme={theme} />}
        contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, flexGrow: 1 }}
      />
    </Screen>
  );
}
