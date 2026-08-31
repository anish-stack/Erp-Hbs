"use client";

import { api, unwrap, unwrapList } from "./client";

/*
  All backend calls live here, grouped by module. UI components never call
  axios directly — they import a named service and get back clean data
  (unwrapped from the { success, data, meta } envelope). Adding a new
  endpoint is a one-liner; the pattern is identical across modules.
*/

const list = (path) => (params) => api.get(path, { params }).then(unwrapList);
const getOne = (path) => (id) => api.get(`${path}/${id}`).then(unwrap);
const create = (path) => (body) => api.post(path, body).then(unwrap);
const update = (path) => (id, body) =>
  api.put(`${path}/${id}`, body).then(unwrap);
const remove = (path) => (id) => api.delete(`${path}/${id}`).then(unwrap);
const action = (path) => (id, verb, body) =>
  api.post(`${path}/${id}/${verb}`, body || {}).then(unwrap);

/* ------------------------------- Auth ------------------------------- */
export const authApi = {
  login: (body) =>
    api.post("/auth/login", body).then((r) => r.data?.data || r.data),
  sendOtp: (body) => api.post("/auth/send-otp", body).then(unwrap),
  verifyOtp: (body) =>
    api.post("/auth/verify-otp", body).then((r) => r.data?.data || r.data),
  me: () => api.get("/auth/me").then(unwrap),
  permissions: () => api.get("/auth/permissions").then(unwrap),
  sessions: () => api.get("/auth/sessions").then(unwrap),
  logout: () => api.post("/auth/logout").then(unwrap),
  changePassword: (body) =>
    api.post("/auth/change-password", body).then(unwrap),
};

/* ----------------------------- Dashboard ---------------------------- */
export const dashboardApi = {
  summary: (params) => api.get("/dashboard/summary", { params }).then(unwrap),
  widgets: () => api.get("/dashboard/widgets").then(unwrap),
  layout: () => api.get("/dashboard/layout").then(unwrap),
  saveLayout: (widgetKeys) =>
    api.put("/dashboard/layout", { widgetKeys }).then(unwrap),
};

/* ------------------------------- Users ------------------------------ */
export const usersApi = {
  list: list("/users"),
  get: getOne("/users"),
  create: create("/users"),
  update: update("/users"),
  remove: remove("/users"),
  setStatus: (id, status) =>
    api.patch(`/users/${id}/status`, { status }).then(unwrap),
  stats: () => api.get("/users/stats").then(unwrap),
  departments: (params) => api.get("/departments", { params }).then(unwrapList),
};

/* ------------------------------- Roles ------------------------------ */
export const rolesApi = {
  list: list("/roles"),
  get: getOne("/roles"),
  create: create("/roles"),
  update: update("/roles"),
  remove: remove("/roles"),
  clone: (id, body) => api.post(`/roles/${id}/clone`, body).then(unwrap),
  permissions: (id) => api.get(`/roles/${id}/permissions`).then(unwrap),
  setPermissions: (id, permissionCodes) =>
    api.put(`/roles/${id}/permissions`, { permissionCodes }).then(unwrap),
  addPermissions: (id, permissions) =>
    api.post(`/roles/${id}/permissions`, { permissions }).then(unwrap),
  removePermissions: (id, permissions) =>
    api
      .delete(`/roles/${id}/permissions`, { data: { permissions } })
      .then(unwrap),
  menusMe: () => api.get("/menus/me").then(unwrap),
  permissionModules: () => api.get("/permissions/modules").then(unwrap),
};
export const permissionsApi = {
  list: (params) => api.get("/permissions", { params }).then(unwrapList),
  matrix: () => api.get("/permissions/matrix").then(unwrap),
  modules: () => api.get("/permissions/modules").then(unwrap),
};

/* ------------------------------ Master ------------------------------ */
export const partsApi = {
  list: list("/master/parts"),
  get: getOne("/master/parts"),
  create: create("/master/parts"),
  update: update("/master/parts"),
  remove: remove("/master/parts"),
  search: (q) =>
    api
      .get("/master/parts/search", { params: { search: q, limit: 10 } })
      .then(unwrapList),
  stats: () => api.get("/master/parts/stats").then(unwrap),
};
export const masterApi = {
  manufacturers: (params) =>
    api.get("/master/manufacturers", { params }).then(unwrapList),
  createManufacturer: create("/master/manufacturers"),
  updateManufacturer: update("/master/manufacturers"),
  removeManufacturer: remove("/master/manufacturers"),

  categories: (params) =>
    api.get("/master/categories", { params }).then(unwrapList),
  categoryTree: () => api.get("/master/categories/tree").then(unwrap),
  createCategory: create("/master/categories"),
  updateCategory: update("/master/categories"),
  removeCategory: remove("/master/categories"),

  uoms: (params) => api.get("/master/uoms", { params }).then(unwrapList),
  createUom: create("/master/uoms"),
  updateUom: update("/master/uoms"),

  taxRates: (params) =>
    api.get("/master/tax-rates", { params }).then(unwrapList),
  createTaxRate: create("/master/tax-rates"),
  updateTaxRate: update("/master/tax-rates"),

  currencies: (params) =>
    api.get("/master/currencies", { params }).then(unwrapList),
  createCurrency: create("/master/currencies"),

  settings: (params) => api.get("/settings", { params }).then(unwrapList),
  updateSettingsBulk: (settingsArr) =>
    api.put("/settings/bulk", { settings: settingsArr }).then(unwrap),
};

/* ----------------------------- Suppliers ---------------------------- */
export const suppliersApi = {
  list: list("/suppliers"),
  get: getOne("/suppliers"),
  create: create("/suppliers"),
  update: update("/suppliers"),
  remove: remove("/suppliers"),
  action: action("/suppliers"),
  stats: () => api.get("/suppliers/stats").then(unwrap),
  options: () => api.get("/suppliers/options").then(unwrap),
};

/* -------------------------------- CRM ------------------------------- */
export const customersApi = {
  list: list("/customers"),
  get: getOne("/customers"),
  create: create("/customers"),
  update: (id, body) => api.put(`/customers/${id}`, body).then(unwrap),
  remove: remove("/customers"),
  stats: () => api.get("/customers/stats").then(unwrap),
  options: () => api.get("/customers/options").then(unwrap),
  importExcel: (file, mode = "create") => {
    const form = new FormData();

    form.append("file", file);
    form.append("mode", mode);

    return api
      .post("/customers/import", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then(unwrap);
  },
  exportExcel: (params) =>
    api
      .get("/customers/export", { params, responseType: "blob" })
      .then((res) => res.data),
  exportExcelTemplate: (params) =>
    api
      .get("/customers/export/template", { params, responseType: "blob" })
      .then((res) => res.data),
};

export const leadsApi = {
  list: list("/leads"),
  get: getOne("/leads"),
  create: create("/leads"),
  update: update("/leads"),
  remove: remove("/leads"),
  pipeline: () => api.get("/leads/pipeline").then(unwrap),
  mine: (params) => api.get("/leads/mine", { params }).then(unwrapList),
  setStage: (id, stage) =>
    api.patch(`/leads/${id}/stage`, { stage }).then(unwrap),
  followUp: (id, body) => api.post(`/leads/${id}/followup`, body).then(unwrap),
  convert: (id, body) =>
    api.post(`/leads/${id}/convert`, body || {}).then(unwrap),
  activities: (id, params) =>
    api.get(`/leads/${id}/activities`, { params }).then(unwrapList),
  importExcel: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post("/leads/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap);
  },
  exportExcel: (params) =>
    api
      .get("/leads/export", { params, responseType: "blob" })
      .then((res) => res.data),
};
export const activitiesApi = {
  create: create("/activities"),
  complete: (id, body) =>
    api.post(`/activities/${id}/complete`, body || {}).then(unwrap),
};

/* ------------------------------ Purchase ---------------------------- */
export const purchaseApi = {
  list: list("/purchase"),
  get: getOne("/purchase"),
  create: create("/purchase"),
  update: update("/purchase"),
  remove: remove("/purchase"),
  submit: (id) => api.post(`/purchase/${id}/submit`).then(unwrap),
  approve: (id) => api.post(`/purchase/${id}/approve`).then(unwrap),
  reject: (id, reason) =>
    api.post(`/purchase/${id}/reject`, { reason }).then(unwrap),
  issue: (id) => api.post(`/purchase/${id}/issue`).then(unwrap),
  cancel: (id, reason) =>
    api.post(`/purchase/${id}/cancel`, { reason }).then(unwrap),
  close: (id) => api.post(`/purchase/${id}/close`).then(unwrap),
  action: action("/purchase"),
  stats: () => api.get("/purchase/stats").then(unwrap),
  grns: (poId) => api.get(`/purchase/${poId}/grns`).then(unwrapList),
  createGrn: (poId, body) =>
    api.post(`/purchase/${poId}/grns`, body).then(unwrap),
};

/* ----------------------------- Inventory ---------------------------- */
export const inventoryApi = {
  stock: (params) => api.get("/inventory/stock", { params }).then(unwrapList),
  stats: () => api.get("/inventory/stats").then(unwrap),
  lowStock: (params) =>
    api.get("/inventory/low-stock", { params }).then(unwrapList),
  movements: (params) =>
    api.get("/inventory/movements", { params }).then(unwrapList),
  reservations: (params) =>
    api.get("/inventory/reservations", { params }).then(unwrapList),
};

/* ----------------------------- Warehouse ---------------------------- */
export const warehouseApi = {
  list: list("/warehouse"),
  get: getOne("/warehouse"),
  create: create("/warehouse"),
  update: update("/warehouse"),
  remove: remove("/warehouse"),
  activate: (id) => api.post(`/warehouse/${id}/activate`).then(unwrap),
  deactivate: (id) => api.post(`/warehouse/${id}/deactivate`).then(unwrap),
  setDefault: (id) => api.post(`/warehouse/${id}/set-default`).then(unwrap),
  stats: () => api.get("/warehouse/stats").then(unwrap),
  options: () => api.get("/warehouse/options").then(unwrap),

  zones: (id) => api.get(`/warehouse/${id}/zones`).then(unwrapList),
  createZone: (id, body) =>
    api.post(`/warehouse/${id}/zones`, body).then(unwrap),

  bins: (id, params) =>
    api.get(`/warehouse/${id}/bins`, { params }).then(unwrapList),
  createBin: (id, body) => api.post(`/warehouse/${id}/bins`, body).then(unwrap),
  blockBin: (binId, reason) =>
    api.post(`/warehouse/bins/${binId}/block`, { reason }).then(unwrap),
  unblockBin: (binId) =>
    api.post(`/warehouse/bins/${binId}/unblock`).then(unwrap),

  tasks: (params) => api.get("/warehouse/tasks", { params }).then(unwrapList),
  createTask: create("/warehouse/tasks"),
  assignTask: (taskId, userId) =>
    api.post(`/warehouse/tasks/${taskId}/assign`, { userId }).then(unwrap),
  startTask: (taskId) =>
    api.post(`/warehouse/tasks/${taskId}/start`).then(unwrap),
  completeTask: (taskId, body) =>
    api.post(`/warehouse/tasks/${taskId}/complete`, body || {}).then(unwrap),
  cancelTask: (taskId, reason) =>
    api.post(`/warehouse/tasks/${taskId}/cancel`, { reason }).then(unwrap),
};

/* ------------------------------ Quality ----------------------------- */
export const qualityApi = {
  inspections: (params) =>
    api.get("/quality/inspections", { params }).then(unwrapList),
  inspection: getOne("/quality/inspections"),
  createInspection: create("/quality/inspections"),
  startInspection: (id) =>
    api.post(`/quality/inspections/${id}/start`).then(unwrap),
  submitResults: (id, results) =>
    api.post(`/quality/inspections/${id}/results`, { results }).then(unwrap),
  completeInspection: (id, body) =>
    api.post(`/quality/inspections/${id}/complete`, body || {}).then(unwrap),
  holdInspection: (id, reason) =>
    api.post(`/quality/inspections/${id}/hold`, { reason }).then(unwrap),
  cancelInspection: (id, reason) =>
    api.post(`/quality/inspections/${id}/cancel`, { reason }).then(unwrap),

  plans: (params) => api.get("/quality/plans", { params }).then(unwrapList),
  plan: getOne("/quality/plans"),
  createPlan: create("/quality/plans"),
  updatePlan: update("/quality/plans"),
  removePlan: remove("/quality/plans"),

  stats: () => api.get("/quality/stats").then(unwrap),
};

/* ------------------------------- Sales ------------------------------ */
export const salesApi = {
  orders: (params) => api.get("/sales/orders", { params }).then(unwrapList),
  order: getOne("/sales/orders"),
  createOrder: create("/sales/orders"),
  updateOrder: update("/sales/orders"),
  orderAction: action("/sales/orders"),
  quotations: (params) =>
    api.get("/sales/quotations", { params }).then(unwrapList),
  quotation: getOne("/sales/quotations"),
  createQuotation: create("/sales/quotations"),
  updateQuotation: update("/sales/quotations"),

  quotationAction: action("/sales/quotations"),
  quotationPdf: (id, download = false) =>
    api
      .get(`/sales/quotations/${id}/pdf`, {
        params: download ? { download: "true" } : undefined,
        responseType: "blob",
      })
      .then((res) => res.data),
  PublicQuotationPdf: (id, download = false) =>
    api
      .get(`/sales/public/${id}/pdf`, {
        params: download ? { download: "true" } : undefined,
        responseType: "blob",
      })
      .then((res) => res.data),

  PublicQuotationAccept: (id, download = false) =>
    api
      .get(`/sales/public/${id}/accept`, {
        params: download ? { download: "true" } : undefined,
        responseType: "blob",
      })
      .then((res) => res.data),
  PublicQuotationView: (id) =>
    api
      .get(`/sales/public/${id}/view`)
      .then((res) => res.data),
  PublicQuotationReject: (id, download = false) =>
    api
      .get(`/sales/public/${id}/reject`, {
        params: download ? { download: "true" } : undefined,
        responseType: "blob",
      })
      .then((res) => res.data),

  stats: () => api.get("/sales/stats").then(unwrap),
};

/* ------------------------------ Finance ----------------------------- */
export const financeApi = {
  invoices: (params) =>
    api.get("/finance/invoices", { params }).then(unwrapList),
  invoice: getOne("/finance/invoices"),
  createInvoice: create("/finance/invoices"),
  invoiceAction: action("/finance/invoices"),
  invoiceFromSalesOrder: (orderId) =>
    api.post("/finance/invoices/from-sales-order", { orderId }).then(unwrap),
  payments: (params) =>
    api.get("/finance/payments", { params }).then(unwrapList),
  recordPayment: create("/finance/payments"),
  stats: () => api.get("/finance/stats").then(unwrap),
};

/* ------------------------------ Shipment ---------------------------- */
export const shipmentApi = {
  list: (params) => api.get("/shipment", { params }).then(unwrapList),
  get: getOne("/shipment"),
  create: create("/shipment"),
  fromOrder: (orderId) =>
    api.post("/shipment/from-order", { orderId }).then(unwrap),
  createPickTasks: (id) => api.post(`/shipment/${id}/pick-tasks`).then(unwrap),
  pick: (id, body) => api.post(`/shipment/${id}/pick`, body).then(unwrap),
  pack: (id, body) => api.post(`/shipment/${id}/pack`, body).then(unwrap),
  dispatch: (id, body) =>
    api.post(`/shipment/${id}/dispatch`, body).then(unwrap),
  deliver: (id) => api.post(`/shipment/${id}/deliver`).then(unwrap),
  cancel: (id, reason) =>
    api.post(`/shipment/${id}/cancel`, { reason }).then(unwrap),
  action: action("/shipment"),
  stats: () => api.get("/shipment/stats").then(unwrap),
};

/* ---------------------------- Notifications ------------------------- */
export const notificationsApi = {
  list: (params) => api.get("/notifications", { params }).then(unwrapList),
  unreadCount: () => api.get("/notifications/unread-count").then(unwrap),
  markRead: (id) => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.post("/notifications/mark-all-read").then(unwrap),
  preferences: () => api.get("/notifications/preferences").then(unwrap),
};

/* ------------------------------ Reports ----------------------------- */
export const reportsApi = {
  definitions: () => api.get("/reports/definitions").then(unwrap),
  runs: (params) => api.get("/reports/runs", { params }).then(unwrapList),
  run: getOne("/reports/runs"),
  request: (body) => api.post("/reports/runs", body).then(unwrap),
};

/* ------------------------------- Files ------------------------------ */
export const filesApi = {
  upload: (file, extra = {}) => {
    const form = new FormData();
    form.append("file", file);
    Object.entries(extra).forEach(([k, v]) => form.append(k, v));
    return api
      .post("/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap);
  },
  downloadUrl: (id) =>
    `${process.env.NEXT_PUBLIC_API_BASE || ""}/api/v1/files/${id}/download`,
};

/* ------------------------------- Audit ------------------------------ */
export const auditApi = {
  list: (params) => api.get("/audit", { params }).then(unwrapList),
  stats: () => api.get("/audit/stats").then(unwrap),
};
