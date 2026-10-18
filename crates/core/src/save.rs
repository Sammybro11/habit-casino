use std::fs;
use std::path::Path;

use crate::game::Game;
use crate::model::SaveData;

pub fn save_game(game: &Game, path: &Path) -> std::io::Result<()> {
    let mut inventory = Vec::new();
    for (clip, count) in &game.inventory {
        for _ in 0..*count {
            inventory.push(*clip);
        }
    }

    let data = SaveData {
        habits: game.habits.clone(),
        inventory,
        active_bonus: game.active_bonus.clone(),
    };

    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    fs::write(path, json)
}

pub fn load_game(path: &Path) -> std::io::Result<Option<Game>> {
    let Ok(json) = fs::read_to_string(path) else {
        return Ok(None);
    };

    let data: SaveData = serde_json::from_str(&json)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    let mut inventory = std::collections::HashMap::new();
    for clip in data.inventory {
        *inventory.entry(clip).or_insert(0) += 1;
    }

    Ok(Some(Game {
        habits: data.habits,
        inventory,
        active_bonus: data.active_bonus,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{ActiveBonus, BonusResult};
    use std::time::{Duration, SystemTime};

    #[test]
    fn active_bonus_round_trips_through_save() {
        let mut game = Game::new();
        game.add_habit("Read".to_string(), Some(60));
        game.active_bonus = Some(ActiveBonus {
            habit: 0,
            kind: BonusResult::Clip50,
            expire: SystemTime::now() + Duration::from_secs(600),
        });
        let path = std::env::temp_dir().join(format!("hc-test-{}.json", std::process::id()));
        save_game(&game, &path).unwrap();
        let loaded = load_game(&path).unwrap().unwrap();
        let _ = std::fs::remove_file(&path);
        assert!(loaded.bonus_ready(0));
    }

    #[test]
    fn bonus_wheel_always_lands_on_a_variant() {
        for _ in 0..200 {
            match BonusResult::random() {
                BonusResult::Clip100
                | BonusResult::Clip50
                | BonusResult::Clip25
                | BonusResult::Clip0 => {}
            }
        }
    }
}
