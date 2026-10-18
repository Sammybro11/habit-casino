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
        active_bonus: None,
    }))
}
