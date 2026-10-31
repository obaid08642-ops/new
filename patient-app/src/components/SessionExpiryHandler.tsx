import { useEffect } from 'react';
import { router, type Href } from 'expo-router';
import { useDispatch } from 'react-redux';
import { setSessionExpiredHandler } from '../auth/session';
import { logout } from '../store/slices/authSlice';

/** Signs the patient out of the UI when the API reports an unrecoverable 401. */
export default function SessionExpiryHandler() {
  const dispatch = useDispatch();
  useEffect(() => {
    setSessionExpiredHandler(() => {
      dispatch(logout());
      router.replace('/(auth)/login' as Href);
    });
    return () => setSessionExpiredHandler(null);
  }, [dispatch]);
  return null;
}
