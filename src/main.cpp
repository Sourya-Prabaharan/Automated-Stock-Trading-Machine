#include "MarketDataLoader.h"
#include "Strategy.h"
#include "Backtester.h"
#include <iostream>
#include <iomanip>
#include <memory>
#include <string>
#include <fstream>

void print_metrics(const std::string& strategy_name, const BacktestResult& result) {
    std::cout << "\n==================================================\n";
    std::cout << "BACKTEST RESULTS: " << strategy_name << "\n";
    std::cout << "==================================================\n";
    
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Initial Capital:  $" << result.initial_capital << "\n";
    std::cout << "Final Value:      $" << result.final_value << "\n";
    std::cout << "Total Return:     " << result.metrics.total_return_pct << "%\n";
    std::cout << "B&H Benchmark:    " << result.metrics.buy_and_hold_return_pct << "%\n";
    std::cout << "Annualized Ret:   " << result.metrics.annualized_return_pct << "%\n";
    std::cout << "Max Drawdown:     " << result.metrics.max_drawdown_pct << "% (" << result.metrics.max_drawdown_duration_bars << " bars)\n";
    std::cout << "Sharpe Ratio:     " << result.metrics.sharpe_ratio << "\n";
    
    std::cout << "\nTrade Statistics:\n";
    std::cout << "Total Trades:     " << result.metrics.total_trades << "\n";
    std::cout << "Winning Trades:   " << result.metrics.winning_trades << "\n";
    std::cout << "Losing Trades:    " << result.metrics.losing_trades << "\n";
    std::cout << "Win Rate:         " << result.metrics.win_rate << "%\n";
    std::cout << "Average Win:      $" << result.metrics.average_win << "\n";
    std::cout << "Average Loss:     $" << result.metrics.average_loss << "\n";
    
    if (result.metrics.profit_factor == 999.0) {
        std::cout << "Profit Factor:    Infinite (No Losses)\n";
    } else {
        std::cout << "Profit Factor:    " << result.metrics.profit_factor << "\n";
    }
    std::cout << "==================================================\n\n";
}

void export_results(const std::vector<PriceBar>& data, const BacktestResult& result) {
    std::string data_dir = "../data";
    
    // Export Equity Curve
    std::ofstream eq_file(data_dir + "/equity_curve.csv");
    if (eq_file.is_open()) {
        eq_file << "Date,Equity\n";
        for (size_t i = 0; i < data.size() && i < result.equity_curve.size(); ++i) {
            eq_file << data[i].date << "," << std::fixed << std::setprecision(2) << result.equity_curve[i] << "\n";
        }
        eq_file.close();
        std::cout << "Exported equity curve to " << data_dir << "/equity_curve.csv\n";
    }
    
    // Export Trade History
    std::ofstream tr_file(data_dir + "/trade_history.csv");
    if (tr_file.is_open()) {
        tr_file << "Date,Symbol,Side,Quantity,Price,Commission,RealizedPnL\n";
        for (const auto& trade : result.trades) {
            tr_file << trade.date << "," 
                    << trade.symbol << "," 
                    << (trade.side == OrderSide::BUY ? "BUY" : "SELL") << "," 
                    << trade.quantity << "," 
                    << std::fixed << std::setprecision(2) << trade.price << "," 
                    << trade.commission << "," 
                    << trade.realized_pnl << "\n";
        }
        tr_file.close();
        std::cout << "Exported trade history to " << data_dir << "/trade_history.csv\n";
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <csv_data_file> [--strategy sma|rsi]\n";
        return 1;
    }

    std::string csv_file = argv[1];
    std::string strategy_arg = "sma";
    
    for (int i = 2; i < argc; ++i) {
        if (std::string(argv[i]) == "--strategy" && i + 1 < argc) {
            strategy_arg = argv[i + 1];
            i++;
        }
    }

    // 1. Load Data
    std::cout << "Loading market data from " << csv_file << "...\n";
    auto data = MarketDataLoader::loadCSV(csv_file);
    
    if (data.empty()) {
        std::cerr << "Error: No data loaded. Please check the CSV file format.\n";
        return 1;
    }
    std::cout << "Loaded " << data.size() << " price bars.\n";

    // 2. Select Strategy
    std::unique_ptr<Strategy> strategy;
    if (strategy_arg == "sma") {
        strategy = std::make_unique<SMACrossover>(10, 30);
    } else if (strategy_arg == "rsi") {
        strategy = std::make_unique<RSIMeanReversion>(14, 30, 70);
    } else {
        std::cerr << "Unknown strategy: " << strategy_arg << ". Use 'sma' or 'rsi'.\n";
        return 1;
    }

    // 3. Configure Backtester
    BacktestConfig config;
    config.initial_capital = 100000.0;
    config.commission_rate = 0.001; // 0.1% per trade
    config.position_size = 100;     // Trade 100 shares at a time
    config.symbol = "AAPL";
    
    Backtester backtester(config);

    // 4. Run Backtest
    std::cout << "Running backtest with " << strategy->name() << "...\n";
    auto result = backtester.run(data, *strategy);

    // 5. Output Results
    print_metrics(strategy->name(), result);
    export_results(data, result);

    return 0;
}
