import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0 } as NotificationsState,
  reducers: {
    setNotifications: (state, action: PayloadAction<AppNotification[]>) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    addNotification: (state, action: PayloadAction<AppNotification>) => {
      state.items.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount += 1;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const n = state.items.find((n) => n.id === action.payload);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.items.forEach((n) => (n.isRead = true));
      state.unreadCount = 0;
    },
  },
});
export const { setNotifications, addNotification, markAsRead, markAllAsRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
