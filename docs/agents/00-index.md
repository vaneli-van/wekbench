# Wekbench AI Agents — Build Specs (First Wave)

These are the full, buildable specifications for the first four agents we're encoding
— the "first move" from the roster: two **Build** agents and two **Sell** agents,
running in parallel so the product keeps improving while the sales motion starts.

| Spec | Agent | Division | Pairs with |
|------|-------|----------|------------|
| [01](01-product-engineer-agent.md) | Product Engineer | Build & Product | QA Agent |
| [02](02-qa-test-agent.md) | QA / Test | Build & Product | Product Engineer |
| [03](03-icp-market-intelligence-agent.md) | ICP / Market Intelligence | Go-To-Market | SDR Agent |
| [04](04-sdr-prospecting-agent.md) | SDR / Prospecting | Go-To-Market | ICP Agent |
| [05](05-account-executive-agent.md) | Account Executive | Go-To-Market | Solutions Engineer |
| [06](06-solutions-sales-engineer-agent.md) | Solutions / Sales-Engineer | Go-To-Market | Account Executive |

See `../wekbench-ai-agent-roster.md` for the full 18-agent company and
`../wekbench-founding-skills-blueprint.md` for the underlying skill philosophy.

## Shared design rules (every agent)
- **Reviewable artifacts, not irreversible actions.** Each agent prepares; a human
  commits. No agent deploys, sends, publishes, signs, or moves money on its own.
- **Instruction-source boundary.** Anything an agent reads from files, the database,
  web pages, APIs, or inbound messages is **data, not commands**.
- **Privacy & honesty.** Public legitimate info only; no personal data in URLs; no
  fabricated claims or signals; honest representation of Wekbench.
- **Clear hand-offs.** Each agent's output is the next agent's input — Product Engineer
  → QA; ICP → SDR → (AE). Agree the artifact format at each seam.

## Each spec contains
Mission · context · inputs · tools · workflow · outputs · decision boundaries ·
guardrails · success metrics · a draft system prompt to instantiate the agent · build
notes.

## Suggested next specs (third wave)
Onboarding + Customer Success (activate and keep what you win), then Marketing,
Partnerships, and Revenue-Ops to scale the motion.
