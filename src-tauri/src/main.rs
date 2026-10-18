use std::{collections::HashMap, path::PathBuf, sync::Mutex};

use habit_casino_core::{
    game::Game,
    model::{Clip, CompleteResult, Habit, RewardDesc, RewardTable, SpinResult, Tier},
    reward, save,
};
use serde::Serialize;
use tauri::{Manager, State};

struct AppState {
    game: Mutex<Game>,
    rewards: RewardTable,
    save_path: PathBuf,
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
    Ok(SpinOutcome { result, reward })
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
            app.manage(AppState {
                game: Mutex::new(game),
                rewards,
                save_path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![game_state, complete_habit, spin])
        .run(tauri::generate_context!())
        .expect("error while running habit-casino");
}
