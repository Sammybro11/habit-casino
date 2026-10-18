use std::fs;

use crate::model::RewardTable;

pub fn load_rewards() -> RewardTable {
    let json = fs::read_to_string("assets/rewards.json")
        .expect("Couldn't read rewards.json");

    load_rewards_from_str(&json)
}

pub fn load_rewards_from_str(json: &str) -> RewardTable {
    serde_json::from_str(json).expect("Invalid rewards.json")
}
