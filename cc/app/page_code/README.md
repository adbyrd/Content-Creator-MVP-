# Frontend Architecture | Content Creator 2.0 Identity Hub UI

## 🌐 Overview
The `/page_code` directory manages the user interface for the **Content Creator 2.0** platform. To align with 2026 enterprise standards, the UI is decoupled into **Domain-Specific Directories**. This ensures the "Identity Hub" configuration remains separate from the "Autonomous Production" dashboard, reducing cognitive load for the user and maintenance overhead for developers.

## 🏗 Directory Structure: Domain-Driven UI

We move away from generic "Main Pages" toward **User-Lifecycle** grouping to reflect the "Strategic Impact" of a persistent system.

### 📂 Directory Mapping
*   **`/global`**: Shared UI logic (e.g., `masterPage.js`).
*   **`/marketing`**: High-conversion landing pages and the **Auth-Gate** (`memberCheck`).
*   **`/dashboard`**: The core "Identity Engine" workspace.
    *   `profile-settings.page.js`: The "Business Identity Hub" configuration.
    *   `project-explorer.page.js`: Management of "Autonomous Content Production."
*   **`/modals`**: (Formerly Popups) Purpose-built overlays for "Business Definition" and "Customer Definition."

---

## 🛠 2026 Implementation Standards

### 1. State Hydration from Identity Hub
To prevent "Fragmented Context," pages within the `/dashboard` must hydrate their state directly from the `backend/services/identity.service.jsw`. 
> **Standard:** UI elements (buttons, headers) must dynamically inherit the **Brand Color Palette** stored in the user's permanent profile.

### 2. Reactive Configuration (Immediate Adaptation)
When a user updates their "Business Category" in a modal, the parent page must reactively update without a full reload. This ensures the system "immediately adapts" as described in the white paper.

### 3. Modular CSS (Standardized Styling)
All page-specific styles reside in `/css`, utilizing CSS Modules where possible. Global branding constants (Colors, Logos) are injected via the `masterPage.js` to ensure "Visual assets remain consistent."

---

## 🚀 Page Mapping: White Paper Alignment


| View | Functional Role | White Paper Requirement |
| :--- | :--- | :--- |
| **`profile-settings`** | One-time profile setup. | **Identity Hub Setup** |
| **`project-explorer`** | Monitoring system-driven output. | **Autonomous Production** |
| **`settings-branding`** | Managing Logo & Color Palette. | **Brand Identity** |
| **`auth-gate`** | Verifying persistent access. | **Member Access** |

---

## 🔒 UX Governance & Performance
*   **Optimistic UI:** All "Business Definition" updates must show optimistic success states to reduce friction.
*   **Zero-Prompt Design:** The UI is designed to minimize manual input. Once the "Identity Profile" is established, the dashboard focuses on **Review & Approve** rather than **Create from Scratch**.

---
*Created for Content Creator 2.0: Consistency should not depend on motivation.*
