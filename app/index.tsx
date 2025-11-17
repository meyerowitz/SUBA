import { Text, View } from "react-native";
import Home2 from './pages/Home';
import Navigation from './pages/Navigation';

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <Navigation></Navigation>
    </View>
  );
}
