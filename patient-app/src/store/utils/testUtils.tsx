import React, { PropsWithChildren } from 'react';
// import { render, RenderOptions } from '@testing-library/react-native'; // Assuming this will be used when tests are fully setup
import { Provider } from 'react-redux';
import { store } from '../index';

/**
 * Utility to render a component with Redux store context for unit testing.
 * This ensures tests don't fail due to missing Provider.
 */
interface ExtendedRenderOptions {
  preloadedState?: any;
  store?: typeof store;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    // In a real testing environment, we'd create a new store instance here
    // using configureStore to prevent state leaking between tests.
    // For now, we mock it via the singleton store.
    store: testStore = store,
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<{}>): React.ReactElement {
    return <Provider store={testStore}>{children}</Provider>;
  }

  // return render(ui, { wrapper: Wrapper, ...renderOptions });
  // Since we haven't installed testing library yet, we just export the Wrapper
  return { Wrapper, store: testStore };
}
