use std::collections::HashMap;
use std::time::{Duration, SystemTime};
use rand::Rng;

use crate::model::*;

pub struct Game {
    pub habits: Vec<Habit>,
    pub inventory: HashMap<Clip, u32>,
    pub active_bonus: Option<ActiveBonus>
}

impl Game {
    pub fn new() -> Self {
        Self {
            habits: Vec::new(),
            inventory: HashMap::new(),
            active_bonus: None,
        }
    }

    pub fn add_habit(&mut self, name: String, repeat_mins: Option<u32>) {
        self.habits.push(
            Habit {
                name,
                completions: 0,
                repeat_mins: match repeat_mins {
                    Some(mins) => Some(mins),
                    None => None,
                },
            }
        );
    }

    pub fn show_habits(&self) {
        for (idx, habit) in self.habits.iter().enumerate() {
            println!(
                "{}. {} ({}, {})",
                idx,
                habit.name,
                habit.completions,
                match habit.repeat_mins {
                    Some(mins) => mins.to_string(),
                    None => "Non-Repeating".to_string(),
                }
            );
        }
    }

    pub fn remove_habit(&mut self, index: usize) -> Habit {
        self.habits.remove(index)
    }

    pub fn complete_habit(&mut self, index: usize, bonus: bool) -> CompleteResult {
        if !bonus {
            self.habits[index].completions += 1;

            let clip = Clip::random_clip();
            *self.inventory.entry(clip).or_insert(0) += 1;

            return CompleteResult::Normal{clip}
        } else {
            if let Some(active) = &self.active_bonus {
                if active.habit == index {
                    if SystemTime::now() <= active.expire {
                        let bonus_clip = Clip::random_clip();
                        *self.inventory.entry(bonus_clip).or_insert(0) += 1;
                        self.active_bonus = None;

                        return CompleteResult::Bonus {
                            bonus_clip
                        }
                    }
                }
            }
        }
        CompleteResult::Error { err: BonusError::NoBonus }

    }


    pub fn grant_free_clip(&mut self) -> Clip {
        let clip = Clip::random_clip();
        *self.inventory.entry(clip).or_insert(0) += 1;
        clip
    }

    pub fn bonus_ready(&self, index: usize) -> bool {
        self.active_bonus
            .as_ref()
            .is_some_and(|b| b.habit == index && SystemTime::now() <= b.expire)
    }

    pub fn show_inv(&self) {
        println!("{:#?}", self.inventory);
    }

    pub fn available_tier(&self) -> Vec<Tier> {
        let mut result = vec![Tier::One];

        if self.inventory.values().any(|&count| count >= 2) {
            result.push(Tier::Two);
        }

        if self.inventory.values().any(|&count| count >= 3)
            || self.inventory.get(&Clip::Gold).is_some_and(|&count| count > 0) {
            result.push(Tier::Three);
        }

        result
    }

    pub fn activate_tier(&mut self, tier: Tier) -> bool {
        match tier {
            Tier::One => true,
            Tier::Two => {
                let Some(clip) = self
                    .inventory
                    .iter()
                    .filter(|(_, count)| **count >= 2)
                    .min_by_key(|(_, count)| *count)
                    .map(|(&clip, _)| clip)
                else {
                    return false;
                };

                if let Some(count) = self.inventory.get_mut(&clip) {
                    *count -= 2;
                    if *count == 0 {
                        self.inventory.remove(&clip);
                    }
                    return true;
                }
                false
            }
            Tier::Three => {
                // Gold Clip used first always
                if self.inventory.get(&Clip::Gold).is_some_and(|&count| count > 0) {
                    if let Some(count) = self.inventory.get_mut(&Clip::Gold) {
                        *count -= 1;
                        if *count == 0 {
                            self.inventory.remove(&Clip::Gold);
                        }
                        return true;
                    }
                }
                // Normal Clip
                let Some(clip) = self
                    .inventory
                    .iter()
                    .filter(|(_, count)| **count >= 3)
                    .max_by_key(|(_, count)| *count)
                    .map(|(&clip, _)| clip)
                else {
                    return false;
                };

                if let Some(count) = self.inventory.get_mut(&clip) {
                    *count -= 3;
                    if *count == 0 {
                        self.inventory.remove(&clip);
                    }
                    return true;
                }
                false
            }
        }
    }

    pub fn spin(&self, tier: Tier) -> SpinResult {

        let roll = rand::rng().random_range(0..100);
        match roll {
            0..40 => SpinResult::Reward(Tier::One),
            40..70 => {
                match tier {
                    Tier::One => SpinResult::Reward(Tier::One),
                    _ => SpinResult::Reward(Tier::Two),
                }
            }
            70..90 => {
                match tier {
                    Tier::One => SpinResult::Reward(Tier::One),
                    Tier::Two => SpinResult::Reward(Tier::Two),
                    Tier::Three => SpinResult::Reward(Tier::Three),
                }
            }
            90..98 => SpinResult::Bonus(tier),
            _ => SpinResult::Jackpot,
        }
    }

    pub fn start_bonus(&mut self, habit: usize, percent: BonusResult) {
        // ponytail: PDF rule is a flat 10-minute window; repeat habits get a
        // window scaled to their interval, non-repeating ones get the flat 10
        let duration = self.habits[habit].repeat_mins.unwrap_or(10);
        let mins = duration;
        let window_secs = match percent {
            BonusResult::Clip100 => mins as u64 * 60,
            BonusResult::Clip50 => mins as u64 * 30,
            BonusResult::Clip25 => mins as u64 * 15,
            BonusResult::Clip0 => return, // Give Clip for Free
        };
        let expire = SystemTime::now() + Duration::from_secs(window_secs);
        self.active_bonus = Some(ActiveBonus {
            habit,
            kind: percent,
            expire,
        });
    }
}
