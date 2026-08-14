import { combineReducers, Reducer, ReducersMapObject, UnknownAction } from '@reduxjs/toolkit';

export interface ReducerManager {
  getReducerMap: () => ReducersMapObject;
  reduce: (state: any, action: UnknownAction) => any;
  add: (key: string, reducer: Reducer) => void;
  remove: (key: string) => void;
  replace: (key: string, reducer: Reducer) => void;
}

export function createReducerManager(initialReducers: ReducersMapObject): ReducerManager {
  const reducers = { ...initialReducers };
  let combinedReducer = combineReducers(reducers);
  let keysToRemove: string[] = [];

  return {
    getReducerMap: () => reducers,

    reduce: (state: any, action: UnknownAction) => {
      if (keysToRemove.length > 0) {
        state = { ...state };
        for (const key of keysToRemove) {
          delete state[key];
        }
        keysToRemove = [];
      }
      return combinedReducer(state, action);
    },

    add: (key: string, reducer: Reducer) => {
      if (!key || reducers[key]) {
        return;
      }
      reducers[key] = reducer;
      combinedReducer = combineReducers(reducers);
    },

    remove: (key: string) => {
      if (!key || !reducers[key]) {
        return;
      }
      delete reducers[key];
      // Push to keysToRemove to strip the state of this feature
      keysToRemove.push(key);
      // Re-create combined reducer without this key
      combinedReducer = Object.keys(reducers).length > 0 
        ? combineReducers(reducers) 
        : (state: any) => state; // fallback if all reducers removed
    },

    replace: (key: string, reducer: Reducer) => {
      if (!key || !reducers[key]) {
        return; // Alternatively, just add it if it doesn't exist
      }
      reducers[key] = reducer;
      combinedReducer = combineReducers(reducers);
    }
  };
}
