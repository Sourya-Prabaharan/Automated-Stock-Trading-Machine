#include "Backtester.h"
#include "Portfolio.h"

Backtester::Backtester(const BacktestConfig& config)
    : config_(config) {
}

BacktestResult Backtester::run(const std::vector<PriceBar>& data, Strategy& strategy) {
    BacktestResult result;
    result.initial_capital = config_.initial_capital;
    
    Portfolio portfolio(config_.initial_capital, config_.commission_rate);
    strategy.reset();
    
    result.equity_curve.reserve(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        const auto& bar = data[i];
        
        // 1. Evaluate strategy
        Signal signal = strategy.evaluate(static_cast<int>(i), data);
        
        // 2. Execute trades based on signal
        if (signal == Signal::BUY && portfolio.getPositionQuantity(config_.symbol) == 0) {
            // Determine quantity we can afford (simplified to fixed size or max affordable)
            double cost_per_share = bar.close * (1.0 + config_.commission_rate);
            int max_shares = static_cast<int>(portfolio.getCash() / cost_per_share);
            int qty = std::min(config_.position_size, max_shares);
            
            if (qty > 0) {
                portfolio.executeTrade(config_.symbol, OrderSide::BUY, qty, bar.close);
                
                TradeRecord trade;
                trade.date = bar.date;
                trade.symbol = config_.symbol;
                trade.side = OrderSide::BUY;
                trade.quantity = qty;
                trade.price = bar.close;
                trade.commission = qty * bar.close * config_.commission_rate;
                trade.realized_pnl = 0.0;
                result.trades.push_back(trade);
            }
        } else if (signal == Signal::SELL && portfolio.getPositionQuantity(config_.symbol) > 0) {
            int qty = portfolio.getPositionQuantity(config_.symbol);
            double realized_pnl = portfolio.executeTrade(config_.symbol, OrderSide::SELL, qty, bar.close);
            
            TradeRecord trade;
            trade.date = bar.date;
            trade.symbol = config_.symbol;
            trade.side = OrderSide::SELL;
            trade.quantity = qty;
            trade.price = bar.close;
            trade.commission = qty * bar.close * config_.commission_rate;
            trade.realized_pnl = realized_pnl;
            result.trades.push_back(trade);
        }
        
        // 3. Track equity
        double current_value = portfolio.getTotalValue(config_.symbol, bar.close);
        result.equity_curve.push_back(current_value);
    }
    
    // Close any open positions at the end of the backtest
    if (portfolio.getPositionQuantity(config_.symbol) > 0) {
        int qty = portfolio.getPositionQuantity(config_.symbol);
        double final_price = data.back().close;
        double realized_pnl = portfolio.executeTrade(config_.symbol, OrderSide::SELL, qty, final_price);
        
        TradeRecord trade;
        trade.date = data.back().date;
        trade.symbol = config_.symbol;
        trade.side = OrderSide::SELL;
        trade.quantity = qty;
        trade.price = final_price;
        trade.commission = qty * final_price * config_.commission_rate;
        trade.realized_pnl = realized_pnl;
        result.trades.push_back(trade);
        
        // Update the last equity point
        result.equity_curve.back() = portfolio.getCash();
    }
    
    result.final_value = result.equity_curve.back();
    
    double benchmark_return_pct = 0.0;
    if (!data.empty()) {
        double first_price = data.front().close;
        double last_price = data.back().close;
        if (first_price > 0.0) {
            benchmark_return_pct = ((last_price - first_price) / first_price) * 100.0;
        }
    }
    
    result.metrics = RiskMetrics::calculate(result.initial_capital, result.equity_curve, result.trades, benchmark_return_pct);
    
    return result;
}
