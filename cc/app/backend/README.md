# Backend Services | Content Creator 2.0 Identity Hub

## 🌌 Overview
This directory contains the core business logic for **Content Creator 2.0**. This backend architecture implements a **Persistent Business Identity Layer**, moving away from fragmented, prompt-based AI interactions toward an autonomous, system-driven content engine.

## 🏗 Architecture: Domain-Driven Design (DDD)
To ensure scalability and alignment with 2026 enterprise standards, this backend is structured around **Domain-Specific Services**. Each service manages a distinct part of the "Identity Hub".

### 📂 Directory Structure
*   **`/services`**: High-level domain logic (e.g., `identity.service.jsw`).
*   **`/integrations`**: Connectors for AI content generation and asset APIs.
*   **`/data`**: Data Access Objects (DAO) for the `Profiles` and `Projects` collections.
*   **`/config`**: Environment constants, brand color palettes, and category definitions.

---

## 🛠 Core Services & Identity Mapping


| Service | Responsibility | White Paper Reference |
| :--- | :--- | :--- |
| **`identity.service.jsw`** | Manages the **Identity Hub** (Logo, Colors, Product Details). | The Content Creator 2.0 Identity Hub |
| **`alignment.service.jsw`** | Ensures all generated assets reference the **Company Context**. | Continuous Alignment |
| **`production.service.jsw`** | Orchestrates **Autonomous Content Production** (Social, Video). | Autonomous Content Production |

---

## 🚀 2026 Implementation Standards

### 1. Persistent Context Injection
Every generation request must be wrapped in a `contextualizer` function. This function fetches the **Business Identity Profile** (Industry, Audience, Brand Voice) and injects it as a system prompt to prevent "fragmented context".

### 2. Autonomous Workflow (System-Driven Output)
Logic within `production.service.jsw` is designed to be triggered by system-level events or scheduled jobs. This shifts the platform from a **User-driven** tool to a **System-driven** marketing engine.

### 3. Type-Safe Data Schema
All backend interactions with the `Profiles` database must adhere to the **Business Definition** schema:
*   `brandColor`: Hex-validated strings.
*   `customerType`: Enum (B2B, B2C, Local Service).
*   `category`: Pre-defined industry taxonomy.

---

## 🔒 Security & Permissions
*   **Web Methods**: All `.jsw` exports require `wix-members` authentication.
*   **Data Integrity**: Users may only update their own **Central Profile**. Changes to this profile must trigger a system-wide "Alignment Reset" to ensure all future content immediately adapts.

---
*Created for the Content Creator 2.0 SaaS Platform Development Team.*