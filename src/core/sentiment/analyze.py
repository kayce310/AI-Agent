#!/usr/bin/env python3
"""
Coral Sentiment Analyzer
- VADER for English (social media optimized)
- underthesea for Vietnamese (with toxic word detection)
- Auto language detection
"""

import sys
import json
import time
from typing import Optional

# Vietnamese toxic/slang words (subset for detection)
VIET_TOXIC_WORDS = [
    'đụ', 'đéo', 'cặc', 'lồn', 'chó', 'đồ khốn', 'thằng khốn',
    'mẹ mày', 'cha mày', 'đồ ngu', 'thằng ngu', 'đồ khùng',
    'chết mẹ', 'chết cha', 'loz', 'clm', 'dm', 'dcm',
    'vcl', 'vãi lồn', 'vãi chưởng', 'fuck', 'shit', 'bitch',
    'asshole', 'damn', 'crap', 'stupid', 'idiot',
]

# Vietnamese sentiment words (positive/negative dictionaries)
VIET_POSITIVE = [
    'tốt', 'giỏi', 'hay', 'đẹp', 'thích', 'yêu', 'tuyệt vời',
    'tuyệt', 'xuất sắc', 'hoàn hảo', 'tốt lắm', 'cảm ơn',
    'cám ơn', 'ok', 'ổn', 'được', 'vui', 'hạnh phúc',
    'thành công', 'thắng', 'vượt trội', 'nổi bật', 'tuyệt',
    'cảm ơn bạn', 'cảm ơn anh', 'cảm ơn chị', 'thanks',
]

VIET_NEGATIVE = [
    'tệ', 'xấu', 'dở', 'chán', 'thất vọng', 'tức giận',
    'buồn', 'khóc', 'ghét', 'đồ ngu', 'ngu', 'đần',
    'kém', 'tồi', 'fail', 'lỗi', 'sai', 'sai rồi',
    'không được', 'không ổn', 'đáng thất vọng',
]

# English toxic words
EN_TOXIC_WORDS = [
    'fuck', 'fucking', 'fucked',
    'shit', 'shitting',
    'bitch', 'bitching',
    'asshole', 'dick', 'bastard',
    'crap', 'damn', 'damnit',
    'stupid', 'idiot', 'dumbass',
    'kill yourself', 'kys', 'die',
    'motherfucker', 'whore', 'slut',
]

# English sentiment words
EN_POSITIVE = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'love', 'like', 'best', 'awesome', 'perfect', 'beautiful',
    'happy', 'glad', 'thanks', 'thank', 'nice', 'well done',
    'congratulations', 'brilliant', 'outstanding', 'superb',
]

EN_NEGATIVE = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate',
    'disgusting', 'stupid', 'idiot', 'ugly', 'boring', 'annoying',
    'frustrated', 'angry', 'sad', 'disappointed', 'fail', 'broken',
    'useless', 'worthless', 'pathetic', 'damn', 'crap',
]


def detect_language(text: str) -> str:
    """Detect if text is primarily Vietnamese or English"""
    def is_viet(c):
        # Latin-1 Supplement (00C0-00FF) - à, á, â, ã, è, é, ê, ì, í, ò, ó, ô, õ, ù, ú, ý
        if '\u00C0' <= c <= '\u00FF':
            return True
        # Latin Extended-A (0100-024F) - ă, đ, ê, ô, ơ, ư, ...
        if '\u0100' <= c <= '\u024F':
            return True
        # Latin Extended Additional (1EA0-1EFF) - Vietnamese diacritics
        if '\u1EA0' <= c <= '\u1EFF':
            return True
        return False
    
    viet_chars = sum(1 for c in text if is_viet(c))
    total_alpha = sum(1 for c in text if c.isalpha())
    
    if total_alpha == 0:
        return 'en'
    
    viet_ratio = viet_chars / total_alpha
    return 'vi' if viet_ratio > 0.05 else 'en'  # Even a few VI chars indicates Vietnamese


def analyze_vietnamese(text: str) -> dict:
    """Analyze Vietnamese sentiment using dictionary matching + underthesea"""
    text_lower = text.lower()
    
    # Check for toxic words first
    toxic_found = [word for word in VIET_TOXIC_WORDS if word in text_lower]
    
    # Dictionary-based sentiment
    pos_count = sum(1 for w in VIET_POSITIVE if w in text_lower)
    neg_count = sum(1 for w in VIET_NEGATIVE if w in text_lower)
    
    # Try underthesea if available
    vn_sentiment = None
    try:
        from underthesea import sentiment
        vn_sentiment = sentiment(text)
    except Exception:
        pass
    
    # Combine results
    if vn_sentiment == 'positive':
        pos_count += 2
    elif vn_sentiment == 'negative':
        neg_count += 2
    
    # Calculate score (-1 to 1)
    total = pos_count + neg_count
    if total == 0:
        score = 0.0
    else:
        score = (pos_count - neg_count) / total
    
    # Determine label
    if score > 0.1:
        label = 'positive'
    elif score < -0.1:
        label = 'negative'
    else:
        label = 'neutral'
    
    # Toxic check
    is_toxic = len(toxic_found) > 0
    toxicity_level = 0.0
    if is_toxic:
        toxicity_level = min(1.0, len(toxic_found) * 0.3)
    
    return {
        'score': round(score, 3),
        'label': label,
        'toxic': is_toxic,
        'toxic_words': toxic_found,
        'toxicity_level': round(toxicity_level, 3),
        'engine': 'underthesea+dictionary',
        'pos_hits': pos_count,
        'neg_hits': neg_count,
    }


def analyze_english(text: str) -> dict:
    """Analyze English sentiment using VADER"""
    text_lower = text.lower()
    
    # Check for toxic words
    toxic_found = [word for word in EN_TOXIC_WORDS if word in text_lower]
    
    # Try VADER
    vader_score = None
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        vader = SentimentIntensityAnalyzer()
        scores = vader.polarity_scores(text)
        vader_score = scores['compound']
    except Exception:
        pass
    
    # Dictionary fallback
    pos_count = sum(1 for w in EN_POSITIVE if w in text_lower)
    neg_count = sum(1 for w in EN_NEGATIVE if w in text_lower)
    
    # Combine
    if vader_score is not None:
        score = vader_score
    else:
        total = pos_count + neg_count
        score = (pos_count - neg_count) / total if total > 0 else 0.0
    
    # Determine label
    if score > 0.05:
        label = 'positive'
    elif score < -0.05:
        label = 'negative'
    else:
        label = 'neutral'
    
    # Toxic check
    is_toxic = len(toxic_found) > 0
    toxicity_level = 0.0
    if is_toxic:
        toxicity_level = min(1.0, len(toxic_found) * 0.3)
    
    return {
        'score': round(score, 3),
        'label': label,
        'toxic': is_toxic,
        'toxic_words': toxic_found,
        'toxicity_level': round(toxicity_level, 3),
        'engine': 'vader+dictionary',
        'pos_hits': pos_count,
        'neg_hits': neg_count,
    }


def analyze(text: str, force_lang: Optional[str] = None) -> dict:
    """Main analysis function"""
    t0 = time.time()
    
    # Detect language
    lang = force_lang if force_lang else detect_language(text)
    
    # Analyze
    if lang == 'vi':
        result = analyze_vietnamese(text)
    else:
        result = analyze_english(text)
    
    result['language'] = lang
    result['text'] = text[:200]  # Truncate for logging
    result['latency_ms'] = round((time.time() - t0) * 1000, 2)
    
    return result


def main():
    """CLI entry point: echo '{"text":"..."}' via stdin or pass as argument"""
    if len(sys.argv) > 1:
        # Argument mode
        text = ' '.join(sys.argv[1:])
        result = analyze(text)
    else:
        # Stdin mode
        try:
            input_data = sys.stdin.read().strip()
            data = json.loads(input_data)
            text = data.get('text', '')
            force_lang = data.get('lang')
            result = analyze(text, force_lang)
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON input'}))
            sys.exit(1)
    
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
