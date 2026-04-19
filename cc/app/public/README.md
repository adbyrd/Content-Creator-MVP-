# Public Assets & Shared Logic | Content Creator 2.0 Identity Engine

## 🌐 Overview
The `/public` directory serves as the **Shared Client-Side Resource Layer** for Content Creator 2.0. To align with 2026 enterprise standards, this directory is strictly reserved for UI utility functions, shared interface constants, and CSS modules that enforce **Continuous Alignment** across the platform.

## 🏗 Directory Structure

*   **`/styles`**: Global CSS modules and brand-theme definitions.
*   **`/utils`**: High-performance, client-side helper functions.
*   **`constants.js`**: Shared UI strings and configuration enums (e.g., Category lists).

---

## 🛠 Shared Logic Domains

### 1. Brand Theming (`/styles`)
This domain ensures that "Visual assets remain consistent with brand colors and logo usage."
*   **`theme.css`**: Defines CSS variables that are dynamically updated via the **Identity Hub**.
*   **`animations.js`**: Standardized transitions for the "Autonomous Production" dashboard.

### 2. UI Utilities (`/utils`)
Lightweight functions used across multiple pages to reduce bundle size and ensure a "Persistent System" feel.
*   **`formatters.js`**: Standardizes the display of "Business Category" and "Customer Type."
*   **`validators.js`**: Client-side validation for "Brand Identity" inputs (e.g., Hex code verification).

### 3. Shared Enums (`constants.js`)
To prevent "Fragmented Context," the frontend must use the exact same taxonomies as the backend.
*   **`BUSINESS_CATEGORIES`**: Matches the `backend/config` definitions.
*   **`CUSTOMER_TYPES`**: Matches the "Customer Definition" schema (B2B, B2C, etc.).

---

## 🚀 2026 Implementation Standards

### 1. Dynamic Asset Hydration
Public utilities must facilitate the "one-time configuration" model. For example, a `getBrandAsset()` utility should automatically fetch the user's logo from the persistent profile to populate the UI.

### 2. Performance-First Design (Tree Shaking)
All files in `/public` must use **Named Exports** to allow the Velo bundler to optimize the application.
```javascript
// ✅ Correct Standard
export const formatAudience = (type) => { ... };

// ❌ Avoid Default Exports
export default { ... };
