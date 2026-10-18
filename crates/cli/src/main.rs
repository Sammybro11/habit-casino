use habit_casino_core::game::Game;
use habit_casino_core::model::{Tier, CompleteResult, SpinResult};
use habit_casino_core::{reward, save};
use std::io;
use std::path::Path;

const SAVE_PATH: &str = "save.json";

fn main() {
    let mut game = match save::load_game(Path::new(SAVE_PATH)) {
        Ok(Some(game)) => {
            println!("Loaded save from {}", SAVE_PATH);
            game
        }
        Ok(None) => Game::new(),
        Err(e) => {
            eprintln!("Couldn't load save ({}), starting fresh", e);
            Game::new()
        }
    };

    if game.habits.is_empty() {
        game.add_habit("Reading".to_string(), Some(60));
    }
    let rewards = reward::load_rewards();

    loop {
        println!();
        println!("1. Show Habits");
        println!("2. Complete Habit");
        println!("3. Show Inventory");
        println!("4. Quit");

        let mut input = String::new();

        io::stdin()
            .read_line(&mut input)
            .unwrap();

        match input.trim() {
            "1" => game.show_habits(),
            "2" => {
                match game.complete_habit(0, false) {

                    CompleteResult::Normal { clip } => {
                        println!("Received {:?}", clip);
                    }

                    CompleteResult::Bonus { bonus_clip } => {
                        println!(
                            "BONUS COMPLETE! Extra {:?}",
                            bonus_clip
                        );
                    }

                    CompleteResult::Error { err } => {
                        println!("Error: {:?}", err);
                        continue;
                    }
                }
                let _ = save::save_game(&game, Path::new(SAVE_PATH));
                let tiers = game.available_tier();
                println!(
                    "Available Tiers: {:?}",
                    tiers
                );
                println!(
                    "Select Tier (1/2/3):"
                );

                let mut tier_input =
                    String::new();

                io::stdin()
                    .read_line(&mut tier_input)
                    .unwrap();

                let tier =
                    match tier_input.trim() {

                        "1" => Tier::One,
                        "2" => Tier::Two,
                        "3" => Tier::Three,

                        _ => continue,
                    };

                if game.activate_tier(tier) {
                    println!(
                        "Activated! {:?}", tier
                    );

                    let reward_type = game.spin(tier);
                    match reward_type {
                        SpinResult::Reward(_) | SpinResult::Jackpot => {
                            let reward = rewards.random_reward(&reward_type);
                            println!("{:#?}", reward);
                        }

                        SpinResult::Bonus(tier) => {
                            println!("Bonus for {:?}", tier);
                        }
                    }
                    let _ = save::save_game(&game, Path::new(SAVE_PATH));
                } else {
                    println!(
                        "Not enough clips!"
                    );
                }
            }
            "3" => game.show_inv(),
            "4" => break,

            _ => {}

        }
    }

    let _ = save::save_game(&game, Path::new(SAVE_PATH));
    println!("Saved to {}", SAVE_PATH);
    println!("{:#?}", game.inventory);
}
