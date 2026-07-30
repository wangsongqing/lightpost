mod db;

use db::Database;
use serde::{Deserialize, Serialize};
use tauri::Manager;

// ============ 数据模型 ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CollectionItem {
    pub id: String,
    pub parent_id: Option<String>,
    pub item_type: String, // "folder" | "request"
    pub title: String,
    pub method: Option<String>,
    pub url: Option<String>,
    pub params: Option<String>,   // JSON string
    pub headers: Option<String>,  // JSON string
    pub body_type: Option<String>,
    pub body_content: Option<String>,
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvironmentRow {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvVariable {
    pub id: String,
    pub env_id: String,
    pub key: String,
    pub value: String,
    pub enabled: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub method: String,
    pub url: String,
    pub status: Option<i64>,
    pub time: Option<i64>,
    pub timestamp: i64,
}

// ============ Collection 命令 ============

#[tauri::command]
fn collection_list(state: tauri::State<Database>) -> Result<Vec<CollectionItem>, String> {
    state.collection_list()
}

#[tauri::command]
fn collection_add(
    state: tauri::State<Database>,
    parent_id: Option<String>,
    item_type: String,
    title: String,
    method: Option<String>,
    url: Option<String>,
) -> Result<CollectionItem, String> {
    state.collection_add(parent_id, item_type, title, method, url)
}

#[tauri::command]
fn collection_update(
    state: tauri::State<Database>,
    id: String,
    title: Option<String>,
    method: Option<String>,
    url: Option<String>,
    params: Option<String>,
    headers: Option<String>,
    body_type: Option<String>,
    body_content: Option<String>,
) -> Result<(), String> {
    state.collection_update(id, title, method, url, params, headers, body_type, body_content)
}

#[tauri::command]
fn collection_move(
    state: tauri::State<Database>,
    id: String,
    parent_id: Option<String>,
    sort_order: i64,
) -> Result<(), String> {
    state.collection_move(id, parent_id, sort_order)
}

#[tauri::command]
fn collection_delete(state: tauri::State<Database>, id: String) -> Result<(), String> {
    state.collection_delete(id)
}

// ============ Environment 命令 ============

#[tauri::command]
fn env_list(state: tauri::State<Database>) -> Result<Vec<EnvironmentRow>, String> {
    state.env_list()
}

#[tauri::command]
fn env_add(state: tauri::State<Database>, name: String) -> Result<EnvironmentRow, String> {
    state.env_add(name)
}

#[tauri::command]
fn env_update(state: tauri::State<Database>, id: String, name: String) -> Result<(), String> {
    state.env_update(id, name)
}

#[tauri::command]
fn env_delete(state: tauri::State<Database>, id: String) -> Result<(), String> {
    state.env_delete(id)
}

#[tauri::command]
fn env_get_variables(
    state: tauri::State<Database>,
    env_id: String,
) -> Result<Vec<EnvVariable>, String> {
    state.env_get_variables(env_id)
}

#[tauri::command]
fn env_save_variables(
    state: tauri::State<Database>,
    env_id: String,
    variables: Vec<EnvVariable>,
) -> Result<(), String> {
    state.env_save_variables(env_id, variables)
}

// ============ History 命令 ============

#[tauri::command]
fn history_list(state: tauri::State<Database>, limit: Option<i64>) -> Result<Vec<HistoryItem>, String> {
    state.history_list(limit)
}

#[tauri::command]
fn history_add(
    state: tauri::State<Database>,
    method: String,
    url: String,
    status: Option<i64>,
    time: Option<i64>,
) -> Result<(), String> {
    state.history_add(method, url, status, time)
}

#[tauri::command]
fn history_clear(state: tauri::State<Database>) -> Result<(), String> {
    state.history_clear()
}

#[tauri::command]
fn history_delete(state: tauri::State<Database>, id: String) -> Result<(), String> {
    state.history_delete(id)
}

// ============ 启动 ============

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle();
            let db = Database::new(handle)?;
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            collection_list,
            collection_add,
            collection_update,
            collection_move,
            collection_delete,
            env_list,
            env_add,
            env_update,
            env_delete,
            env_get_variables,
            env_save_variables,
            history_list,
            history_add,
            history_clear,
            history_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
