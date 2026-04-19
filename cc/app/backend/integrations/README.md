# External Integrations | Content Creator 2.0 Autonomous Engine

## 🌐 Overview
The `/backend/integrations` directory acts as the **Abstraction Layer** for all third-party services within the Content Creator 2.0 ecosystem. To meet 2026 enterprise standards, this layer ensures that the **Business Identity Hub** remains decoupled from specific AI vendors (OpenAI, Anthropic, Midjourney, etc.), allowing for seamless model swapping without disrupting the "Persistent Context" architecture.

## 🏗 Integration Architecture: The Wrapper Pattern

All integrations in this directory must follow a **Provider-Agnostic Wrapper** pattern. This ensures that if a content generation provider changes, the core `production.service.jsw` remains untouched.

### 📂 Directory Structure
*   **`llm_provider.js`**: Orchestrates text-based "Autonomous Content Production" (Social posts, commentary).
*   **`visual_gen.js`**: Interface for "Visual assets" consistent with brand colors and logos.
*   **`video_engine.js`**: Logic for "Short-form video concepts".
*   **`crm_sync.js`**: (Optional) Synchronizes "Customer Definition" data with external marketing stacks.

---

## 🛠 Core Implementation Standards

### 1. Identity Context Injection
Every outgoing request to an AI integration **must** be hydrated with the user's `Business Identity` profile. 
> **Standard:** No "naked" prompts are permitted. The integration must automatically prepend the "Permanent Operating Context" (Logo, Colors, Product Specs) to ensure "Continuous Alignment".

### 2. Failure Resilience (Circuit Breaker)
In 2026, enterprise SaaS stability is paramount. All integrations must implement:
*   **Retries:** Exponential backoff for rate-limited AI APIs.
*   **Fallbacks:** Secondary providers (e.g., falling back to a lightweight model) if the primary engine is down.

### 3. Secret Management
**Strict Prohibition:** No API keys or Bearer tokens may be hardcoded. 
*   All credentials must be accessed via `wix-secrets-backend`.
*   All requests must be executed from the backend to prevent client-side exposure.

---

## 🚀 Service Mapping: White Paper Alignment


| Integration | Functional Role | White Paper Requirement |
| :--- | :--- | :--- |
| **`llm_provider`** | "Autonomous Content Production" | Industry-relevant commentary & Social posts. |
| **`visual_gen`** | "Visual Consistency" | Alignment with brand color palette & logos. |
| **`video_engine`** | "Video Conceptualization" | Production of short-form video concepts. |

---

## 🔒 Governance & Usage
*   **Statelessness:** Integration files should remain stateless; all user-specific context must be passed in as arguments from the `services/` layer.
*   **Logging:** All outbound calls must log `executionTime` and `tokenUsage` to monitor "Strategic Impact" and operational costs.

---
*Created for Content Creator 2.0: Transforming content from a repetitive task into a persistent system.*