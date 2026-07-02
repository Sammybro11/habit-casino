use std::collections::HashMap;
use rand::Rng;

use crate::model::*;

pub struct Game {
    pub habits: Vec<Habit>,
    pub inventory: HashMap<Clip, u32>,
}

impl Game {
    pub fn new() -> Self {
        Self {
            habits: Vec::new(),
            inventory: HashMap::new(),
        }
    }

    pub fn add_habit(&mut self, name: String) {
        self.habits.push(
            Habit {
                name,
                completions: 0,
            }
        );
    }

    pub fn show_habits(&self) {
        for (idx, habit) in self.habits.iter().enumerate() {
            println!(
                "{}. {} ({})",
                idx,
                habit.name,
                habit.completions
            );
        }
    }

    pub fn complete_habit(&mut self, index: usize) -> Clip {
        self.habits[index].completions += 1;

        let clip = Clip::random_clip();
        *self.inventory.entry(clip).or_insert(0) += 1;
        clip
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


}
