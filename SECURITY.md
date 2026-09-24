# Security Policy — Geometry Reasoning Stand V2

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

---

## Reporting a Vulnerability

The **Geometry Reasoning Stand** is a client-side web application and local evaluation testbed running on Node.js and modern web browsers.

If you discover a security vulnerability (such as unintended execution risks, cross-site scripting bugs, or secret leakages):

1. **Do NOT open a public GitHub issue.**
2. Send an email directly to the maintainer: **`A50kv109@gmail.com`** with the subject line `[SECURITY] Geometry Reasoning Stand V2`.
3. Alternatively, use the private **Report a vulnerability** feature under the **Security** tab of the GitHub repository.
4. Provide a detailed summary, clear reproduction steps, and relevant environment information.

The maintainer will acknowledge receipt within 48 hours and coordinate a fix prior to any public disclosure.

---

## Security Invariants

1. **Zero Secret Leakage:** The Stand codebase contains zero hardcoded API keys, passwords, or personal credentials. The `.env.example` file serves purely as an environment variable template.
2. **Deterministic Client-Side Execution:** User constructions and agent commands are executed strictly through deterministic analytical TypeScript functions. The Stand never uses `eval()`, dynamic `Function` generation, or unvalidated external script injection.
3. **Epistemic Sandboxing:** Exploratory hypotheses and agent actions execute in isolated sandbox contexts, guaranteeing that unverified operations cannot corrupt the main application state.
