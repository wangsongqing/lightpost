use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::{CollectionItem, EnvVariable, EnvironmentRow, HistoryItem};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(handle: &AppHandle) -> Result<Self, String> {
        // 数据库放在项目根目录下 (PostWeb/lightpost/)
        // 通过可执行文件位置推导：target/debug/lightpost -> 上溯3层到项目根
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get exe path: {}", e))?;

        // 开发模式: src-tauri/target/debug/lightpost
        // 向上4层: debug -> target -> src-tauri -> lightpost(项目根)
        let project_dir = exe_path
            .parent() // debug
            .and_then(|p| p.parent()) // target
            .and_then(|p| p.parent()) // src-tauri
            .and_then(|p| p.parent()) // lightpost/
            .unwrap_or_else(|| std::path::Path::new("."));

        let db_path = project_dir.join("lightpost.db");

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database at {:?}: {}", db_path, e))?;
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])
            .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

        // Initialize schema
        init_schema(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn now() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64
    }

    fn generate_id() -> String {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let count = COUNTER.fetch_add(1, Ordering::SeqCst);
        let time = Self::now();
        format!("{}_{}", time, count)
    }

    fn db(&self) -> std::sync::MutexGuard<Connection> {
        self.conn.lock().unwrap()
    }
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS collection_items (
            id TEXT PRIMARY KEY,
            parent_id TEXT,
            item_type TEXT NOT NULL CHECK(item_type IN ('folder', 'request')),
            title TEXT NOT NULL,
            method TEXT,
            url TEXT,
            params TEXT,
            headers TEXT,
            body_type TEXT,
            body_content TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (parent_id) REFERENCES collection_items(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS environments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS env_variables (
            id TEXT PRIMARY KEY,
            env_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '',
            enabled INTEGER DEFAULT 1,
            FOREIGN KEY (env_id) REFERENCES environments(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS history_items (
            id TEXT PRIMARY KEY,
            method TEXT NOT NULL,
            url TEXT NOT NULL,
            status INTEGER,
            time INTEGER,
            timestamp INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_collection_parent ON collection_items(parent_id);
        CREATE INDEX IF NOT EXISTS idx_env_variables_env ON env_variables(env_id);
        CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_items(timestamp DESC);
        "#,
    )
    .map_err(|e| format!("Failed to initialize schema: {}", e))?;

    Ok(())
}

// ============ Collection ============

impl Database {
    pub fn collection_list(&self) -> Result<Vec<CollectionItem>, String> {
        let db = self.db();
        let mut stmt = db
            .prepare(
                "SELECT id, parent_id, item_type, title, method, url, params, headers, body_type, body_content, sort_order, created_at, updated_at
                 FROM collection_items ORDER BY sort_order, created_at",
            )
            .map_err(|e| e.to_string())?;

        let items = stmt
            .query_map([], |row| {
                Ok(CollectionItem {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    item_type: row.get(2)?,
                    title: row.get(3)?,
                    method: row.get(4)?,
                    url: row.get(5)?,
                    params: row.get(6)?,
                    headers: row.get(7)?,
                    body_type: row.get(8)?,
                    body_content: row.get(9)?,
                    sort_order: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(items)
    }

    pub fn collection_add(
        &self,
        parent_id: Option<String>,
        item_type: String,
        title: String,
        method: Option<String>,
        url: Option<String>,
    ) -> Result<CollectionItem, String> {
        let db = self.db();
        let id = Self::generate_id();
        let now = Self::now();

        let sort_order: i64 = if let Some(ref pid) = parent_id {
            db.query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM collection_items WHERE parent_id = ?",
                [pid],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?
        } else {
            db.query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM collection_items WHERE parent_id IS NULL",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?
        };

        db.execute(
            "INSERT INTO collection_items (id, parent_id, item_type, title, method, url, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            (
                &id,
                &parent_id,
                &item_type,
                &title,
                &method,
                &url,
                &sort_order,
                &now,
                &now,
            ),
        )
        .map_err(|e| e.to_string())?;

        Ok(CollectionItem {
            id,
            parent_id,
            item_type,
            title,
            method,
            url,
            params: None,
            headers: None,
            body_type: None,
            body_content: None,
            sort_order,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn collection_update(
        &self,
        id: String,
        title: Option<String>,
        method: Option<String>,
        url: Option<String>,
        params: Option<String>,
        headers: Option<String>,
        body_type: Option<String>,
        body_content: Option<String>,
    ) -> Result<(), String> {
        let db = self.db();
        let now = Self::now();

        let mut sets: Vec<String> = vec![];
        let mut vals: Vec<String> = vec![];

        if let Some(t) = &title {
            sets.push("title = ?".to_string());
            vals.push(t.clone());
        }
        if let Some(m) = &method {
            sets.push("method = ?".to_string());
            vals.push(m.clone());
        }
        if let Some(u) = &url {
            sets.push("url = ?".to_string());
            vals.push(u.clone());
        }
        if let Some(p) = &params {
            sets.push("params = ?".to_string());
            vals.push(p.clone());
        }
        if let Some(h) = &headers {
            sets.push("headers = ?".to_string());
            vals.push(h.clone());
        }
        if let Some(bt) = &body_type {
            sets.push("body_type = ?".to_string());
            vals.push(bt.clone());
        }
        if let Some(bc) = &body_content {
            sets.push("body_content = ?".to_string());
            vals.push(bc.clone());
        }

        if sets.is_empty() {
            return Ok(());
        }

        // Always update updated_at
        sets.push("updated_at = ?".to_string());
        vals.push(now.to_string());

        // id for WHERE clause
        vals.push(id);

        let query = format!(
            "UPDATE collection_items SET {} WHERE id = ?",
            sets.join(", ")
        );

        let mut param_refs: Vec<&dyn rusqlite::ToSql> = vec![];
        for v in &vals {
            param_refs.push(v);
        }

        db.execute(&query, &*param_refs)
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn collection_move(
        &self,
        id: String,
        parent_id: Option<String>,
        sort_order: i64,
    ) -> Result<(), String> {
        let db = self.db();
        db.execute(
            "UPDATE collection_items SET parent_id = ?1, sort_order = ?2 WHERE id = ?3",
            (&parent_id, &sort_order, &id),
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn collection_delete(&self, id: String) -> Result<(), String> {
        let db = self.db();
        db.execute("DELETE FROM collection_items WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

// ============ EnvironmentRow ============

impl Database {
    pub fn env_list(&self) -> Result<Vec<EnvironmentRow>, String> {
        let db = self.db();
        let mut stmt = db
            .prepare("SELECT id, name, sort_order, created_at FROM environments ORDER BY sort_order")
            .map_err(|e| e.to_string())?;

        let envs = stmt
            .query_map([], |row| {
                Ok(EnvironmentRow {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    sort_order: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(envs)
    }

    pub fn env_add(&self, name: String) -> Result<EnvironmentRow, String> {
        let db = self.db();
        let id = Self::generate_id();
        let now = Self::now();

        let sort_order: i64 = db
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM environments",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        db.execute(
            "INSERT INTO environments (id, name, sort_order, created_at) VALUES (?1, ?2, ?3, ?4)",
            (&id, &name, &sort_order, &now),
        )
        .map_err(|e| e.to_string())?;

        Ok(EnvironmentRow {
            id,
            name,
            sort_order,
            created_at: now,
        })
    }

    pub fn env_update(&self, id: String, name: String) -> Result<(), String> {
        let db = self.db();
        db.execute("UPDATE environments SET name = ?1 WHERE id = ?2", (&name, &id))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn env_delete(&self, id: String) -> Result<(), String> {
        let db = self.db();
        db.execute("DELETE FROM environments WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn env_get_variables(&self, env_id: String) -> Result<Vec<EnvVariable>, String> {
        let db = self.db();
        let mut stmt = db
            .prepare("SELECT id, env_id, key, value, enabled FROM env_variables WHERE env_id = ?1")
            .map_err(|e| e.to_string())?;

        let vars = stmt
            .query_map([&env_id], |row| {
                Ok(EnvVariable {
                    id: row.get(0)?,
                    env_id: row.get(1)?,
                    key: row.get(2)?,
                    value: row.get(3)?,
                    enabled: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(vars)
    }

    pub fn env_save_variables(
        &self,
        env_id: String,
        variables: Vec<EnvVariable>,
    ) -> Result<(), String> {
        let db = self.db();

        db.execute("DELETE FROM env_variables WHERE env_id = ?1", [&env_id])
            .map_err(|e| e.to_string())?;

        for var in &variables {
            let id = if var.id.is_empty() || var.id.starts_with("temp_") {
                Self::generate_id()
            } else {
                var.id.clone()
            };
            db.execute(
                "INSERT INTO env_variables (id, env_id, key, value, enabled) VALUES (?1, ?2, ?3, ?4, ?5)",
                (&id, &env_id, &var.key, &var.value, &var.enabled),
            )
            .map_err(|e| e.to_string())?;
        }

        Ok(())
    }
}

// ============ History ============

impl Database {
    pub fn history_list(&self, limit: Option<i64>) -> Result<Vec<HistoryItem>, String> {
        let db = self.db();
        let limit = limit.unwrap_or(100);

        let mut stmt = db
            .prepare(
                "SELECT id, method, url, status, time, timestamp FROM history_items
                 ORDER BY timestamp DESC LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;

        let items = stmt
            .query_map([limit], |row| {
                Ok(HistoryItem {
                    id: row.get(0)?,
                    method: row.get(1)?,
                    url: row.get(2)?,
                    status: row.get(3)?,
                    time: row.get(4)?,
                    timestamp: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(items)
    }

    pub fn history_add(
        &self,
        method: String,
        url: String,
        status: Option<i64>,
        time: Option<i64>,
    ) -> Result<(), String> {
        let db = self.db();
        let id = Self::generate_id();
        let now = Self::now();

        db.execute(
            "INSERT INTO history_items (id, method, url, status, time, timestamp) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (&id, &method, &url, &status, &time, &now),
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn history_clear(&self) -> Result<(), String> {
        let db = self.db();
        db.execute("DELETE FROM history_items", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn history_delete(&self, id: String) -> Result<(), String> {
        let db = self.db();
        db.execute("DELETE FROM history_items WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
