# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

`habit-casino` is a Rust project (work-in-progress) that turns habit completion into a
slot-machine-style reward game: completing a habit yields random "clips" (currency),
clips buy spins at tiered reward tables, and spins yield rewards, bonuses, or jackpots.
Reward content lives in data (`assets/rewards.json`), not code. The game core is a
library crate; UIs are thin shells on top. The planned next UI is a Tauri desktop app
with a tray companion (see `docs/ideas/tauri-desktop-edition.md`).

## Commands

- `cargo build` / `cargo run -p habit-casino` — build and run the interactive CLI
  (run from the repo root so `assets/rewards.json` resolves).
- No tests, lints, or CI exist yet. `cargo test` compiles all crates but runs zero tests.
- Running requires a working directory containing `assets/rewards.json`; `reward::load_rewards()`
  uses the relative path `assets/rewards.json` and panics if it is missing or malformed.
- Runtime state persists to `save.json` in the current working directory (gitignored).

## Workspace Layout

Cargo workspace with two members (root `Cargo.toml` is workspace-only):

- `crates/core` (`habit-casino-core`, lib) — all game logic and data, no UI:
  - `model.rs` — plain data types: `Habit`, `Clip`, `Tier`, `SpinResult`, `CompleteResult`,
    `BonusResult`, `ActiveBonus`, and serde-derived `RewardTable`/`RewardDesc` matching the
    shape of `assets/rewards.json`, plus `SaveData` for persistence.
  - `game.rs` — `Game` struct: habits, clip inventory (`HashMap<Clip, u32>`), optional
    time-limited `active_bonus`. All economy logic (`available_tier`/`activate_tier`)
    and the spin odds table (`spin`) live here.
  - `reward.rs` — loads `assets/rewards.json` into `RewardTable`.
  - `save.rs` — `save_game`/`load_game`: `Game` ↔ `SaveData` JSON round-trip.
    `ActiveBonus` is deliberately NOT persisted yet (open design question —
    bonus windows are voided on restart).
- `crates/cli` (`habit-casino`, bin) — hard-coded REPL menu loop over the lib.
  Loads the save at startup (seeds a "Reading" habit only if none exist), saves
  after each completion/spin and on quit. This shell is throwaway.
- The future Tauri app will be added as another workspace member (e.g. `src-tauri`)
  depending on `crates/core`. Keep ALL game logic in core; never put rules in a UI crate.

Dependencies `ratatui`, `crossterm`, and `color-eyre` were declared in the pre-workspace
root and were dropped in the restructure; the Tauri/web UI era will reintroduce what it
needs. `Cargo.lock` is gitignored.

## Conventions and Patterns

- All randomness uses `rand` 0.9 API: `rand::rng().random_range(0..100)` with
  percentage-band `match` arms (e.g. `Clip::random_clip`, `Game::spin`). Preserve the
  existing probabilities when editing; the bands are hand-tuned game balance.
- Game economy rules are asymmetric and deliberate:
  - Tier 2 spends 2 copies of the **least** abundant qualifying clip (`min_by_key`).
  - Tier 3 prefers spending a Gold clip; otherwise spends 3 copies of the **most**
    abundant qualifying clip (`max_by_key`).
  - Inventory entries reaching 0 are removed from the map.
- `SpinResult::Bonus(tier)` is not a reward — it must be handled separately before
  calling `RewardTable::random_reward`, which **panics** on `Bonus` by design.
- `Clip` derives `Hash`/`Eq` (plus `Serialize`/`Deserialize` for saves) so it can key
  the inventory `HashMap`; keep those derives.
- `repeat_mins: Option<u32>` on `Habit`: `None` means non-repeating. `start_bonus`
  falls back to the PDF's flat 10-minute window for non-repeating habits.
- When changing `CompleteResult` or `SpinResult` variants, update the matches in the
  CLI shell (`crates/cli/src/main.rs`) — it is the only consumer and has historically
  lagged the enum definitions.

## Editing Gotchas

- The author writes heavily wrapped, rustfmt-nonconformant code. There is no formatter
  or clippy config; do not introduce one or reformat whole files unprompted — make
  surgical edits.
- Adding reward content should go in `assets/rewards.json`, not in code; the tier lists
  must stay non-empty because `random_reward` indexes them without empty checks.
- `save.json` stores inventory as a flat `Vec<Clip>` (one entry per clip) and habits
  verbatim; changing `SaveData` shape means writing a migration or losing saves.
