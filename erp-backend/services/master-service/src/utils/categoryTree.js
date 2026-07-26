'use strict';

/** Flat category rows -> nested tree, sorted by sortOrder then name. */
function buildTree(rows) {
  const byId = new Map();

  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      code: row.code,
      name: row.name,
      path: row.path,
      level: row.level,
      sortOrder: row.sortOrder,
      iconKey: row.iconKey,
      isActive: row.isActive,
      partCount: row._count ? row._count.parts : undefined,
      children: []
    });
  }

  const roots = [];
  for (const row of rows) {
    const node = byId.get(row.id);
    if (row.parentId && byId.has(row.parentId)) byId.get(row.parentId).children.push(node);
    else roots.push(node);
  }

  const sort = (nodes) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    nodes.forEach((node) => sort(node.children));
    return nodes;
  };

  return sort(roots);
}

/** All descendant paths of a node, used for "include subcategories" filters. */
function descendantFilter(path) {
  return { OR: [{ path }, { path: { startsWith: `${path}/` } }] };
}

function buildPath(parentPath, code) {
  return parentPath ? `${parentPath}/${code}` : code;
}

module.exports = { buildTree, descendantFilter, buildPath };
