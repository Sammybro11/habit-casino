use std::fs;

use crate::model::RewardTable;

pub fn load_rewards() -> RewardTable {
    let json = fs::read_to_string("assets/rewards.json")
        .expect("Couldn't read rewards.json");

    serde_json::from_str(&json)
        .expect("Invalid rewards.json")
}
