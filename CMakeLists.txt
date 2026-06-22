cmake_minimum_required(VERSION 3.16)
project(AutomatedStockTradingSystem VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(Threads REQUIRED)

# Include directories
include_directories(include)
include_directories(src)

# Source files
set(SOURCES
    src/main.cpp
    src/Stock.cpp
    src/Portfolio.cpp
    src/TradingEngine.cpp
    src/RiskManager.cpp
    src/MarketData.cpp
    src/TradingAlgorithms.cpp
    src/PortfolioAnalyzer.cpp
    src/UserInterface.cpp
    src/Configuration.cpp
)

set(CMAKE_CXX_EXTENSIONS OFF)

# Add compiler warnings
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Library containing all core logic (shared between engine and tests)
add_library(trading_lib STATIC
    src/Common.cpp
    src/MarketDataLoader.cpp
    src/Strategy.cpp
    src/Portfolio.cpp
    src/RiskMetrics.cpp
    src/Backtester.cpp
)
target_include_directories(trading_lib PUBLIC include)

# Main executable
add_executable(trading_engine src/main.cpp)
target_link_libraries(trading_engine PRIVATE trading_lib)

# Testing
enable_testing()

function(add_trading_test test_name source_file)
    add_executable(${test_name} ${source_file})
    target_link_libraries(${test_name} PRIVATE trading_lib)
    add_test(NAME ${test_name} COMMAND ${test_name})
endfunction()

add_trading_test(test_csv_parser tests/test_csv_parser.cpp)
add_trading_test(test_indicators tests/test_indicators.cpp)
add_trading_test(test_portfolio tests/test_portfolio.cpp)
add_trading_test(test_backtest tests/test_backtest.cpp)
add_trading_test(test_risk tests/test_risk.cpp)
