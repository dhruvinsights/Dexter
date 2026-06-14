# 00 — Product Vision

> **Orbital Sentinel** — an orbital sustainability simulation & decision-support platform.
> This document defines *what we are building and why*, independent of any technology.

---

## The Problem

Low Earth Orbit is filling up. There are ~30,000+ tracked objects and millions of untracked
fragments. Every collision creates more debris, which raises the chance of further collisions —
the **Kessler Syndrome** feedback loop. Decisions made in this decade (how many launches we allow,
whether we actively remove debris, how we manage traffic) determine whether key orbital shells stay
usable for the next century.

The people who make those decisions — regulators, space agencies, satellite operators, insurers,
policy researchers — currently reason about this through dense academic models and spreadsheets.
**There is no tool that lets a non-specialist *see* what a policy does to the orbital environment
over time.**

## What We Are Building

A platform where a user can:

1. **See** the current orbital environment — Earth, real satellites, debris, orbital motion.
2. **Choose** a sustainability policy — Active Debris Removal (ADR), launch caps, mandatory deorbit,
   AI-assisted traffic management, or hybrid combinations.
3. **Run** a scenario — a physics-based simulation of how the environment evolves over decades.
4. **Watch** the consequences play out visually — congestion growing or shrinking, collision risk
   rising or falling, shells becoming unusable or recovering.
5. **Compare** policies side by side and understand the trade-offs.
6. **Ask** an AI Sustainability Analyst to explain what they're seeing in plain language.

The defining quality: **it should feel alive and dynamic — a living orbital environment you can
steer — not a dashboard of static charts.** Charts support the story; the 3D simulation *is* the
story.

## Who It Is For

| Audience | What they need from it |
|---|---|
| Policy makers / regulators | Intuitive "what if" exploration without a physics PhD |
| Space agencies / operators | Credible projections grounded in real data + validated models |
| Researchers | A fast front-end over MOCAT-class simulations |
| Educators / public | A way to *understand* the orbital debris crisis viscerally |
| Insurers / risk analysts | Comparative risk under different futures |

Primary design constraint that follows: **the interface must be legible to someone non-technical.**
This is why we are leaving the the reference project UI behind — it is an expert tool dense with tracking jargon.

## What Success Looks Like (long term, not a demo)

- A regulator can load the platform, pick "Aggressive ADR vs Business-as-usual," and within a minute
  *see and understand* that one future keeps the 500–600 km shell usable and the other doesn't.
- The visualization is faithful to the underlying science — we never show motion or numbers the model
  didn't actually produce.
- New policies and new simulation backends can be added without rebuilding the frontend.
- The system runs on real CelesTrak data and real MOCAT (or comparable) simulation output.
- It is credible enough to put in front of an actual space-sustainability stakeholder.

## What This Is *Not*

- **Not a satellite tracker.** Tracking ("where is object 25544 right now") is a *contextual* feature,
  not the product. (This is the core reason a tracker codebase is the wrong foundation to build *on*,
  though its rendering assets are reusable.)
- **Not a physics engine.** The physics, policy modeling, metrics, and AI live in a separate backend
  owned by teammates. This repo is the **simulator front-end, visualization, and integration layer.**
- **Not a charts dashboard with a globe stuck in the corner.** The simulation is the centerpiece.

## My Responsibility In This Project

This repository owns:

- **Simulator front-end** — the interactive 3D orbital environment.
- **Visualization** — rendering the live sky and the scenario evolution faithfully and beautifully.
- **Front-end application** — the entire user-facing product shell (B&W, modern, non-technical).
- **Integration layer** — clean contracts so the backend team's APIs (data, simulation, metrics, AI)
  plug in without frontend rewrites.

The backend team owns: CelesTrak ingestion, MOCAT simulation, metrics & sustainability scoring,
FastAPI services, and the AI analyst. See [01_SYSTEM_ARCHITECTURE.md](01_SYSTEM_ARCHITECTURE.md).

## Guiding Principles

1. **Fidelity over flash.** Never visualize something the model didn't compute. If MOCAT outputs
   shell densities, we render densities honestly — not fake individual trajectories pretending to be real.
2. **The contract is the product boundary.** Frontend and backend meet only at a documented data
   contract ([03_DATA_CONTRACTS.md](03_DATA_CONTRACTS.md)). Either side can be mocked or replaced.
3. **Legible to a non-expert.** Every screen should be understandable without a glossary.
4. **Reuse the art, rebuild the engine.** the reference project's textures/models are assets; its WebGL renderer
   and tracking UI are not our foundation.
5. **Build for replacement, not permanence.** Providers, scenarios, and backends are swappable.
