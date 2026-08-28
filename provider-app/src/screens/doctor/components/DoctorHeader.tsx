import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useLang, useAuth } from '../../../context';
import { NAvatar, NOnlineToggle } from '../../../components/ui';
import { I } from '../../../components/icons';
import { SP, FS, FW } from '../../../constants';

interface DoctorHeaderProps {
  onNavigate: (screen: string) => void;
}

export function DoctorHeader({ onNavigate }: DoctorHeaderProps) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user, toggleOnline } = useAuth();
  const AR = lang === 'ar';

  return (
    <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={[styles.row, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
        <View style={[styles.userInfo, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
          <NAvatar name={user?.name || 'د. محمد'} size={44} />
          <View style={{ marginHorizontal: SP.sm, alignItems: AR ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {user?.name || (AR ? 'د. محمد الطبيب' : 'Dr. Mohamed')}
            </Text>
            <Text style={[styles.userRole, { color: theme.textSub }]}>
              {(user as any)?.specialty || (AR ? 'طبيب عام' : 'General Practitioner')}
            </Text>
          </View>
        </View>
        
        <View style={[styles.actions, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
          <NOnlineToggle value={user?.isOnline ?? true} onToggle={toggleOnline} />
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: theme.bg }]} 
            onPress={() => onNavigate('settings')}
          >
            <I name="settings" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    borderBottomWidth: 1,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: FS.md,
    fontWeight: FW.bold,
  },
  userRole: {
    fontSize: FS.xs,
    marginTop: 2,
  },
  actions: {
    alignItems: 'center',
    gap: SP.xs,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
