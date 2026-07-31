import { useState, useEffect, useRef, useCallback } from 'react';
import { useCollectionStore, useStore } from '../stores/useStore';
import type { CollectionItem } from '../utils/db';
import type { RequestData } from '../types';
import { importPostmanCollection, type PostmanCollection } from '../utils/postmanImport';
import { exportToPostman, downloadJson } from '../utils/postmanExport';

// ============ 上下文菜单 ============

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: CollectionItem | null;
}

function ContextMenu({
  state,
  onClose,
  onAddFolder,
  onAddRequest,
  onImportTo,
  onRename,
  onDelete,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onAddFolder: (parentId: string | null) => void;
  onAddRequest: (parentId: string | null) => void;
  onImportTo: (parentId: string | null) => void;
  onRename: (item: CollectionItem) => void;
  onDelete: (item: CollectionItem) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<CollectionItem | null>(null);

  // 点击外部关闭（删除确认弹窗显示时不绑定，避免弹窗被立即销毁）
  useEffect(() => {
    if (!state.visible || confirmDelete) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // 延迟绑定，避免打开菜单的这次右键 mousedown 直接触发关闭
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [state.visible, onClose, confirmDelete]);

  // 确认删除弹窗显示时，组件仍需渲染（但隐藏菜单）
  if (!state.visible && !confirmDelete) return null;

  const isFolder = state.target?.item_type === 'folder';
  const parentId = state.target?.id || null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(state.x, window.innerWidth - 180),
    top: Math.min(state.y, window.innerHeight - 220),
    zIndex: 9999,
  };

  // 处理删除点击
  const handleDeleteClick = (item: CollectionItem) => {
    setConfirmDelete(item);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (confirmDelete) {
      console.log('Deleting item:', confirmDelete.id, confirmDelete.title);
      await onDelete(confirmDelete);
      console.log('Delete completed');
      setConfirmDelete(null);
      onClose();
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  return (
    <>
      {/* 主菜单（确认删除时隐藏，但组件保持渲染以显示弹窗） */}
      {!confirmDelete && (
      <div className="context-menu" ref={menuRef} style={style}>
        {/* 文件夹可添加子项 */}
        {isFolder && (
          <>
            <div
              className="context-menu-item"
              onClick={() => {
                onAddFolder(parentId);
                onClose();
              }}
            >
              <span className="menu-icon">📁</span>
              <span>新建子文件夹</span>
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onAddRequest(parentId);
                onClose();
              }}
            >
              <span className="menu-icon">➕</span>
              <span>新建子请求</span>
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onImportTo(parentId);
                onClose();
              }}
            >
              <span className="menu-icon">📥</span>
              <span>导入到此文件夹</span>
            </div>
            <div className="context-menu-divider" />
          </>
        )}

        {/* 根区域 */}
        {!state.target && (
          <>
            <div
              className="context-menu-item"
              onClick={() => {
                onAddFolder(null);
                onClose();
              }}
            >
              <span className="menu-icon">📁</span>
              <span>新建文件夹</span>
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onAddRequest(null);
                onClose();
              }}
            >
              <span className="menu-icon">➕</span>
              <span>新建请求</span>
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onImportTo(null);
                onClose();
              }}
            >
              <span className="menu-icon">📥</span>
              <span>导入到根目录</span>
            </div>
            <div className="context-menu-divider" />
          </>
        )}

        {/* 重命名和删除 */}
        {state.target && (
          <>
            <div
              className="context-menu-item"
              onClick={() => {
                const item = state.target!;
                onClose();
                // 延迟触发，等菜单关闭后再激活输入框，避免 mousedown 导致输入框失焦
                setTimeout(() => onRename(item), 50);
              }}
            >
              <span className="menu-icon">✏️</span>
              <span>重命名</span>
            </div>
            <div
              className="context-menu-item danger"
              onClick={() => handleDeleteClick(state.target!)}
            >
              <span className="menu-icon">🗑️</span>
              <span>删除</span>
            </div>
          </>
        )}
      </div>
      )}

      {/* 删除确认弹窗 */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认删除</h3>
            </div>
            <div className="modal-body">
              <p>
                确定要删除 <strong>"{confirmDelete.title}"</strong>
                {confirmDelete.item_type === 'folder' ? '及其所有子项' : ''}吗？
              </p>
              <p className="confirm-hint">此操作不可撤销</p>
            </div>
            <div className="form-actions">
              <button className="danger" onClick={handleConfirmDelete}>
                删除
              </button>
              <button onClick={handleCancelDelete}>取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============ 新建弹窗 ============

function NewItemModal({
  type,
  onClose,
  onConfirm,
}: {
  type: 'folder' | 'request';
  parentId: string | null;
  onClose: () => void;
  onConfirm: (title: string, method: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState('GET');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onConfirm(title.trim(), method);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal new-item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新建 {type === 'folder' ? '文件夹' : '请求'}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>名称</label>
            <input
              type="text"
              placeholder={type === 'folder' ? '文件夹名称' : '请求名称'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>
          {type === 'request' && (
            <div className="form-group">
              <label>方法</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(
                  (m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )
                )}
              </select>
            </div>
          )}
          <div className="form-actions">
            <button className="primary" onClick={handleSubmit}>
              创建
            </button>
            <button onClick={onClose}>取消</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 树节点 ============

function TreeNode({
  item,
  depth,
  onContextMenu,
}: {
  item: CollectionItem;
  depth: number;
  onContextMenu: (e: React.MouseEvent, item: CollectionItem) => void;
}) {
  const { items, activeItemId, expandedFolders, setActiveItem, toggleFolder, updateItem } =
    useCollectionStore();
  const { setRequest } = useStore();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);

  // 监听重命名事件
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === item.id) {
        setEditing(true);
        setEditTitle(item.title);
      }
    };
    document.addEventListener('tree-rename', handler);
    return () => document.removeEventListener('tree-rename', handler);
  }, [item.id, item.title]);

  const isFolder = item.item_type === 'folder';
  const isActive = activeItemId === item.id;
  const isExpanded = expandedFolders.has(item.id);
  const children = items.filter((i) => i.parent_id === item.id);

  const methodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'var(--method-get)',
      POST: 'var(--method-post)',
      PUT: 'var(--method-put)',
      DELETE: 'var(--method-delete)',
      PATCH: 'var(--method-patch)',
      HEAD: 'var(--method-head)',
      OPTIONS: 'var(--method-options)',
    };
    return colors[method] || 'var(--text-muted)';
  };

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(item.id);
    } else {
      setActiveItem(item.id);
      if (item.method && item.url) {
        const newRequest: RequestData = {
          method: item.method as RequestData['method'],
          url: item.url,
          params: item.params ? JSON.parse(item.params) : [],
          headers: item.headers ? JSON.parse(item.headers) : [],
          bodyType: (item.body_type as RequestData['bodyType']) || 'none',
          bodyContent: item.body_content || '',
        };
        setRequest(newRequest);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditTitle(item.title);
  };

  const submitRename = () => {
    const newTitle = editTitle.trim();
    if (newTitle && newTitle !== item.title) {
      updateItem(item.id, { title: newTitle });
    }
    setEditing(false);
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-node-content ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => onContextMenu(e, item)}
      >
        {isFolder ? (
          <span
            className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(item.id);
            }}
          >
            ▶
          </span>
        ) : (
          <span className="tree-arrow placeholder" />
        )}

        <span className="tree-icon">
          {isFolder ? (isExpanded ? '📂' : '📁') : '📄'}
        </span>

        {editing ? (
          <input
            className="tree-edit-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-title">
            {isFolder ? (
              <span className="folder-title">{item.title}</span>
            ) : (
              <span className="request-title">
                {item.method && (
                  <span
                    className="method-mini"
                    style={{ color: methodColor(item.method) }}
                  >
                    {item.method}
                  </span>
                )}
                <span className="request-name">{item.title}</span>
              </span>
            )}
          </span>
        )}
      </div>

      {isFolder && isExpanded && (
        <div className="tree-children">
          {children.length === 0 ? (
            <div
              className="tree-empty"
              style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
            >
              右键添加子项
            </div>
          ) : (
            children.map((child) => (
              <TreeNode
                key={child.id}
                item={child}
                depth={depth + 1}
                onContextMenu={onContextMenu}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============ 主组件 ============

export function CollectionTree() {
  const { items, loadCollection, addFolder, addRequest, deleteItem, updateItem, toggleFolder } =
    useCollectionStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  });
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<'folder' | 'request'>('request');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importTargetId, setImportTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导出集合
  const handleExport = () => {
    const collection = exportToPostman(items, 'ERP');
    downloadJson(collection, 'ERP.postman_collection.json');
    setImportMsg('导出成功！');
    setTimeout(() => setImportMsg(null), 3000);
  };

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  // 导入 Postman 集合
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 获取导入目标文件夹名称
  const importTargetName = importTargetId
    ? items.find((i) => i.id === importTargetId)?.title || '未知文件夹'
    : '根目录';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMsg(null);

    try {
      const text = await file.text();
      const collection = JSON.parse(text) as PostmanCollection;

      if (!collection.item || !Array.isArray(collection.item)) {
        throw new Error('无效的 Postman 集合文件');
      }

      const result = await importPostmanCollection(
        collection,
        addFolder,
        addRequest,
        updateItem,
        importTargetId,
      );

      // 重新加载目录树
      await loadCollection();

      // 如果导入到子文件夹，自动展开该文件夹
      if (importTargetId) {
        toggleFolder(importTargetId);
      }

      setImportMsg(`导入成功：${result.folderCount} 个文件夹，${result.requestCount} 个请求 → ${importTargetName}`);
      setTimeout(() => setImportMsg(null), 4000);
    } catch (err) {
      console.error('Import failed:', err);
      setImportMsg(`导入失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setImporting(false);
      // 重置 input，允许重复导入同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const rootItems = items.filter((i) => i.parent_id === null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: CollectionItem | null) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        target: item,
      });
    },
    []
  );

  const handleCreate = async (title: string, method: string) => {
    if (newType === 'folder') {
      await addFolder(newParentId, title);
    } else {
      await addRequest(newParentId, title, method, '');
    }
    setShowNew(false);
  };

  return (
    <div className="collection-tree">
      <div className="collection-header">
        <span className="collection-title">📚 目录</span>
        <div className="collection-actions">
          <button
            className="collection-action-btn"
            title="导出 Postman 集合"
            onClick={handleExport}
          >
            📤
          </button>
          <button
            className="collection-action-btn"
            title={`导入 Postman 集合到: ${importTargetName}`}
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing ? '⏳' : '📥'}
          </button>
          {importTargetId && (
            <button
              className="collection-action-btn import-target-badge"
              title="点击取消目标文件夹"
              onClick={() => setImportTargetId(null)}
            >
              📂{importTargetName}
            </button>
          )}
          <button
            className="collection-action-btn"
            title="新建文件夹"
            onClick={() => {
              setNewParentId(null);
              setNewType('folder');
              setShowNew(true);
            }}
          >
            📁
          </button>
          <button
            className="collection-action-btn"
            title="新建请求"
            onClick={() => {
              setNewParentId(null);
              setNewType('request');
              setShowNew(true);
            }}
          >
            ➕
          </button>
        </div>
      </div>

      {/* 导入结果提示 */}
      {importMsg && (
        <div className="import-msg">{importMsg}</div>
      )}

      {/* 隐藏的文件 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        className="collection-list"
        onContextMenu={(e) => handleContextMenu(e, null)}
      >
        {rootItems.length === 0 ? (
          <div className="collection-empty">
            <p>还没有保存的请求</p>
            <p className="hint">点击 + 创建，或右键空白区域</p>
          </div>
        ) : (
          rootItems.map((item) => (
            <TreeNode
              key={item.id}
              item={item}
              depth={0}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        onAddFolder={(parentId) => {
          setNewParentId(parentId);
          setNewType('folder');
          setShowNew(true);
        }}
        onAddRequest={(parentId) => {
          setNewParentId(parentId);
          setNewType('request');
          setShowNew(true);
        }}
        onImportTo={(parentId) => {
          setImportTargetId(parentId);
          setImportMsg(`已设置导入目标: ${parentId ? items.find((i) => i.id === parentId)?.title || '未知文件夹' : '根目录'}`);
          setTimeout(() => setImportMsg(null), 3000);
        }}
        onRename={(item) => {
          const event = new CustomEvent('tree-rename', { detail: item.id });
          document.dispatchEvent(event);
        }}
        onDelete={(item) => {
          deleteItem(item.id);
        }}
      />

      {showNew && (
        <NewItemModal
          type={newType}
          parentId={newParentId}
          onClose={() => setShowNew(false)}
          onConfirm={handleCreate}
        />
      )}
    </div>
  );
}
