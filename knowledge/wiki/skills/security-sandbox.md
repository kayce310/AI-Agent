# Kỹ năng Bảo mật & Sandbox (Security & Sandbox)

## 🎯 Mục tiêu
Đảm bảo an toàn khi thực thi code nguy hiểm hoặc tính toán phức tạp.

---

## ⚡ Nguyên tắc Vàng

### 1. Docker Isolation
- **TẤT CẢ** code Agent chạy trong Docker container
- Cấu hình tại `docker/` (Dockerfile, docker-compose.yml)
- Không chạy trực tiếp trên host OS

### 2. Phân loại Task Nguy hiểm
| Loại Task | Xử lý |
|-----------|-------|
| Code execution | ✅ Docker container |
| Network operations | ✅ Docker + firewall rules |
| File system access | ✅ Mount volumes có kiểm soát |
| Tính toán phức tạp | ✅ Docker + resource limits |

### 3. Resource Limits
```yaml
# docker-compose.yml
services:
  agent:
    cpus: '0.5'        # Giới hạn CPU
    memory: '512M'     # Giới hạn RAM
    read_only: true    # Filesystem read-only (trừ mounted volumes)
```

---

## 🗺️ Quy trình Thực thi An toàn

```
1. Nhận task → Phân loại độ nguy hiểm
2. Nếu nguy hiểm → Chuẩn bị Docker environment
3. Mount chỉ thư mục cần thiết
4. Chạy trong container với resource limits
5. Thu thập output, cleanup container
```

---

## 📋 Checklist Bảo mật

- [ ] Code chạy trong Docker (không phải host)
- [ ] Resource limits được set (CPU, RAM)
- [ ] Chỉ mount volumes cần thiết
- [ ] Filesystem read-only (trừ khi cần write)
- [ ] Network access được kiểm soát
- [ ] Cleanup sau khi hoàn thành

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Chạy code trực tiếp trên host | ✅ Luôn dùng Docker container |
| ❌ Mount toàn bộ filesystem | ✅ Chỉ mount thư mục làm việc |
| ❌ Không giới hạn resource | ✅ Set CPU/RAM limits |
| ❌ Để container chạy nền không kiểm soát | ✅ Cleanup sau khi xong |
| ❌ Chạy với root privileges | ✅ Dùng non-root user trong container |

---

## 🔗 Liên kết

- [[coding-standards]] - Fail-fast error handling
- [[automation-directives]] - Orchestrator patterns
- [[verification-protocol]] - Kiểm chứng an toàn

#skill #security #sandbox #workflow