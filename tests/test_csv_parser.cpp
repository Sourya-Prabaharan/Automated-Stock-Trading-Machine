#include <iostream>
#include <cassert>
#include <fstream>
#include "MarketDataLoader.h"

void create_test_csv(const std::string& filename) {
    std::ofstream f(filename);
    f << "Date,Open,High,Low,Close,Volume\n";
    f << "2023-01-01,100.0,105.0,95.0,102.0,1000\n";
    f << "2023-01-02,102.0,104.0,101.0,103.0,1500\n";
    f.close();
}

void test_successful_load() {
    std::string filename = "test_data.csv";
    create_test_csv(filename);
    
    auto data = MarketDataLoader::loadCSV(filename);
    
    assert(data.size() == 2);
    assert(data[0].date == "2023-01-01");
    assert(data[0].open == 100.0);
    assert(data[0].close == 102.0);
    assert(data[0].volume == 1000);
    
    assert(data[1].date == "2023-01-02");
    assert(data[1].high == 104.0);
    
    remove(filename.c_str());
    std::cout << "test_successful_load passed\n";
}

void test_missing_file() {
    auto data = MarketDataLoader::loadCSV("nonexistent_file.csv");
    assert(data.empty());
    std::cout << "test_missing_file passed\n";
}

int main() {
    test_successful_load();
    test_missing_file();
    std::cout << "All CSV parser tests passed!\n";
    return 0;
}
