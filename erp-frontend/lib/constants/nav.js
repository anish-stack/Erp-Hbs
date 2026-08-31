/*
  Sidebar navigation. Grouped by business function so the rail reads like an
  operations console, not an alphabetical feature dump. Each item declares the
  permission that gates it — the sidebar hides what the user can't reach.
  `icon` is a lucide-react icon name resolved in the Sidebar component.
*/
export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        title: "Leads",
        href: "/leads",
        icon: "Target",
        permission: "lead.view",
      },
      {
        title: "Customers",
        href: "/customers",
        icon: "Users",
        permission: "customer.view",
      },
      {
        title: "Quotations",
        href: "/sales/quotations",
        icon: "FileText",
        permission: "sales.view",
      },
      {
        title: "Sales orders",
        href: "/sales/orders",
        icon: "ShoppingCart",
        permission: "sales.view",
      },
    ],
  },
  {
    label: "Procurement",
    items: [
      {
        title: "Purchase orders",
        href: "/purchase",
        icon: "ClipboardList",
        permission: "purchase.view",
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: "Factory",
        permission: "supplier.view",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Inventory",
        href: "/inventory/stock",
        icon: "Boxes",
        permission: "inventory.view",
      },
      {
        title: "Warehouse",
        href: "/warehouse",
        icon: "Warehouse",
        permission: "warehouse.view",
      },
      {
        title: "Quality",
        href: "/quality",
        icon: "ShieldCheck",
        permission: "quality.view",
      },
      {
        title: "Shipments",
        href: "/shipment",
        icon: "Truck",
        permission: "shipment.view",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Invoices",
        href: "/finance/invoices",
        icon: "ReceiptText",
        permission: "finance.view",
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Parts", href: "/parts", icon: "Cpu", permission: "part.view" },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Users",
        href: "/users",
        icon: "UserCog",
        permission: "user.view",
      },
      {
        title: "Roles & permissions",
        href: "/settings/roles",
        icon: "KeyRound",
        permission: "role.view",
      },
      {
        title: "Master data",
        href: "/settings/master-data",
        icon: "Settings2",
        permission: "part.view",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: "BarChart3",
        permission: "report.view",
      },
      {
        title: "Audit log",
        href: "/audit",
        icon: "History",
        permission: "audit.view",
      },
    ],
  },
];
