import { useTranslation } from 'react-i18next';
import { formatCents, formatMonth, prevMonth, nextMonth } from '../lib/format';

interface Props {
  month: string;
  onMonthChange: (m: string) => void;
  netWorthCents: number;
  currency?: string;
}

export default function TopBar({ month, onMonthChange, netWorthCents, currency = 'USD' }: Props) {
  const { t } = useTranslation();
  const isPositive = netWorthCents >= 0;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onMonthChange(prevMonth(month))}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
          aria-label={t('topBar.prevMonth')}
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-700 w-36 text-center">
          {formatMonth(month)}
        </span>
        <button
          onClick={() => onMonthChange(nextMonth(month))}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
          aria-label={t('topBar.nextMonth')}
        >
          ›
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">{t('topBar.netWorth')}</span>
        <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCents(netWorthCents, currency)}
        </span>
      </div>
    </header>
  );
}
