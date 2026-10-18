use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Mutex,
};

use habit_casino_core::{
    game::Game,
    model::{Clip, CompleteResult, Habit, RewardDesc, RewardTable, SpinResult, Tier},
    reward, save,
};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

struct AppState {
    game: Mutex<Game>,
    rewards: RewardTable,
    save_path: PathBuf,
    reward_log: Mutex<Vec<EarnedReward>>,
    reward_log_path: PathBuf,
}

#[derive(Serialize, Deserialize, Clone)]
struct EarnedReward {
    id: u64,
    used: bool,
    reward: RewardDesc,
}

fn save_reward_log(log: &[EarnedReward], path: &Path) {
    if let Ok(json) = serde_json::to_string_pretty(log) {
        let _ = std::fs::write(path, json);
    }
}

#[derive(Serialize)]
struct GameState {
    habits: Vec<Habit>,
    inventory: HashMap<Clip, u32>,
    tiers: Vec<Tier>,
}

#[derive(Serialize)]
struct SpinOutcome {
    result: SpinResult,
    reward: Option<RewardDesc>,
}

#[tauri::command]
fn game_state(state: State<AppState>) -> GameState {
    let game = state.game.lock().unwrap();
    GameState {
        habits: game.habits.clone(),
        inventory: game.inventory.clone(),
        tiers: game.available_tier(),
    }
}

#[tauri::command]
fn complete_habit(index: usize, state: State<AppState>) -> CompleteResult {
    let mut game = state.game.lock().unwrap();
    let result = game.complete_habit(index, false);
    let _ = save::save_game(&game, &state.save_path);
    result
}

#[tauri::command]
fn add_habit(name: String, repeat_mins: Option<u32>, state: State<AppState>) {
    let mut game = state.game.lock().unwrap();
    game.add_habit(name, repeat_mins);
    let _ = save::save_game(&game, &state.save_path);
}

#[tauri::command]
fn remove_habit(index: usize, state: State<AppState>) {
    let mut game = state.game.lock().unwrap();
    game.remove_habit(index);
    let _ = save::save_game(&game, &state.save_path);
}

#[tauri::command]
fn spin(tier: Tier, state: State<AppState>) -> Result<SpinOutcome, String> {
    let mut game = state.game.lock().unwrap();
    if !game.activate_tier(tier) {
        return Err("Not enough clips".into());
    }
    let result = game.spin(tier);
    let reward = match &result {
        SpinResult::Reward(_) | SpinResult::Jackpot => {
            Some(state.rewards.random_reward(&result).clone())
        }
        SpinResult::Bonus(_) => None,
    };
    let _ = save::save_game(&game, &state.save_path);
    if let Some(reward) = &reward {
        let mut log = state.reward_log.lock().unwrap();
        let id = log.iter().map(|r| r.id).max().unwrap_or(0) + 1;
        log.push(EarnedReward {
            id,
            used: false,
            reward: reward.clone(),
        });
        save_reward_log(&log, &state.reward_log_path);
    }
    Ok(SpinOutcome { result, reward })
}

#[tauri::command]
fn reward_log(state: State<AppState>) -> Vec<EarnedReward> {
    state.reward_log.lock().unwrap().clone()
}

#[tauri::command]
fn use_reward(id: u64, state: State<AppState>) {
    let mut log = state.reward_log.lock().unwrap();
    if let Some(entry) = log.iter_mut().find(|r| r.id == id) {
        entry.used = true;
    }
    save_reward_log(&log, &state.reward_log_path);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // ponytail: save lives in app data dir, diverging from the CLI's
            // save.json in cwd; reconcile into one shared location later
            let dir = app.path().app_data_dir()?;
            let _ = std::fs::create_dir_all(&dir);
            let save_path = dir.join("save.json");
            let game = match save::load_game(&save_path) {
                Ok(Some(game)) => game,
                _ => {
                    let mut game = Game::new();
                    game.add_habit("Reading".to_string(), Some(60));
                    game
                }
            };
            let rewards =
                reward::load_rewards_from_str(include_str!("../../assets/rewards.json"));
            let reward_log_path = dir.join("rewards.json");
            let reward_log = std::fs::read_to_string(&reward_log_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            app.manage(AppState {
                game: Mutex::new(game),
                rewards,
                save_path,
                reward_log: Mutex::new(reward_log),
                reward_log_path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            game_state,
            complete_habit,
            add_habit,
            remove_habit,
            spin,
            reward_log,
            use_reward
        ])
        .run(tauri::generate_context!())
        .expect("error while running habit-casino");
}
