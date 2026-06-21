/**
 * Demo: Real StreamingReActLoop integration test
 * Shows full flow: task decomposition → step execution → streaming → result
 */
import { describe, it, expect, vi } from 'vitest';
import { StreamingReActLoop, isComplexTask } from '../src/core/agent/react-loop.js';
import { Logger } from '../src/core/logger.js';

const log = new Logger({ minLevel: 'error', json: false });

describe('Demo: StreamingReActLoop full flow', () => {
  it('should handle "Research IoT + evaluate + recommend" end-to-end', async () => {
    const streamEvents: { type: string; message: string }[] = [];
    let callIdx = 0;

    const runner = vi.fn().mockImplementation(async (prompt: string) => {
      callIdx++;
      const lower = prompt.toLowerCase();

      // Decomposition: prompt contains "phân tích"
      if (lower.includes('phân tích')) {
        return `---BẮT ĐẦU KẾ HOẠCH---
[1] Nghiên cứu các thiết bị IoT phổ biến
[2] Đánh giá ưu nhược điểm từng loại
[3] Đề xuất giải pháp tốt nhất
---KẾT THÚC KẾ HOẠCH---`;
      }

      // Step 1: research
      if (lower.includes('nghiên cứu')) {
        return `Thông tin thiết bị IoT:

ESP32: vi điều khiển WiFi/Bluetooth, giá rẻ ($5-10), công suất thấp
Raspberry Pi: máy tính nhúng đa năng, 4GB RAM, GPIO, giá $50-100
Arduino: vi điều khiển siêu ổn định, giá rẻ, không có WiFi tích hợp`;
      }

      // Step 2: evaluate
      if (lower.includes('đánh giá') || lower.includes('ưu nhược')) {
        return `So sánh 3 thiết bị IoT:

ESP32:
✅ Giá rẻ ($5-10), WiFi/Bluetooth tích hợp, công suất thấp
❌ RAM hạn chế (520KB), không có Ethernet

Raspberry Pi:
✅ Mạnh mẽ (4GB RAM), GPIO, hệ sinh thái lớn, chạy được Coral
❌ Giá cao ($50-100), tiêu thụ điện lớn

Arduino:
✅ Cực kỳ ổn định, tiêu thụ điện rất thấp
❌ Không có WiFi tích hợp, cần shield rời`;
      }

      // Step 3: recommend
      if (lower.includes('đề xuất') || lower.includes('giải pháp')) {
        return `=== ĐỀ XUẤT GIẢI PHÁP ===

🏆 KHUYẾN NGHỊ: ESP32 + Raspberry Pi kết hợp

ESP32 cho cảm biến (giá rẻ, WiFi, low power)
Raspberry Pi làm server trung tâm (mạnh, GPIO, chạy Coral)

📊 Chi phí ước tính: $55-110
⏱ Thời gian triển khai: 2-4 tuần
📈 Độ tin cậy: Cao (failover giữa 2 thiết bị)

=== KẾT THÚC ===`;
      }

      // Synthesis
      if (lower.includes('tổng hợp') || lower.includes('synthesis')) {
        return `=== KẾT QUẢ TỔNG HỢP ===

📊 Nghiên cứu IoT hoàn tất:
• ESP32: giá rẻ, WiFi, phù hợp cảm biến
• Raspberry Pi: mạnh mẽ, phù hợp server
• Kết hợp cả 2 là giải pháp tối ưu

Chi phí: $55-110 | Thời gian: 2-4 tuần
=== KẾT THÚC ===`;
      }

      return Promise.reject(new Error(`Unknown step: ${prompt.slice(0, 80)}`));
    });

    const loop = new StreamingReActLoop(log, runner, (event) => {
      streamEvents.push({ type: event.type, message: event.message });
    });

    const result = await loop.execute(
      'Nghiên cứu thiết bị IoT, so sánh ưu nhược điểm, đề xuất giải pháp tốt nhất'
    );

    // Log for visual verification
    console.log('=== DEMO TIMELINE ===');
    for (const event of streamEvents) {
      console.log(`  [${event.type}] ${event.message}`);
    }
    console.log(`  Steps: ${result.steps?.length || 0}`);
    console.log(`  Total: ${result.totalDurationMs}ms`);
    console.log('=====================');

    // Verify result structure
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result.length).toBeGreaterThan(0);
    expect(result.result).toContain('ESP32');

    // Verify streaming events
    const eventTypes = streamEvents.map(e => e.type);
    expect(eventTypes).toContain('decompose');
    expect(eventTypes).toContain('step_complete');
    expect(eventTypes).toContain('synthesis');
    expect(eventTypes).toContain('complete');

    // Verify timeline is ordered
    const typeOrder = streamEvents.map(e => e.type);
    const decomposeIdx = typeOrder.indexOf('decompose');
    const firstStepIdx = typeOrder.indexOf('step_complete');
    const synthesizeIdx = typeOrder.indexOf('synthesis');
    expect(decomposeIdx).toBeLessThan(firstStepIdx);
    expect(firstStepIdx).toBeLessThan(synthesizeIdx);
  });

  it('should detect complex tasks correctly (VN + EN)', () => {
    const complexCases = [
      'Research IoT platforms and recommend best',
      'So sánh 3 framework AI và đưa ra đề xuất',
      'Phân tích dữ liệu, tạo báo cáo, và gửi email',
      'Evaluate 5 options and recommend top 3',
      'nghiên cứu, phân tích, đề xuất',
      'so sánh và đánh giá',
      'review 3 tools and compare features',
    ];
    const simpleCases = [
      'Xin chào',
      'Hello',
      '5 + 3 = ?',
      'Bây giờ là mấy giờ?',
      'Cảm ơn bạn',
      'cộng 5 + 3',
      'tính giúp tôi 2+2',
      'What time is it?',
    ];

    for (const text of complexCases) {
      expect(isComplexTask(text), `"${text}" should be complex`).toBe(true);
    }
    for (const text of simpleCases) {
      expect(isComplexTask(text), `"${text}" should be simple`).toBe(false);
    }
  });
});
