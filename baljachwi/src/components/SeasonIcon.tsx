import Svg, { Circle, G, Path } from 'react-native-svg';

import type { Season } from '@/domain/seasons';

export function SeasonIcon({ season, size = 14 }: { season: Season; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {season === 'spring' && (
        <G>
          <G fill="#EBA7BA">
            <Circle cx={12} cy={6.2} r={4.3} />
            <Circle cx={17.5} cy={10.2} r={4.3} />
            <Circle cx={15.4} cy={16.7} r={4.3} />
            <Circle cx={8.6} cy={16.7} r={4.3} />
            <Circle cx={6.5} cy={10.2} r={4.3} />
          </G>
          <Circle cx={12} cy={12} r={3.1} fill="#F3CE5E" />
        </G>
      )}
      {season === 'summer' && (
        <G stroke="#6FA35E" strokeWidth={2.2} strokeLinecap="round" fill="none">
          <Circle cx={12} cy={12} r={4.2} />
          <Path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
        </G>
      )}
      {season === 'autumn' && (
        <Path
          d="M12 1.5l2.1 4.3 3.1-1.2-.9 4.4 4.6.6-3.3 3.3 1.4 3.4-4.4-.9-.8 4.1h-3.6l-.8-4.1-4.4.9 1.4-3.4-3.3-3.3 4.6-.6-.9-4.4 3.1 1.2z"
          fill="#D9733A"
        />
      )}
      {season === 'winter' && (
        <Path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" stroke="#8FA4BA" strokeWidth={2} strokeLinecap="round" fill="none" />
      )}
    </Svg>
  );
}
