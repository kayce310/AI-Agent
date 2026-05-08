# OVAP-X1 Flight Control - Project Profile

## 🎯 Mục tiêu dự án
Mô phỏng, tích hợp và ổn định hệ điều khiển bay OVAP-X1, bao gồm mission manager, trajectory planner, limits, logger và visualization 3D.

---

## 📁 Vị trí liên quan

- v1.4 baseline: `knowledge/blueprints/OVAP-X1-Flight-Control-1.4/`
- v1.5 feature branch: `knowledge/blueprints/OVAP-X1-Flight-Control-1.5/`
- Workspace state lịch sử: `knowledge/workspace/state.md`

---

## 🧭 Quy tắc khi xử lý OVAP-X1

1. Không sửa đồng thời v1.4 và v1.5 nếu user chưa yêu cầu rõ.
2. Khi sửa MATLAB visualization, kiểm tra compatibility lệnh UI như `drawnow`.
3. Giữ interface giữa `main_sim.m`, `data_logger.m`, `visualize_3d.m` nhất quán.
4. Ghi bug/fix vào `knowledge/wiki/troubleshooting/` nếu có lỗi tái diễn.

---

## 🔗 Liên kết

- [[../troubleshooting/matlab-drawnow-nocancel-unsupported]]
- [[../skills/verification-protocol]]
- [[../skills/evolution-protocol]]

#project #ovap-x1 #flight-control #matlab