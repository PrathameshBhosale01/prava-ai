import { ArrowLeftRight, Siren, Wallet } from "lucide-react";

import CurrencyConverter from "@/components/tools/currency/CurrencyConverter";
import EmergencyContacts from "@/components/tools/emergency/EmergencyContacts";
import ExpenseTracker from "@/components/tools/expenses/ExpenseTracker";

// One entry per tab. Add a tool here and it shows up in the Tools page.
// `getProps` can read deep-link params, e.g. /tools?tab=emergency&country=Japan
export const TOOLS = [
  {
    id: "expenses",
    label: "Expense Tracker",
    shortLabel: "Expenses",
    icon: Wallet,
    Component: ExpenseTracker,
  },
  {
    id: "currency",
    label: "Currency Converter",
    shortLabel: "Converter",
    icon: ArrowLeftRight,
    Component: CurrencyConverter,
  },
  {
    id: "emergency",
    label: "Emergency Contacts",
    shortLabel: "Emergency",
    icon: Siren,
    Component: EmergencyContacts,
    getProps: (params) => ({ initialQuery: params.get("country") ?? "" }),
  },
];

export const DEFAULT_TOOL = TOOLS[0].id;
