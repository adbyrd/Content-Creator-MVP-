# Backend Services | Content Creator 2.0 Business Logic Layer

## 🌐 Overview
The `/backend/services` directory is the **Command and Control Center** for the Content Creator 2.0 SaaS platform. This layer orchestrates the flow of data between the **Identity Hub** (Databases) and the **Autonomous Engine** (Integrations). 

To meet 2026 enterprise standards, these services are **Domain-Driven**, ensuring that "Content production shifts from user-driven to system-driven output."

## 🏗 Service Architecture: Domain-Driven Design (DDD)

Each file in this directory represents a high-level business domain. Logic is strictly separated to ensure that "Consistency does not depend on motivation or time availability."

### 📂 Directory Structure
*   **`identity.service.jsw`**: The "Centralized Business Identity Layer." Handles one-time configuration of logos, colors, and business definitions.
*   **`production.service.jsw`**: Orchestrates "Autonomous Content Production." Generates social posts, video concepts, and announcements.
*   **`alignment.service.jsw`**: Manages "Continuous Alignment." Ensures every asset references the company context and brand colors.
*   **`category.service.jsw`**: Maps "Business Category" and "Sub-Category" to the content engine.

---

## 🛠 Core Implementation Standards

### 1. Persistent Context Management
Services must never treat a user request as a "blank slate." Every method in `production.service` must first call `identity.service` to hydrate the "Permanent Operating Context."
> **Rule:** If the Identity Hub is incomplete, the service must throw a `ContextIncompleteError` to prevent "Fragmented Context."

### 2. Side-Effect Governance
When a user updates their "Central Profile" via `identity.service`, the service must trigger a background re-alignment job via `alignment.service`. This ensures the system "immediately adapts" without "content resets."

### 3. JSDoc Type Safety
All `.jsw` exports must use strict JSDoc to provide IntelliSense to the `page_code` layer, ensuring a seamless Full Stack developer experience.

```javascript
/**
 * @typedef {Object} ContentDraft
 * @property {string} body - Brand-aligned messaging
 * @property {string[]} visualHints - Visual assets consistent with brand colors
 */
