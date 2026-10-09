import '../../global.css';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  useGlobalSearchParams,
  useRouter,
} from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConversationDrawer } from '@/features/conversations/components/ConversationDrawer';
import { migrate } from '@/features/conversations/data/sqliteRepository';
import { AppProviders } from '@/providers/AppProviders';
import { palette, useColors } from '@/theme/colors';

function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-paper dark:bg-night">
      <ActivityIndicator />
    </View>
  );
}

function AppDrawer() {
  const router = useRouter();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const colors = useColors();
  const activeId = id && id !== 'new' ? id : null;

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        swipeEdgeWidth: 80,
        drawerStyle: { width: '82%', backgroundColor: colors.bg },
        overlayColor: 'rgba(0,0,0,0.25)',
      }}
      drawerContent={({ navigation }) => (
        <ConversationDrawer
          activeId={activeId}
          onSelect={(cid) => {
            router.navigate({ pathname: '/c/[id]', params: { id: cid } });
            navigation.closeDrawer();
          }}
          onNewChat={() => {
            router.navigate({ pathname: '/c/[id]', params: { id: 'new' } });
            navigation.closeDrawer();
          }}
          onOpenSettings={() => {
            router.navigate('/settings');
            navigation.closeDrawer();
          }}
          onActiveDeleted={() => router.navigate({ pathname: '/c/[id]', params: { id: 'new' } })}
        />
      )}
    >
      <Drawer.Screen name="index" options={{ swipeEnabled: false }} />
      <Drawer.Screen name="c/[id]" />
      <Drawer.Screen name="settings" options={{ swipeEnabled: false }} />
    </Drawer>
  );
}

export default function RootLayout() {
  const colors = useColors();
  const base = colors.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette[colors.scheme].bg,
      card: palette[colors.scheme].bg,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <Suspense fallback={<Loading />}>
            <SQLiteProvider databaseName="pocket-chat.db" onInit={migrate} useSuspense>
              <AppProviders>
                <AppDrawer />
              </AppProviders>
            </SQLiteProvider>
          </Suspense>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
