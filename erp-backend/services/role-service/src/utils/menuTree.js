'use strict';

const { middlewares } = require('@erp/shared');

const { hasPermission } = middlewares;

/**
 * Flat menu rows -> nested tree, filtered by the caller's permissions.
 * A parent survives only if it has a path of its own or at least one visible child.
 */
function buildTree(rows, permissions = [], overrides = new Map()) {
  const allowed = rows.filter((row) => {
    if (!row.isActive) return false;
    if (!row.permissionCode) return true;
    return hasPermission(permissions, row.permissionCode);
  });

  const byId = new Map();
  for (const row of allowed) {
    const override = overrides.get(row.id);
    byId.set(row.id, {
      id: row.id,
      code: row.code,
      label: row.label,
      icon: row.icon,
      path: row.path,
      type: row.type,
      module: row.module,
      badgeKey: row.badgeKey,
      permissionCode: row.permissionCode,
      sortOrder: override && override.sortOrder !== null && override.sortOrder !== undefined
        ? override.sortOrder
        : row.sortOrder,
      meta: row.meta || null,
      children: []
    });
  }

  const roots = [];
  for (const row of allowed) {
    const node = byId.get(row.id);
    if (row.parentId && byId.has(row.parentId)) byId.get(row.parentId).children.push(node);
    else if (!row.parentId) roots.push(node);
  }

  const prune = (nodes) =>
    nodes
      .map((node) => ({ ...node, children: prune(node.children) }))
      .filter((node) => node.path || node.children.length)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  return prune(roots);
}

/** Flattens a tree into the route paths a role may open (for frontend guards). */
function collectPaths(tree) {
  const paths = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.path) paths.push(node.path);
      if (node.children.length) walk(node.children);
    }
  };
  walk(tree);
  return paths;
}

module.exports = { buildTree, collectPaths };
