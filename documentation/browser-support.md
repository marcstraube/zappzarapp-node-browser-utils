# Browser Support

Minimum supported versions: **Chrome 90+, Firefox 90+, Safari 14+, Edge 90+**

## Full Compatibility Matrix

| Module          | Chrome | Firefox | Safari | Edge | Fallback    |
| --------------- | ------ | ------- | ------ | ---- | ----------- |
| storage/session | 90+    | 90+     | 14+    | 90+  | Memory      |
| cookie          | 90+    | 90+     | 14+    | 90+  | -           |
| clipboard       | 90+    | 90+     | 14+    | 90+  | execCommand |
| download        | 90+    | 90+     | 14+    | 90+  | -           |
| events          | 90+    | 90+     | 14+    | 90+  | -           |
| keyboard        | 90+    | 90+     | 14+    | 90+  | -           |
| form            | 90+    | 90+     | 14+    | 90+  | -           |
| focus           | 90+    | 90+     | 14+    | 90+  | -           |
| scroll          | 90+    | 90+     | 14+    | 90+  | -           |
| url             | 90+    | 90+     | 14+    | 90+  | -           |
| html            | 90+    | 90+     | 14+    | 90+  | -           |
| logging         | 90+    | 90+     | 14+    | 90+  | -           |
| device          | 90+    | 90+     | 14+    | 90+  | -           |
| features        | 90+    | 90+     | 14+    | 90+  | -           |
| media           | 90+    | 90+     | 14+    | 90+  | -           |
| fullscreen      | 90+    | 90+     | 14+    | 90+  | -           |
| notification    | 90+    | 90+     | 14+    | 90+  | -           |
| network         | 90+    | 90+     | 14+    | 90+  | -           |
| observe         | 90+    | 90+     | 14+    | 90+  | -           |
| idle            | 90+    | 90+     | -      | 90+  | setTimeout  |
| indexeddb       | 90+    | 90+     | 14+    | 90+  | -           |
| websocket       | 90+    | 90+     | 14+    | 90+  | -           |
| csp             | 90+    | 90+     | 14+    | 90+  | -           |
| sanitize        | 90+    | 90+     | 14+    | 90+  | -           |

## API-Specific Support

| API                  | Chrome | Firefox | Safari | Edge |
| -------------------- | ------ | ------- | ------ | ---- |
| IntersectionObserver | 51+    | 55+     | 12.1+  | 15+  |
| ResizeObserver       | 64+    | 69+     | 13.1+  | 79+  |
| MutationObserver     | 26+    | 14+     | 7+     | 12+  |
| requestIdleCallback  | 47+    | 55+     | -      | 79+  |
| Clipboard API        | 66+    | 63+     | 13.1+  | 79+  |
| Web Notifications    | 22+    | 22+     | 7+     | 14+  |
| IndexedDB            | 24+    | 16+     | 10+    | 12+  |
| WebSocket            | 16+    | 11+     | 6+     | 12+  |
| crypto.subtle        | 37+    | 34+     | 11+    | 12+  |

Fallbacks are provided for unsupported features where possible.
