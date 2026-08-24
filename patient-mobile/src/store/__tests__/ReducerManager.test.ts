import { createReducerManager } from '../ReducerManager';
import { createSlice } from '@reduxjs/toolkit';

const dummySlice1 = createSlice({
  name: 'dummy1',
  initialState: { value: 1 },
  reducers: {},
});

const dummySlice2 = createSlice({
  name: 'dummy2',
  initialState: { value: 2 },
  reducers: {},
});

describe('ReducerManager', () => {
  it('should initialize with provided reducers', () => {
    const manager = createReducerManager({ dummy1: dummySlice1.reducer });
    const state = manager.reduce(undefined, { type: 'INIT' });
    expect(state).toHaveProperty('dummy1');
    expect(state.dummy1.value).toBe(1);
  });

  it('should dynamically add a reducer', () => {
    const manager = createReducerManager({ dummy1: dummySlice1.reducer });
    manager.add('dummy2', dummySlice2.reducer);
    const state = manager.reduce(undefined, { type: 'INIT' });
    expect(state).toHaveProperty('dummy2');
    expect(state.dummy2.value).toBe(2);
  });

  it('should remove a reducer and clean up its state', () => {
    const manager = createReducerManager({
      dummy1: dummySlice1.reducer,
      dummy2: dummySlice2.reducer,
    });

    // Initial state setup
    let state = manager.reduce(undefined, { type: 'INIT' });
    expect(state).toHaveProperty('dummy2');

    // Remove dummy2
    manager.remove('dummy2');

    // Dispatch another action to trigger cleanup
    state = manager.reduce(state, { type: 'SOME_ACTION' });
    expect(state).not.toHaveProperty('dummy2');
  });

  it('should replace a reducer', () => {
    const manager = createReducerManager({ dummy1: dummySlice1.reducer });
    const dummySlice3 = createSlice({
      name: 'dummy1',
      initialState: { value: 99 },
      reducers: {},
    });

    manager.replace('dummy1', dummySlice3.reducer);
    const state = manager.reduce(undefined, { type: 'INIT' });
    expect(state.dummy1.value).toBe(99);
  });
});
