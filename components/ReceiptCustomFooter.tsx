import { StyleSheet, Text } from "react-native";

import { fonts } from "../constants/theme";

type Props = {
  text: string;
  color: string;
};

export function ReceiptCustomFooter({ text, color }: Props) {
  if (!text) {
    return null;
  }
  return (
    <Text style={[styles.footer, { color }]} numberOfLines={4}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  footer: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
});
