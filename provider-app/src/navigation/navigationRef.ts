import { createNavigationContainerRef } from '@react-navigation/native';

/** The one navigation container ref: App.tsx mounts it, push taps and the native call screen use it to open a screen from outside React. */
export const navigationRef = createNavigationContainerRef<any>();
