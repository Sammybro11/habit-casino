mod game;
mod model;

use game::Game;
use model::Tier;
use std::io;

fn main() {
    let mut game = Game::new();

    game.add_habit("Reading".to_string());

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
                let earned = game.complete_habit(0);
                println!("Earned {:?}", earned);
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

                    let reward = game.spin(tier);
                    println!("Recieved Reward {:?}", reward);
                    // spin wheel later
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

    println!("{:#?}", game.inventory);
}
