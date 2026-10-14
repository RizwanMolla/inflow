import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FolderOpen, Palette, QrCode, Zap } from 'lucide-react-native';
import { AppText, Button } from '../ui/primitives';
import { colors, withAlpha } from '../ui/tokens';
import { Haptics } from '../services/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_GAP = 12;

interface SlideItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accent: string;
}

const GUIDE_SLIDES: SlideItem[] = [
  {
    id: 'pair',
    eyebrow: 'Step 1 · Pair',
    title: 'Connect to your PC',
    description:
      'Put the phone and PC on the same Wi-Fi. In InFlow on your PC, click “Pair phone”, then scan the code. The pairing code keeps other devices out.',
    icon: QrCode,
    accent: '#ef4444',
  },
  {
    id: 'deck',
    eyebrow: 'Step 2 · Press',
    title: 'Your Stream Deck',
    description:
      'Open the deck for a landscape grid of keys. Workspaces, hotkeys, media keys and commands run on your PC, and each key flashes green or red with the result.',
    icon: Zap,
    accent: '#818cf8',
  },
  {
    id: 'folders',
    eyebrow: 'Step 3 · Organise',
    title: 'Workspaces & folders',
    description:
      'A workspace key opens every app, folder and site you need in order. Folder keys open nested pages; the first key inside a folder takes you back.',
    icon: FolderOpen,
    accent: '#34d399',
  },
  {
    id: 'tune',
    eyebrow: 'Step 4 · Tune',
    title: 'Make it yours',
    description:
      'Inside the deck, tap the menu button to switch between Studio, Graphite and Daylight themes, or change how strong the haptic clicks feel.',
    icon: Palette,
    accent: '#fbbf24',
  },
];

interface GuideCarouselProps {
  onScanPress: () => void;
}

export const GuideCarousel: React.FC<GuideCarouselProps> = ({ onScanPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<SlideItem>>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
    if (index >= 0 && index < GUIDE_SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
      Haptics.tick();
    }
  };

  const goTo = (index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppText variant="eyebrow">Getting started</AppText>
        <AppText variant="micro" color={colors.ink3} style={styles.counter}>
          {activeIndex + 1} / {GUIDE_SLIDES.length}
        </AppText>
      </View>

      <FlatList
        ref={listRef}
        data={GUIDE_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={[styles.card, { width: CARD_WIDTH }]}>
              <View style={styles.cardHead}>
                <View
                  style={[
                    styles.iconTile,
                    { backgroundColor: withAlpha(item.accent, 0.14), borderColor: withAlpha(item.accent, 0.28) },
                  ]}
                >
                  <Icon size={18} color={item.accent} />
                </View>
                <View style={styles.cardTitles}>
                  <AppText variant="eyebrow" color={item.accent}>
                    {item.eyebrow}
                  </AppText>
                  <AppText variant="base">{item.title}</AppText>
                </View>
              </View>
              <AppText variant="ui" color={colors.ink2}>
                {item.description}
              </AppText>
              {item.id === 'pair' && (
                <Button label="Scan pairing code" icon={QrCode} variant="primary" size="sm" onPress={onScanPress} style={styles.cardAction} />
              )}
            </View>
          );
        }}
      />

      <View style={styles.dots}>
        {GUIDE_SLIDES.map((slide, i) => (
          <Pressable
            key={slide.id}
            accessibilityRole="button"
            accessibilityLabel={`Show step ${i + 1}`}
            hitSlop={8}
            onPress={() => goTo(i)}
            style={[styles.dot, activeIndex === i ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  counter: {
    fontVariant: ['tabular-nums'],
  },
  listContent: {
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitles: {
    flex: 1,
    gap: 1,
  },
  cardAction: {
    alignSelf: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.brand,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
});
