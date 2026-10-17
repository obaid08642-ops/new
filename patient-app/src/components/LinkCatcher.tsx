import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, Stack, type Href } from 'expo-router';

import { EmptyState, Screen, Spinner } from '../../../packages/ui-native/src';
import { useScreenUi, step as scale } from './screen/ScreenKit';

/**
 * The screens a shared link lands on (a medicine, a doctor, a facility, a public page) and the unknown-route screen.
 * A link is resolved by the server and forwarded to its screen; while that runs the patient sees what is being opened,
 * and a link that no longer exists says so in the patient's language with the two ways out (search, home), instead of
 * leaving a blank page or dropping the patient on an unrelated list without a word.
 */

type Opening = 'medicine' | 'doctor' | 'facility' | 'link';

/** The "link not found" state: the unknown-route screen and every catcher whose link no longer resolves. */
export function LinkNotFound() {
  const { theme, dir, k } = useScreenUi();
  return (
    <Screen theme={theme} direction={dir} testID="link-not-found">
      <Stack.Screen options={{ title: k('link.notFound.title') }} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
        <EmptyState
          icon="magnifying-glass"
          tone="blue"
          title={k('link.notFound.title')}
          body={k('link.notFound.body')}
          actionLabel={k('link.search')}
          onAction={() => router.replace('/search' as Href)}
          secondaryActionLabel={k('link.home')}
          onSecondaryAction={() => router.replace('/' as Href)}
          theme={theme}
        />
      </View>
    </Screen>
  );
}

/**
 * Runs `resolve` once per `deps`: a returned route replaces this screen; null (or a failed request) shows the
 * not-found state.
 */
export default function LinkCatcher({ opening, resolve, deps }: { opening: Opening; resolve: () => Promise<Href | null>; deps: ReadonlyArray<unknown> }) {
  const { theme, dir, c, t, flow, k } = useScreenUi();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    setMissing(false);
    resolve()
      .then((href) => {
        if (!live) return;
        if (href) router.replace(href);
        else setMissing(true);
      })
      .catch(() => {
        if (live) setMissing(true);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (missing) return <LinkNotFound />;
  return (
    <Screen theme={theme} direction={dir} testID="link-opening">
      <View accessibilityState={{ busy: true }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Spinner size={32} color={c.icon.primary} />
        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k(`link.opening.${opening}`)}</Text>
      </View>
    </Screen>
  );
}
