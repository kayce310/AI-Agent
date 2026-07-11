# Eval Framework — Test Dataset

**Date:** 2026-07-07  
**Target:** 10 test cases for baseline evaluation

---

## 📊 DATASET

### 1. Simple Query (Baseline)
**Input:** "What is 2+2?"  
**Expected Output:** "4"  
**Type:** Direct answer  
**Success Criteria:** Exact match or equivalent

---

### 2. Simple Question (Baseline)
**Input:** "Hello, how are you?"  
**Expected Output:** Short greeting  
**Type:** Social interaction  
**Success Criteria:** Appropriate response, no errors

---

### 3. Research Task (Complex)
**Input:** "Compare Python vs Go for web APIs"  
**Expected Output:** Comparison table with key differences  
**Type:** Research  
**Success Criteria:** Multiple factors covered, balanced view

---

### 4. Multi-step Task (Complex)
**Input:** "Find my last project and summarize it"  
**Expected Output:** Summary of project with key points  
**Type:** Multi-step reasoning  
**Success Criteria:** Memory recall + synthesis

---

### 5. Constraint Task
**Input:** "Explain OAuth but don't mention Google"  
**Expected Output:** OAuth explanation without specific company names  
**Type:** Constraint following  
**Success Criteria:** No forbidden words in output

---

### 6. Failure Scenario
**Input:** "What if I can't reach the URL?"  
**Expected Output:** Graceful handling suggestion  
**Type:** Error handling  
**Success Criteria:** No crash, helpful response

---

### 7. Tool Selection
**Input:** "Read the config file at /etc/app.conf"  
**Expected Output:** Uses read_file tool  
**Type:** Tool accuracy  
**Success Criteria:** Correct tool called with correct args

---

### 8. Vietnamese Query
**Input:** "Thời tiết Hà Nội hôm nay thế nào?"  
**Expected Output:** Weather forecast for Hanoi  
**Type:** Vietnamese language  
**Success Criteria:** Appropriate response in Vietnamese

---

### 9. Long Context
**Input:** "Analyze this document: [500 words of text]"  
**Expected Output:** Summary with key points  
**Type:** Context handling  
**Success Criteria:** Long input handled, relevant summary

---

### 10. Edge Case - Empty
**Input:** "" (empty string)  
**Expected Output:** Graceful error or prompt  
**Type:** Edge case  
**Success Criteria:** No crash, helpful response

---

## 📈 SUCCESS METRICS

| Metric | Target | Method |
|--------|--------|--------|
| Task Success Rate | 70%+ | Manual evaluation |
| Tool Accuracy | 85%+ | Log analysis |
| Hallucination Rate | <10% | Manual spot-check |
| Latency P95 | <30s | Timer in tests |
| Error Rate | <5% | Log analysis |

---

## 🔍 EVALUATION METHOD

1. **Run** each test case through agent
2. **Capture** output + tool calls
3. **Compare** to expected output
4. **Score** based on criteria
5. **Log** all results for analysis

---

## 📝 NEXT STEPS

1. Create eval runner script
2. Implement scoring logic
3. Create human eval interface
4. Generate baseline metrics
