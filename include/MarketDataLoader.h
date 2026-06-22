#pragma once

#include "Common.h"
#include <string>
#include <vector>

class MarketDataLoader {
public:
    // Loads price data from a CSV file.
    // Expected format: Date,Open,High,Low,Close,Volume
    // Skips the header row if present.
    static std::vector<PriceBar> loadCSV(const std::string& filepath);
};
