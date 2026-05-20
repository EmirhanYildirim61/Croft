#![allow(dead_code)]

/// Sum a slice of cent values.
pub fn sum_cents(values: &[i64]) -> i64 {
    values.iter().sum()
}

/// Budget diff: how many cents remain (positive = under budget, negative = over).
pub fn budget_remaining(budgeted_cents: i64, spent_cents: i64) -> i64 {
    budgeted_cents - spent_cents
}

/// Net worth across all accounts: sum of each account's initial_balance plus
/// all transactions (positive = income/deposit, negative = expense).
pub fn net_worth(initial_balances: &[i64], transaction_amounts: &[i64]) -> i64 {
    sum_cents(initial_balances) + sum_cents(transaction_amounts)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── sum_cents ─────────────────────────────────────────────────────────────

    #[test]
    fn sum_empty_is_zero() {
        assert_eq!(sum_cents(&[]), 0);
    }

    #[test]
    fn sum_positives() {
        assert_eq!(sum_cents(&[100, 200, 300]), 600);
    }

    #[test]
    fn sum_mixed() {
        assert_eq!(sum_cents(&[1000, -250, -750]), 0);
    }

    #[test]
    fn sum_all_negative() {
        assert_eq!(sum_cents(&[-100, -200]), -300);
    }

    // ── budget_remaining ─────────────────────────────────────────────────────

    #[test]
    fn budget_remaining_under() {
        assert_eq!(budget_remaining(10000, 6000), 4000);
    }

    #[test]
    fn budget_remaining_exactly_zero() {
        assert_eq!(budget_remaining(5000, 5000), 0);
    }

    #[test]
    fn budget_remaining_over() {
        assert_eq!(budget_remaining(5000, 7500), -2500);
    }

    #[test]
    fn budget_remaining_no_budget() {
        assert_eq!(budget_remaining(0, 3000), -3000);
    }

    // ── net_worth ─────────────────────────────────────────────────────────────

    #[test]
    fn net_worth_simple() {
        // One account with $1 000 initial, one income $500, two expenses -$200, -$300
        assert_eq!(net_worth(&[100_000], &[50_000, -20_000, -30_000]), 100_000);
    }

    #[test]
    fn net_worth_negative_balance() {
        // Credit card: initial 0, one charge of -$50
        assert_eq!(net_worth(&[0], &[-5_000]), -5_000);
    }

    #[test]
    fn net_worth_multiple_accounts() {
        // Checking $1 000, Savings $5 000, Credit -$200
        assert_eq!(
            net_worth(&[100_000, 500_000, 0], &[-20_000]),
            580_000
        );
    }

    #[test]
    fn net_worth_no_transactions() {
        assert_eq!(net_worth(&[250_000], &[]), 250_000);
    }
}
