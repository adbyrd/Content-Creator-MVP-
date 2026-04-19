# Backend Configuration | Content Creator 2.0 Identity Engine

## 🌐 Overview
The `/backend/config` directory serves as the **Single Source of Truth (SSOT)** for the Content Creator 2.0 SaaS platform. To align with 2026 enterprise standards, this directory centralizes immutable business logic, industry taxonomies, and environment-specific constants, ensuring the **Identity Hub** remains consistent across all autonomous content streams.

## 🏗 Directory Structure

*   **`constants.js`**: Global application constants (e.g., Trial limits, API timeouts).
*   **`taxonomy.js`**: Strict definitions for **Business Categories** and **Sub-Categories**.
*   **`branding.js`**: Default brand configurations and supported color palette schemas.
*   **`audience.js`**: Enumerations for **Customer Types** (B2B, B2C, Local Service, etc.).

---

## 🛠 Configuration Domains

### 1. Business Taxonomy (`taxonomy.js`)
Maintains the hierarchical structure used by the **Business Definition** layer. 
> **Standard:** All category updates here must be reflected in the `production.service` to ensure AI-generated "Industry-relevant commentary" remains accurate.

### 2. Identity Hub Defaults (`branding.js`)
Defines the required schema for a "Permanent Business Profile":
*   **Logo Requirements:** Dimensions, file types, and aspect ratios.
*   **Color Palettes:** Logic for primary/secondary color mapping used in visual asset generation.

### 3. Audience Matrices (`audience.js`)
Maps **Customer Types** to specific messaging tones. This ensures that "Messaging remains focused on the correct customer type" during autonomous production.

---

## 🚀 2026 Implementation Standards

### Immutable Exports
To prevent runtime side effects, all configuration objects must be exported as **frozen constants**.
```javascript
export const BUSINESS_CATEGORIES = Object.freeze({
    LOCAL_SERVICE: 'local_service',
    B2B_SAAS: 'b2b_saas',
    // ...
});