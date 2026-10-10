import { Circle, G, Path } from 'react-native-svg';

import type { DecoKind } from '@/domain/seasons';

/** Shoe print in a 16×28 box: sole and heel. */
export const SHOE_SOLE = 'M8 1C11.6 1 14 4.2 14 8.6c0 3.8-1.8 6.4-2.6 8.4H4.6C3.8 15 2 12.4 2 8.6 2 4.2 4.4 1 8 1z';
export const SHOE_HEEL = 'M4.8 19.2h6.4c.4 1.2.6 2.4.6 3.4 0 2.4-1.7 4.4-3.8 4.4S4.2 25 4.2 22.6c0-1 .2-2.2.6-3.4z';

export function Shoe({ fill, opacity, stroke, dash }: { fill: string; opacity?: number; stroke?: string; dash?: string }) {
  return (
    <G opacity={opacity}>
      <Path d={SHOE_SOLE} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.6 : 0} strokeDasharray={dash} />
      <Path d={SHOE_HEEL} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.6 : 0} strokeDasharray={dash} />
    </G>
  );
}

/** A footprint pressed into the ground: darker rim plus the category pigment. */
export function PressedShoe({ shade, tint, tintOpacity }: { shade: string; tint: string; tintOpacity: number }) {
  return (
    <G>
      <G transform="translate(0 -1.2)">
        <Shoe fill={shade} />
      </G>
      <Shoe fill={tint} opacity={tintOpacity} />
    </G>
  );
}

const MAPLE =
  'M12 1.5l2.1 4.3 3.1-1.2-.9 4.4 4.6.6-3.3 3.3 1.4 3.4-4.4-.9-.8 4.1h-3.6l-.8-4.1-4.4.9 1.4-3.4-3.3-3.3 4.6-.6-.9-4.4 3.1 1.2z';

/** Ground cover, drawn in a 24×24 box. */
export function DecoShape({ kind, color }: { kind: DecoKind; color: string }) {
  switch (kind) {
    case 'leaf':
      return (
        <G>
          <Path d="M12 2C18.6 6.2 19.8 14.4 12 22 4.2 14.4 5.4 6.2 12 2Z" fill={color} />
          <Path d="M12 5V21" stroke="rgba(60, 30, 10, 0.25)" strokeWidth={1.1} />
        </G>
      );
    case 'maple':
      return (
        <G>
          <Path d={MAPLE} fill={color} />
          <Path d="M12 19.5v3.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        </G>
      );
    case 'petal':
      return <Path d="M12 2.4L14.2 5.4 16.6 3C20.4 9.6 18.6 17.6 12 22.8 5.4 17.6 3.6 9.6 7.4 3L9.8 5.4Z" fill={color} />;
    case 'flower':
      return (
        <G>
          <G fill={color}>
            <Circle cx={12} cy={6.2} r={4.3} />
            <Circle cx={17.5} cy={10.2} r={4.3} />
            <Circle cx={15.4} cy={16.7} r={4.3} />
            <Circle cx={8.6} cy={16.7} r={4.3} />
            <Circle cx={6.5} cy={10.2} r={4.3} />
          </G>
          <Circle cx={12} cy={12} r={3.1} fill="#F3CE5E" />
        </G>
      );
    case 'grass':
      return (
        <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
          <Path d="M6 23C6 15 3.6 10.8 1.8 8.4" />
          <Path d="M12 23C12 14 13.2 8.6 15.6 4.4" />
          <Path d="M17.4 23C17.4 16.4 19.8 13.4 22.2 12.2" />
        </G>
      );
    case 'flake':
      return (
        <G fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round">
          <Path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" />
          <Path d="M9.6 4l2.4 2.2L14.4 4M9.6 20l2.4-2.2 2.4 2.2" />
        </G>
      );
  }
}
