#pragma once

#include "Common.h"

class Portfolio {
public:
    Portfolio(double initialCapital = 100000.0, double commissionRate = 0.001);
    
    // Getters
    double getCash() const { return cash_; }
    double getCommissionRate() const { return commissionRate_; }
    Quantity getPositionQuantity(const std::string& symbol) const;
    Price getPositionAveragePrice(const std::string& symbol) const;
    
    // Returns total value = cash + (position quantity * current price)
    double getTotalValue(const std::string& symbol, Price currentPrice) const;
    
    // Trade execution
    // Returns the realized PnL of the trade. If it's a buy, returns 0.0
    double executeTrade(const std::string& symbol, OrderSide side, Quantity quantity, Price price);

private:
    double cash_;
    double commissionRate_;
    
    // For simplicity, we assume one symbol per backtest
    std::string currentSymbol_;
    Quantity positionQuantity_;
    Price averagePrice_;
};

