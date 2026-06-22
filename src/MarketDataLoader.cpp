#include "MarketDataLoader.h"
#include <fstream>
#include <sstream>
#include <iostream>
#include <algorithm>

std::vector<PriceBar> MarketDataLoader::loadCSV(const std::string& filepath) {
    std::vector<PriceBar> bars;
    std::ifstream file(filepath);
    
    if (!file.is_open()) {
        std::cerr << "Failed to open file: " << filepath << std::endl;
        return bars;
    }

    std::string line;
    // Skip header
    std::getline(file, line);

    while (std::getline(file, line)) {
        if (line.empty()) continue;

        std::stringstream ss(line);
        std::string token;
        PriceBar bar;

        try {
            // Date
            if (!std::getline(ss, bar.date, ',')) continue;
            
            // Open
            if (!std::getline(ss, token, ',')) continue;
            bar.open = std::stod(token);
            
            // High
            if (!std::getline(ss, token, ',')) continue;
            bar.high = std::stod(token);
            
            // Low
            if (!std::getline(ss, token, ',')) continue;
            bar.low = std::stod(token);
            
            // Close
            if (!std::getline(ss, token, ',')) continue;
            bar.close = std::stod(token);
            
            // Volume
            if (!std::getline(ss, token, ',')) continue;
            bar.volume = std::stol(token);

            bars.push_back(bar);
        } catch (const std::exception& e) {
            std::cerr << "Error parsing line: " << line << " (" << e.what() << ")" << std::endl;
        }
    }

    // Ensure data is sorted chronologically
    std::sort(bars.begin(), bars.end(), [](const PriceBar& a, const PriceBar& b) {
        return a.date < b.date;
    });

    return bars;
}
