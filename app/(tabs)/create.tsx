// This screen is never shown — the tab bar button for "create" is
// intercepted in _layout.tsx and redirected to the /listing/create modal.
// This file only needs to exist so Expo Router registers the route.
export default function CreateTabPlaceholder() {
  return null;
}