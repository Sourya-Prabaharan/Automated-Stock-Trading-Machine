#include "Portfolio.h"

Portfolio::Portfolio(double initialCapital, double commissionRate)
    : cash_(initialCapital), commissionRate_(commissionRate), 
      currentSymbol_(""), positionQuantity_(0), averagePrice_(0.0) {
}

Quantity Portfolio::getPositionQuantity(const std::string& symbol) const {
    if (symbol == currentSymbol_) {
        return positionQuantity_;
    }
    return 0;
}

Price Portfolio::getPositionAveragePrice(const std::string& symbol) const {
    if (symbol == currentSymbol_) {
        return averagePrice_;
    }
    return 0.0;
}

double Portfolio::getTotalValue(const std::string& symbol, Price currentPrice) const {
    double positionValue = 0.0;
    if (symbol == currentSymbol_ && positionQuantity_ > 0) {
        positionValue = positionQuantity_ * currentPrice;
    }
    return cash_ + positionValue;
}

double Portfolio::executeTrade(const std::string& symbol, OrderSide side, Quantity quantity, Price price) {
    if (quantity <= 0 || price <= 0.0) {
        return 0.0;
    }

    if (currentSymbol_.empty()) {
        currentSymbol_ = symbol;
    } else if (currentSymbol_ != symbol) {
        // Simplified: only track one symbol for this backtester
        return 0.0;
    }

    double tradeValue = quantity * price;
    double commission = tradeValue * commissionRate_;
    double realized_pnl = 0.0;

    if (side == OrderSide::BUY) {
        double totalCost = tradeValue + commission;
        if (totalCost > cash_) {
            // Insufficient funds
            return 0.0;
        }
        
        // Average price only includes the trade value, not commission
        double currentTotalValue = positionQuantity_ * averagePrice_;
        positionQuantity_ += quantity;
        averagePrice_ = (currentTotalValue + tradeValue) / positionQuantity_;
        
        cash_ -= totalCost;
    } else if (side == OrderSide::SELL) {
        if (quantity > positionQuantity_) {
            // Can't sell more than we own
            quantity = positionQuantity_;
            tradeValue = quantity * price;
            commission = tradeValue * commissionRate_;
        }
        
        realized_pnl = (price - averagePrice_) * quantity - commission;
        
        positionQuantity_ -= quantity;
        cash_ += (tradeValue - commission);
        
        if (positionQuantity_ == 0) {
            averagePrice_ = 0.0;
        }
    }

    return realized_pnl;
}

