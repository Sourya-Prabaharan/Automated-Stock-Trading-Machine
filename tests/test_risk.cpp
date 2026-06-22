#include <iostream>
#include <cassert>
#include <cmath>
#include "RiskMetrics.h"

bool almost_equal(double a, double b, double epsilon = 0.001) {
    return std::abs(a - b) < epsilon;
}

void test_metrics() {
    std::vector<double> equity = {100.0, 110.0, 90.0, 120.0};
    std::vector<TradeRecord> trades;
    
    TradeRecord t1; t1.side = OrderSide::SELL; t1.realized_pnl = 10.0;
    TradeRecord t2; t2.side = OrderSide::SELL; t2.realized_pnl = -5.0;
    trades.push_back(t1);
    trades.push_back(t2);
    
    auto metrics = RiskMetrics::calculate(100.0, equity, trades, 20.0);
    
    // Returns
    assert(almost_equal(metrics.total_return_pct, 20.0));
    assert(almost_equal(metrics.buy_and_hold_return_pct, 20.0));
    
    // Max DD: Peak 110 -> Trough 90 = 20 / 110 = 18.18%
    assert(almost_equal(metrics.max_drawdown_pct, 18.1818));
    assert(metrics.max_drawdown_duration_bars == 1);
    
    // Trades
    assert(metrics.total_trades == 2);
    assert(metrics.winning_trades == 1);
    assert(metrics.losing_trades == 1);
    assert(almost_equal(metrics.win_rate, 50.0));
    assert(almost_equal(metrics.profit_factor, 2.0)); // 10 / 5
    assert(almost_equal(metrics.average_win, 10.0));
    assert(almost_equal(metrics.average_loss, 5.0));
    
    std::cout << "test_metrics passed\n";
}

int main() {
    test_metrics();
    std::cout << "All risk tests passed!\n";
    return 0;
}
