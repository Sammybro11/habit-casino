use serde::{Serialize, Deserialize};
use std::time::SystemTime;
use rand::Rng;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Habit {
    pub name: String,
    pub completions: u32,
    pub repeat_mins: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Clip {
    Red,
    Blue,
    Green,
    Yellow,
    Purple,
    Orange,
    Gold,
}

impl Clip {
    pub fn random_clip() -> Self {
        let roll = rand::rng().random_range(0..100);

        match roll {
            0..15 => Clip::Red,
            15..30 => Clip::Blue,
            30..45 => Clip::Green,
            45..60 => Clip::Yellow,
            60..75 => Clip::Purple,
            75..90 => Clip::Orange,
            _ => Clip::Gold,
        }
    }
}

#[derive(Debug, Serialize)]
pub enum BonusError {
    NoBonus,
    Expired,
    WrongHabit,
}

#[derive(Debug, Serialize)]
pub enum CompleteResult {
    Normal {
        clip: Clip,
    },

    Bonus {
        bonus_clip: Clip,
    },

    Error {
        err: BonusError,
    },
}


#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Tier {
    One,
    Two,
    Three,
}

#[derive(Debug, Serialize)]
pub enum SpinResult {
    Reward(Tier),
    Bonus(Tier),
    Jackpot,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum BonusResult {
    Clip100,
    Clip50,
    Clip25,
    Clip0,
    // Will Implement Extra Spin Later, if worthwhile
}

impl BonusResult {
    /// ponytail: wheel slice odds hand-picked (75% most common, FREE rarest);
    /// Extra segment unimplemented, swap bands in if it lands
    pub fn random() -> Self {
        let roll = rand::rng().random_range(0..100);
        match roll {
            0..45 => BonusResult::Clip100,
            45..75 => BonusResult::Clip50,
            75..90 => BonusResult::Clip25,
            _ => BonusResult::Clip0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveBonus {
    pub habit: usize,
    pub kind: BonusResult,
    pub expire: SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardDesc {
    pub title: String,
    pub duration: u32,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RewardTable {
    pub tier1: Vec<RewardDesc>,
    pub tier2: Vec<RewardDesc>,
    pub tier3: Vec<RewardDesc>,
    pub jackpot: Vec<RewardDesc>,
}

impl RewardTable {
    pub fn random_reward(&self, reward_type: &SpinResult) -> &RewardDesc {
        let mut rng = rand::rng();    
        match reward_type {
            SpinResult::Reward(Tier::One) => &self.tier1[rng.random_range(0..self.tier1.len())],
            SpinResult::Reward(Tier::Two) => &self.tier2[rng.random_range(0..self.tier2.len())],
            SpinResult::Reward(Tier::Three) => &self.tier3[rng.random_range(0..self.tier3.len())],
            SpinResult::Jackpot => &self.jackpot[rng.random_range(0..self.jackpot.len())],
            _ => panic!("Bonus Triggered in random reward, should be hangled separately")
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveData {
    pub habits: Vec<Habit>,
    pub inventory: Vec<Clip>,
    #[serde(default)]
    pub active_bonus: Option<ActiveBonus>,
}
