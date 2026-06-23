use serde::{Serialize, Deserialize};

#[derive(Debug)]
pub struct Habit {
    pub name: String,
    pub completions: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Clip {
    Red,
    Blue,
    Green,
    Yellow,
    Purple,
    Orange,
    Gold,
}

#[derive(Debug, Clone, Copy)]
pub enum Tier {
    One,
    Two,
    Three,
}

#[derive(Debug)]
pub enum SpinResult {
    Reward(Tier),
    Bonus,
    Jackpot,
}

#[derive(Debug)]
pub struct SaveData {
    pub habits: Vec<Habit>,
    pub inventory: Vec<Clip>,
}
