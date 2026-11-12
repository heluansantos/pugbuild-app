import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/**
 * True while this screen is the one in front. Tab screens stay mounted when another tab is
 * selected, so hooks that cost battery (GPS watch, beacon ranging) use this to pause.
 */
export function useIsFocused(): boolean {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}
