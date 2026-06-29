import { View } from 'react-native';
import { TRICOLOR } from '../theme';

// The thin saffron / paper / green accent strip used on headers and cards.
export default function TricolorStrip({ height = 3, style }) {
  return (
    <View style={[{ flexDirection: 'row', height }, style]}>
      {TRICOLOR.map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}
