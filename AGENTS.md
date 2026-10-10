# Project Architecture Rules

- Order records keep purchase-time names, quantities, units, and prices; admin views resolve current product images by stored product ID so historical pricing stays immutable.
- Disable browser and router scroll-position restoration so page reloads do not restore stale positions near the footer; retain normal route top/hash scrolling.