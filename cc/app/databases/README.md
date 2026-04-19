# Database Architecture | Content Creator 2.0 Identity Engine

## 🌐 Overview
The `/databases` directory defines the **Persistent Identity Layer** for the Content Creator 2.0 platform. To align with 2026 enterprise standards, this architecture moves away from fragmented, session-based storage toward a **Centralized Business Identity Hub**. This ensures that once a business is defined, its "Permanent Operating Context" powers all autonomous content generation without further manual input.

## 🏗 Schema Design: Domain-Centric Collections

Data is organized into high-integrity collections to ensure "Continuous Alignment" across the SaaS ecosystem.

### 🗄 Core Collections

*   **`Profiles`**: The "Identity Hub." Stores company logos, brand color palettes, and the "Business Definition" (Category, Sub-Category).
*   **`Projects`**: Manages "Autonomous Content Production" outputs, including social posts, video concepts, and promotional announcements.
*   **`AudienceDefinitions`**: Stores the "Customer Type" (B2C, B2B, Local Service) and target audience parameters.

---

## 🛠 2026 Implementation Standards

### 1. Relational Integrity
While Wix/Velo utilizes a NoSQL structure, we enforce **strict relational mapping** between `Profiles` and `Projects`. 
> **Standard:** Every record in the `Projects` collection must contain a reference to a `ProfileID` to ensure "Every generated post references the company context."

### 2. Validation & Hooks (`data.js`)
All collections must utilize **Before-Insert** and **Before-Update** hooks to validate brand consistency:
*   **Color Validation:** Ensures `brandColor` strings are valid hex codes.
*   **Category Enforcement:** Restricts "Business Category" inputs to the approved `taxonomy.js` definitions.

### 3. Data Residency & Privacy
In compliance with 2026 global SaaS standards (GDPR/CCPA+):
*   **PII Masking:** User-specific contact data is decoupled from the "Business Identity Hub."
*   **Owner-Only Permissions:** Collection permissions are set to `Site Member Author`, ensuring creators can only access their own persistent company profile.

---

## 🚀 Strategic Mapping: White Paper Alignment


| Collection | Strategy | White Paper Requirement |
| :--- | :--- | :--- |
| **`Profiles`** | "One-time configuration." | **Identity Hub Configuration** |
| **`Projects`** | "System-driven output." | **Autonomous Content Production** |
| **`Audience`** | "Messaging remains focused." | **Customer Definition** |

---

## 🔒 Governance & Schema Evolution
*   **Immutable Context:** Once the "Identity Profile" is established, schema changes to core identity fields (Logo, Colors) must trigger an automated "Alignment Reset" in the `production.service.jsw`.
*   **Indexing:** The `ProfileID` and `BusinessCategory` fields must be indexed to maintain high performance during autonomous "Continuous Content Flow."

---
*Created for Content Creator 2.0: Turning business profiles into living content systems.*
