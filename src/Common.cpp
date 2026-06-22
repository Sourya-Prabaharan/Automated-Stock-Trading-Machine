#include "Common.h"
#include <sstream>
#include <iomanip>
#include <random>
#include <chrono>
#include <ctime>
#include <cmath>

namespace Utils {
    std::string timestampToString(const Timestamp& timestamp) {
        auto time_t = std::chrono::system_clock::to_time_t(timestamp);
        std::tm* tm = std::localtime(&time_t);
        
        std::ostringstream oss;
        oss << std::put_time(tm, "%Y-%m-%d %H:%M:%S");
        
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            timestamp.time_since_epoch()) % 1000;
        
        oss << '.' << std::setfill('0') << std::setw(3) << ms.count();
        return oss.str();
    }
    
    Timestamp stringToTimestamp(const std::string& timestampStr) {
        std::tm tm = {};
        std::istringstream ss(timestampStr);
        ss >> std::get_time(&tm, "%Y-%m-%d %H:%M:%S");
        
        if (ss.fail()) {
            return std::chrono::system_clock::now();
        }
        
        auto time_t = std::mktime(&tm);
        return std::chrono::system_clock::from_time_t(time_t);
    }
    
    std::string generateOrderId() {
        static std::random_device rd;
        static std::mt19937 gen(rd());
        static std::uniform_int_distribution<> dis(100000, 999999);
        
        auto now = std::chrono::system_clock::now();
        auto time_t = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()) % 1000;
        
        std::stringstream ss;
        ss << "ORD" << time_t << ms.count() << dis(gen);
        return ss.str();
    }
    
    double calculatePercentage(double value, double total) {
        if (total == 0.0) return 0.0;
        return (value / total) * 100.0;
    }
    
    bool isValidPrice(Price price) {
        return price > 0.0 && std::isfinite(price);
    }
    
    bool isValidQuantity(Quantity quantity) {
        return quantity > 0;
    }
}

