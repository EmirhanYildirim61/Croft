import { useState, useEffect, useCallback } from 'react';
import Sidebar, { type Screen } from './components/Sidebar';
import TopBar from './components/TopBar';
import AccountsScreen from './screens/AccountsScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import BudgetScreen from './screens/BudgetScreen';
import ReportsScreen from './screens/ReportsScreen';
import ImportScreen from './screens/ImportScreen';
import SettingsScreen from './screens/SettingsScreen';
import { api } from './lib/tauri';
import { currentYearMonth } from './lib/format';
import type { AccountWithBalance, Category } from './types';

export default function App() {
  const [screen, setScreen] = useState<Screen>('accounts');
  const [month, setMonth] = useState(currentYearMonth());
  const [netWorthCents, setNetWorthCents] = useState(0);
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);

  // Shared data needed by multiple screens
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadShared = useCallback(async () => {
    try {
      const [accs, cats] = await Promise.all([api.listAccounts(), api.listCategories()]);
      setAccounts(accs);
      setCategories(cats);
      setNetWorthCents(accs.reduce((s, a) => s + a.current_balance, 0));
    } catch {
      // non-fatal on startup
    }
  }, []);

  useEffect(() => {
    // Fire-and-forget: generate any overdue recurring transactions on launch
    api.generateDueRecurringTransactions().catch(() => {});
    loadShared();
  }, [loadShared]);

  const handleSelectAccount = (id: number) => {
    setFilterAccountId(id);
    setScreen('transactions');
  };

  const handleNavigate = (s: Screen) => {
    setScreen(s);
    // Refresh shared data whenever user navigates (accounts/categories may have changed)
    loadShared();
  };

  const handleNetWorthChange = (cents: number) => setNetWorthCents(cents);

  // Keyboard shortcut: N = new transaction
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'n' &&
        !e.ctrlKey && !e.metaKey &&
        (e.target as HTMLElement).tagName !== 'INPUT' &&
        (e.target as HTMLElement).tagName !== 'TEXTAREA' &&
        (e.target as HTMLElement).tagName !== 'SELECT'
      ) {
        setScreen('transactions');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" style={{ minWidth: 900 }}>
      <Sidebar active={screen} onNavigate={handleNavigate} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar month={month} onMonthChange={setMonth} netWorthCents={netWorthCents} />
        <main className="flex-1 overflow-y-auto p-6">
          {screen === 'accounts' && (
            <AccountsScreen
              onSelectAccount={handleSelectAccount}
              onNetWorthChange={handleNetWorthChange}
            />
          )}
          {screen === 'transactions' && (
            <TransactionsScreen
              month={month}
              filterAccountId={filterAccountId}
              onClearAccount={() => setFilterAccountId(null)}
            />
          )}
          {screen === 'budget' && <BudgetScreen month={month} />}
          {screen === 'reports' && <ReportsScreen month={month} />}
          {screen === 'import' && (
            <ImportScreen accounts={accounts} categories={categories} />
          )}
          {screen === 'settings' && <SettingsScreen accounts={accounts} />}
        </main>
      </div>
    </div>
  );
}
