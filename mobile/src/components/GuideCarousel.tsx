import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Wifi,
  QrCode,
  Layers,
  Sparkles,
  Monitor,
  Zap,
  ChevronRight,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface SlideItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accent: string;
  badge: string;
  step: string;
}

const GUIDE_SLIDES: SlideItem[] = [
  {
    id: 'step-1',
    step: 'STEP 1',
    badge: 'PAIRING',
    title: 'Connect to Desktop',
    subtitle: 'Ensure PC & phone are on the same Wi-Fi',
    description:
      'Open InFlow on your PC, click "Mobile Companion" in the header or tray, and click "Scan QR Code" above to pair instantly.',
    icon: QrCode,
    accent: '#ef4444',
  },
  {
    id: 'step-2',
    step: 'STEP 2',
    badge: 'CONTROL',
    title: 'Zero-Latency Stream Deck',
    subtitle: 'Tactile physical deck in your palm',
    description:
      'Tap "Open Deck" to launch the landscape console. Custom macro buttons, workspaces, and quick actions trigger instantly on your PC.',
    icon: Zap,
    accent: '#8b5cf6',
  },
  {
    id: 'step-3',
    step: 'STEP 3',
    badge: 'WORKFLOWS',
    title: 'Smart Workspace Switching',
    subtitle: 'Syncs active projects automatically',
    description:
      'Switching workspaces on your PC automatically highlights the active layout and triggers corresponding app suites and terminal layouts.',
    icon: Layers,
    accent: '#10b981',
  },
  {
    id: 'step-4',
    step: 'STEP 4',
    badge: 'CUSTOMIZE',
    title: 'Personalize Themes & Grids',
    subtitle: 'Black, Gray, and White studio styles',
    description:
      'Inside the deck, tap the 3-line menu on the top right to switch themes or toggle desk-dock keep-awake mode for your phone stand.',
    icon: Sparkles,
    accent: '#f59e0b',
  },
];

interface GuideCarouselProps {
  onScanPress: () => void;
}

export const GuideCarousel: React.FC<GuideCarouselProps> = ({ onScanPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (CARD_WIDTH + 12));
    if (index >= 0 && index < GUIDE_SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleDotPress = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.sectionHeader}>GETTING STARTED GUIDE</Text>
        </View>
        <Text style={styles.stepIndicator}>
          {activeIndex + 1} of {GUIDE_SLIDES.length}
        </Text>
      </View>

      {/* Carousel list */}
      <FlatList
        ref={flatListRef}
        data={GUIDE_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const IconComp = item.icon;
          return (
            <View style={[styles.card, { width: CARD_WIDTH }]}>
              {/* Top Row: Step Tag + Badge */}
              <View style={styles.cardTopRow}>
                <View style={[styles.stepTag, { backgroundColor: `${item.accent}20`, borderColor: `${item.accent}40` }]}>
                  <Text style={[styles.stepTagText, { color: item.accent }]}>{item.step}</Text>
                </View>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{item.badge}</Text>
                </View>
              </View>

              {/* Main Info */}
              <View style={styles.cardContentRow}>
                <View style={[styles.iconWrapper, { backgroundColor: `${item.accent}15`, borderColor: `${item.accent}30` }]}>
                  <IconComp size={24} color={item.accent} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
              </View>

              <Text style={styles.cardDescription}>{item.description}</Text>

              {item.id === 'step-1' && (
                <TouchableOpacity onPress={onScanPress} style={styles.cardActionBtn} activeOpacity={0.8}>
                  <QrCode size={14} color="#ffffff" />
                  <Text style={styles.cardActionBtnText}>Scan Pairing QR Code</Text>
                  <ChevronRight size={14} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationRow}>
        {GUIDE_SLIDES.map((_, i) => (
          <TouchableOpacity
            key={`dot-${i}`}
            onPress={() => handleDotPress(i)}
            style={[
              styles.dot,
              activeIndex === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 0.8,
  },
  stepIndicator: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#141417',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stepTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 0.5,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#a1a1aa',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#71717a',
  },
  cardActionBtn: {
    marginTop: 14,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  cardActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#ef4444',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
