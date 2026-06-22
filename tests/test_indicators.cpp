#include <iostream>
#include <cassert>
#include <cmath>
#include "Strategy.h"

bool almost_equal(double a, double b, double epsilon = 0.001) {
    return std::abs(a - b) < epsilon;
}

void test_sma() {
    std::vector<PriceBar> data;
    for (int i = 1; i <= 5; ++i) {
        PriceBar bar;
        bar.close = i * 10.0;
        data.push_back(bar);
    }
    
    // SMA of [10, 20, 30] is 20
    assert(almost_equal(Indicators::sma(data, 2, 3), 20.0));
    
    // SMA of [30, 40, 50] is 40
    assert(almost_equal(Indicators::sma(data, 4, 3), 40.0));
    
    // Not enough data
    assert(almost_equal(Indicators::sma(data, 1, 3), 0.0));
    
    std::cout << "test_sma passed\n";
}

void test_rsi() {
    std::vector<PriceBar> data;
    
    // Flat prices -> RSI 50
    for (int i = 0; i < 20; ++i) {
        PriceBar bar;
        bar.close = 100.0;
        data.push_back(bar);
    }
    assert(almost_equal(Indicators::rsi(data, 19, 14), 50.0));
    
    // Steadily increasing -> RSI near 100
    for (int i = 0; i < 20; ++i) {
        data[i].close = 100.0 + i;
    }
    assert(almost_equal(Indicators::rsi(data, 19, 14), 100.0));
    
    // Steadily decreasing -> RSI near 0
    for (int i = 0; i < 20; ++i) {
        data[i].close = 100.0 - i;
    }
    assert(almost_equal(Indicators::rsi(data, 19, 14), 0.0));
    
    std::cout << "test_rsi passed\n";
}

int main() {
    test_sma();
    test_rsi();
    std::cout << "All indicators tests passed!\n";
    return 0;
}
