#include <iostream>
#include <cassert>
#include <cmath>
#include "Portfolio.h"

bool almost_equal(double a, double b, double epsilon = 0.001) {
    return std::abs(a - b) < epsilon;
}

void test_buy_sell() {
    Portfolio p(100000.0, 0.001); // 0.1% commission
    
    // Buy 100 shares at 100 -> cost 10000 + 10 commission
    double pnl1 = p.executeTrade("AAPL", OrderSide::BUY, 100, 100.0);
    
    assert(almost_equal(pnl1, 0.0)); // No realized pnl on buy
    assert(almost_equal(p.getCash(), 89990.0));
    assert(p.getPositionQuantity("AAPL") == 100);
    assert(almost_equal(p.getPositionAveragePrice("AAPL"), 100.0)); // does not include commission in my implementation
    
    // Value at price 100
    assert(almost_equal(p.getTotalValue("AAPL", 100.0), 99990.0)); // lost 10 to commission
    
    // Sell 50 shares at 110 -> revenue 5500 - 5.5 commission = 5494.5
    double pnl2 = p.executeTrade("AAPL", OrderSide::SELL, 50, 110.0);
    
    assert(almost_equal(pnl2, 50 * (110.0 - 100.0) - 5.5)); 
    assert(almost_equal(p.getCash(), 89990.0 + 5494.5));
    assert(p.getPositionQuantity("AAPL") == 50);
    
    std::cout << "test_buy_sell passed\n";
}

void test_insufficient_funds() {
    Portfolio p(1000.0, 0.0);
    
    // Try to buy 100 shares at 15 -> cost 1500 (more than we have)
    double pnl = p.executeTrade("AAPL", OrderSide::BUY, 100, 15.0);
    
    assert(almost_equal(pnl, 0.0));
    assert(almost_equal(p.getCash(), 1000.0)); // cash unchanged
    assert(p.getPositionQuantity("AAPL") == 0);
    
    std::cout << "test_insufficient_funds passed\n";
}

int main() {
    test_buy_sell();
    test_insufficient_funds();
    std::cout << "All portfolio tests passed!\n";
    return 0;
}
