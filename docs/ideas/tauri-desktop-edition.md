# Habit Casino — Tauri Desktop Edition

## Problem Statement

How might we make habit completion genuinely *wanted* — a variable-reward
loop people open daily, rather than a tracker they resent?

## Recommended Direction

A single Tauri desktop app with two surfaces over the existing Rust game core:
(1) a menu-bar tray companion for the hot path — complete habit, spin, see
result, get bonus-window notifications — and (2) a full window for inventory,
stats, and reward history. Game logic (clips, tiers, spins, bonuses) stays in
a Rust lib crate, shared by both surfaces; UI is web tech inside Tauri.
No social features, no accounts, no backend server.

## Key Assumptions to Validate

- [ ] The bonus-window loop drives daily return (test: notification → completion
      rate within the window, vs. without notifications)
- [ ] You can sustain writing the web frontend long enough to ship (test:
      build the full window's spin screen first; if it's miserable, switch to
      Leptos/WASM or egui before more UI exists)
- [ ] People complete habits from the tray without opening the window (test:
      log tray vs. window completion ratio after week one)

## MVP Scope

1. Extract game core into lib crate; fix current 5 compile errors; persist
   state to disk (`SaveData`) so tray and window share one source of truth
2. Full window: habit list, complete → spin animation, inventory, reward table
3. Tray companion: complete habit + show current bonus countdown
4. Bonus-window expiry notification from tray

## Not Doing (and Why)

- Social/leaderboards — user explicitly declined; solo-first product
- Backend server/accounts — no sync, local-only file state
- Cross-platform tray polish — macOS first, where you develop
- Habit CRUD sophistication — minimal add/edit; the casino is the product
- Custom slot machine theming pass — after the loop works, not before

## Open Questions

- What happens to an active bonus across app restarts (persist expiry, or
  void it)?
- Reward "duration" field — is the app meant to enforce/enqueue reward
  time later, or is it display-only?
- Does the jackpot need any escalation mechanic to stay exciting at low
  frequency (1% roll), or is 1% fine at MVP?
