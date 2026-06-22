#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <iomanip>
#include <sstream>

// Basic types
using Price = double;
using Quantity = int;
using Timestamp = std::chrono::system_clock::time_point;
using Symbol = std::string;

// Trading order sides
enum class OrderSide {
    BUY,
    SELL
};

// Signal generation
enum class Signal {
    BUY,
    SELL,
    HOLD
};

// Represents a single bar of price data
struct PriceBar {
    std::string date;
    Price open;
    Price high;
    Price low;
    Price close;
    long volume;
};

// Represents an executed trade
struct TradeRecord {
    std::string date;
    std::string symbol;
    OrderSide side;
    Quantity quantity;
    Price price;
    double commission;
    double realized_pnl; // Set when closing a position
};

// Utility functions
namespace Utils {
    std::string timestampToString(const Timestamp& timestamp);
    Timestamp stringToTimestamp(const std::string& timestampStr);
}

