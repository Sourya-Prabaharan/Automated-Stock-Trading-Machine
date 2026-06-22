#include <iostream>
#include <cassert>
#include "Backtester.h"

void test_backtest_run() {
    BacktestConfig config;
    config.initial_capital = 100000.0;
    config.commission_rate = 0.0;
    config.position_size = 10;
    
    Backtester backtester(config);
    SMACrossover strategy(2, 3);
    
    std::vector<PriceBar> data;
    // Create a price sequence that will trigger a buy, then a sell
    // Prices: 10, 10, 10, 20, 20, 10, 10
    // SMA2:   -, 10, 10, 15, 20, 15, 10
    // SMA3:   -,  -, 10, 13.3, 16.6, 16.6, 13.3
    
    double prices[] = {10, 10, 10, 20, 20, 10, 10};
    for (int i = 0; i < 7; ++i) {
        PriceBar bar;
        bar.date = "Day" + std::to_string(i);
        bar.close = prices[i];
        data.push_back(bar);
    }
    
    auto result = backtester.run(data, strategy);
    
    // We should have traded
    assert(result.trades.size() > 0);
    assert(result.equity_curve.size() == 7);
    assert(result.metrics.buy_and_hold_return_pct == 0.0); // 10 -> 10
    
    std::cout << "test_backtest_run passed\n";
}

int main() {
    test_backtest_run();
    std::cout << "All backtest tests passed!\n";
    return 0;
}
