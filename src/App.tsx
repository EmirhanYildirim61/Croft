import { useState, useEffect, useCallback } from 'react';
import Sidebar, { type Screen } from './components/Sidebar';
import TopBar from './components/TopBar';
import AccountsScreen from './screens/AccountsScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import BudgetScreen from './screens/BudgetScreen';
import ReportsScreen from './screens/ReportsScreen';
import NetWorthScreen from './screens/NetWorthScreen';
import SubscriptionsScreen from './screens/SubscriptionsScreen';
import ImportScreen from './screens/ImportScreen';
import SettingsScreen from './screens/SettingsScreen';
import { ToastProvider } from './context/toast';
import { api } from './lib/tauri';
import { currentYearMonth } from './lib/format';
import type { AccountWithBalance, Category } from './types';

const BACKUP_DATE_KEY = 'last_backup_date';
const BACKUP_INTERVAL_DAYS = 30;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('accounts');
  const [month, setMonth] = useState(currentYearMonth());
  const [netWorthCents, setNetWorthCents] = useState(0);
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [showBackupBanner, setShowBackupBanner] = useState(false);
  // Increments each time the user presses N → triggers TransactionsScreen to open the add form
  const [openNewTxTrigger, setOpenNewTxTrigger] = useState(0);

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
    api.generateDueRecurringTransactions().catch(() => {});
    loadShared();
    // Show backup reminder if never backed up or last backup was 30+ days ago
    const lastBackup = localStorage.getItem(BACKUP_DATE_KEY);
    if (!lastBackup || daysSince(lastBackup) >= BACKUP_INTERVAL_DAYS) {
      setShowBackupBanner(true);
    }
  }, [loadShared]);

  const handleSelectAccount = (id: number) => {
    setFilterAccountId(id);
    setScreen('transactions');
  };

  const handleNavigate = (s: Screen) => {
    setScreen(s);
    loadShared();
  };

  const handleNetWorthChange = (cents: number) => setNetWorthCents(cents);

  const dismissBackupBanner = (goToSettings = false) => {
    setShowBackupBanner(false);
    if (goToSettings) handleNavigate('settings');
  };

  // N = new transaction: navigate to transactions and open the add form
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
        setOpenNewTxTrigger((n) => n + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50" style={{ minWidth: 900 }}>
        <Sidebar active={screen} onNavigate={handleNavigate} />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar month={month} onMonthChange={setMonth} netWorthCents={netWorthCents} />
          {showBackupBanner && (
            <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-sm text-amber-800 shrink-0">
              <span className="text-amber-500">⚠</span>
              <span className="flex-1">
                {localStorage.getItem(BACKUP_DATE_KEY)
                  ? `It's been ${daysSince(localStorage.getItem(BACKUP_DATE_KEY)!)} days since your last backup.`
                  : "You haven't backed up your data yet."}
                {' '}Back up your SQLite file or export your data regularly.
              </span>
              <button
                onClick={() => dismissBackupBanner(true)}
                className="text-xs font-medium underline underline-offset-2 hover:text-amber-900"
              >
                Export now
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString().slice(0, 10));
                  dismissBackupBanner();
                }}
                className="text-xs text-amber-600 hover:text-amber-800 ml-1"
                title="Dismiss for 30 days"
              >
                ✕
              </button>
            </div>
          )}
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
                openNewTxTrigger={openNewTxTrigger}
              />
            )}
            {screen === 'budget' && <BudgetScreen month={month} />}
            {screen === 'reports' && <ReportsScreen month={month} />}
            {screen === 'net-worth' && <NetWorthScreen />}
            {screen === 'subscriptions' && <SubscriptionsScreen accounts={accounts} />}
            {screen === 'import' && (
              <ImportScreen accounts={accounts} categories={categories} />
            )}
            {screen === 'settings' && <SettingsScreen accounts={accounts} />}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
