#!/usr/bin/env python3
"""Test sentiment analyzer with Vietnamese text"""
import sys
sys.path.insert(0, './src/core/sentiment')
from analyze import analyze_vietnamese

# Test cases
test_cases = [
    ('Tôi rất thích sản phẩm này, tuyệt vời!', 'positive'),
    ('Dịch vụ này tồi tệ lắm, rất thất vọng', 'negative'),
    ('đồ khốn nạn', 'toxic'),
    ('Hôm nay thời tiết bình thường', 'neutral'),
]

for text, expected in test_cases:
    result = analyze_vietnamese(text)
    print(f"Text: {text}")
    print(f"  Expected: {expected}")
    print(f"  Got: label={result['label']}, toxic={result['toxic']}")
    print()
