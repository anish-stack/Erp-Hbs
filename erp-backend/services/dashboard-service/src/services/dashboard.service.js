'use strict';
const { cache } = require('@erp/shared');
const widgets = require('../widgets');
const { ROLE_WIDGETS, CACHE } = require('../constants');
const config = require('../config');

/** Resolves which widget keys a role sees; falls back to a broad default set. */
function widgetKeysForRole(role) {
  return ROLE_WIDGETS[role] || ROLE_WIDGETS.admin;
}

class DashboardService {
  /**
   * Builds the full dashboard payload for a user: resolves their widget set
   * (role default, or an explicit override list), fetches each widget's data
   * in parallel with a short Redis cache, and returns them in order. A single
   * widget failing never breaks the others (widgets self-report {available:false}).
   */
  static async summary(user, overrideKeys) {
    const keys = overrideKeys && overrideKeys.length ? overrideKeys : widgetKeysForRole(user.role);

    const results = await Promise.all(
      keys.map(async (key) => {
        const widget = widgets.get(key);
        if (!widget) return { key, title: key, available: false, error: 'Unknown widget' };
        const data = await cache.remember(CACHE.widget(key), config.widgetCacheTtl, () => widget.fetch(user));
        return { key: widget.key, title: widget.title, ...data };
      })
    );

    return { role: user.role, widgets: results, generatedAt: new Date().toISOString() };
  }

  static async widget(key, user) {
    const widget = widgets.get(key);
    if (!widget) return null;
    const data = await cache.remember(CACHE.widget(key), config.widgetCacheTtl, () => widget.fetch(user));
    return { key: widget.key, title: widget.title, ...data };
  }

  static listAvailable() {
    return widgets.all().map((w) => ({ key: w.key, title: w.title }));
  }

  static rolesMap() { return ROLE_WIDGETS; }
}
module.exports = DashboardService;
