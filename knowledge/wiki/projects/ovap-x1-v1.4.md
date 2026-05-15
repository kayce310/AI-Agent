# OVAP-X1 v1.4 — Flight Control System (Giai đoạn 1)

> **Phân loại**: Over-actuated Tilt-Rotor Coaxial UAV  
> **Trạng thái**: ✅ Hoàn thành Phase 1 (Analytical Mixer + R-CRM)  
> **Blueprint**: `knowledge/blueprints/Báo cáo giai đoạn 1 OVAP-X1-1.pdf`  
> **Project Profile**: `knowledge/wiki/projects/ovap-x1.md`

---

## MỤC LỤC

- [1. Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
- [2. Cấu hình phần cứng](#2-cấu-hình-phần-cứng)
- [3. Nguyên lý Tilt-Rotor 2 trục](#3-nguyên-lý-tilt-rotor-2-trục)
- [4. Hệ quy chiếu & Động học Euler](#4-hệ-quy-chiếu--động-học-euler)
- [5. Mô hình cơ cấu chấp hành & Phân phối lực](#5-mô-hình-cơ-cấu-chấp-hành--phân-phối-lực)
- [6. Động lực học & Không gian trạng thái](#6-động-lực-học--không-gian-trạng-thái)
- [7. Bộ phân bổ giải tích (Analytical Mixer)](#7-bộ-phân-bổ-giải-tích-analytical-mixer)
- [8. Kiến trúc phần mềm & Single Source of Truth](#8-kiến-trúc-phần-mềm--single-source-of-truth)
- [9. Thuật toán R-CRM (Rotor-Coaxial Rotor Mixer)](#9-thuật-toán-r-crm-rotor-coaxial-rotor-mixer)
- [10. Kết quả kiểm chứng](#10-kết-quả-kiểm-chứng)
- [11. Hạn chế & Điểm kỳ dị](#11-hạn-chế--điểm-kỳ-dị)
- [12. Modules trong v1.4](#12-modules-trong-v14)
- [13. Tham số kỹ thuật](#13-tham-số-kỹ-thuật)

---

## 1. Tổng quan hệ thống

OVAP-X1 là nền tảng UAV siêu dư cơ cấu chấp hành (Over-actuated) với cấu hình **Tilt-Rotor 2 trục kết hợp động cơ đồng trục (Coaxial)**. Hệ thống sử dụng **16 đầu vào vật lý độc lập** để kiểm soát hoàn toàn **6 bậc tự do (6-DOF)**, cho phép tách biệt chuyển động tịnh tiến khỏi chuyển động quay.

### Đặc điểm nổi bật

| Đặc tính | Giá trị |
|----------|---------|
| Cấu hình | Coaxial X8 Tilt-Rotor |
| Đầu vào vật lý | 16 (8 motor + 8 servo) |
| Bậc tự do (DOF) | 6 (x, y, z, φ, θ, ψ) |
| Trạng thái mô hình | 12 chiều (6 động học + 6 động lực) |
| Khối lượng | ~2.6 kg |
| Khả năng đặc biệt | Full Decoupling 6-DOF — tịnh tiến không cần thay đổi tư thế |

---

## 2. Cấu hình phần cứng

Hệ thống gồm 4 cụm nhánh (Arm), mỗi nhánh bao gồm:

```
                    ┌─────────────────────┐
                    │   Motor trên (CCW/CW)│
                    │   ┌─────────────┐   │
                    │   │  Servo Tay  │   │  ← Góc β (quay ngang)
                    │   └──────┬──────┘   │
                    │          │          │
 ┌─────────┐        │   ┌──────┴──────┐   │
 │  Servo  │────────│   │  Servo Thân │   │  ← Góc α (quay dọc)
 │  Thân   │  frame │   └──────┬──────┘   │
 └─────────┘        │          │          │
   (gắn thân)       │   ┌──────┴──────┐   │
                    │   │ Motor dưới  │   │
                    │   └─────────────┘   │
                    └─────────────────────┘
```

### Phân bố 16 đầu vào

| Loại | Số lượng | Mô tả |
|------|----------|-------|
| **Lực đẩy động cơ** | 8 | 4 cặp động cơ đồng trục (trên/dưới) — điều khiển qua tốc độ quay |
| **Góc bẻ Servo Thân (α)** | 4 | Xoay dọc — quay quanh trục Y, điều khiển Surge (tiến/lùi) |
| **Góc bẻ Servo Tay (β)** | 4 | Xoay ngang — quay quanh trục X, điều khiển Sway (trái/phải) |

### Quy ước chiều quay động cơ

| Nhánh | Vị trí | Motor Trên | Motor Dưới |
|-------|--------|-----------|------------|
| 1 | Trước-Phải (Front-Right) | CCW (S=+1) | CW |
| 2 | Sau-Trái (Rear-Left) | CCW (S=+1) | CW |
| 3 | Trước-Trái (Front-Left) | CW (S=-1) | CCW |
| 4 | Sau-Phải (Rear-Right) | CW (S=-1) | CCW |

> **Lưu ý**: Cặp động cơ đồng trục quay ngược chiều nhau để triệt tiêu momen xoắn. Hệ số chiều quay $S_i \in \{-1, +1\}$ được định nghĩa cho motor Trên, motor Dưới luôn quay ngược lại.

---

## 3. Nguyên lý Tilt-Rotor 2 trục

### Cấp 1: Servo Thân (α) — Xoay dọc

| Thuộc tính | Giá trị |
|------------|---------|
| Trục quay | $Y_B$ (Pitch axis của thân) |
| Gắn trên | Thân máy bay (Body-mounted) |
| Chức năng chính | Điều khiển Surge (tiến/lùi) mà không đổi Pitch |
| Tác động phụ | Tạo momen Yaw nhưng hiệu suất thấp (gần trọng tâm) |

### Cấp 2: Servo Tay (β) — Xoay ngang

| Thuộc tính | Giá trị |
|------------|---------|
| Trục quay | $X$ cục bộ của cánh tay |
| Gắn trên | Đỉnh tay chữ U (Arm-mounted) |
| Chức năng chính | Điều khiển Sway (trái/phải) |
| Tác động chủ đạo | **High Authority Yaw** — do cánh tay đòn $L$ lớn |

### Mục tiêu điều khiển

1. **Full Decoupling 6-DOF**: Tách biệt hoàn toàn vị trí và tư thế
   - Surge/Sway mà không thay đổi Roll/Pitch
   - Thay đổi Pitch/Roll mà không trôi vị trí
2. **Precision Trajectory Tracking**: Bám quỹ đạo chính xác, sai số xác lập → 0
3. **Active Disturbance Rejection**: Kháng nhiễu chủ động (gió tạt, nhiễu động) không cần thay đổi tư thế thân

---

## 4. Hệ quy chiếu & Động học Euler

### Hệ tọa độ

| Hệ | Gốc | Trục | Mục đích |
|----|-----|------|----------|
| **Quán tính (E)** | Điểm cất cánh | NED (North-East-Down) | Định vị, dẫn đường |
| **Thân (B)** | Trọng tâm UAV | $X_B$: Mũi, $Y_B$: Phải, $Z_B$: Xuống | Tính lực, momen, IMU |

### Ma trận quay (Z-Y-X Euler)

Thứ tự quay: Yaw ($\psi$) → Pitch ($\theta$) → Roll ($\phi$)

$$R^E_B = R_Z(\psi) R_Y(\theta) R_X(\phi)$$

Trong đó:
- $R$: Rotation Matrix chuyển đổi vector từ Body → Inertial
- Trực giao: $R^{-1} = R^T$

### Vector trạng thái 12 chiều

$$\mathbf{x} = [x, y, z, u, v, w, \phi, \theta, \psi, p, q, r]^T$$

| Thành phần | Ký hiệu | Ý nghĩa |
|-----------|---------|----------|
| **Vị trí** | $\xi = [x, y, z]^T$ | Vị trí trọng tâm trong hệ E |
| **Vận tốc tịnh tiến** | $\nu = [u, v, w]^T$ | Vận tốc trong hệ B |
| **Góc Euler** | $\eta = [\phi, \theta, \psi]^T$ | Roll, Pitch, Yaw |
| **Vận tốc góc** | $\omega = [p, q, r]^T$ | Vận tốc góc trong hệ B |

---

## 5. Mô hình cơ cấu chấp hành & Phân phối lực

### Vector điều khiển trung gian

Mỗi nhánh $i$ có vector điều khiển $u_i \in \mathbb{R}^4$:

$$u_i = [F_{ix}, F_{iy}, F_{iz}, \Delta M_i]^T$$

Gộp 4 nhánh → vector điều khiển toàn cục $u \in \mathbb{R}^{16}$:

$$u = [u_1^T, u_2^T, u_3^T, u_4^T]^T$$

### Ma trận phân phối A($\alpha$, $\beta$)

$$A(\alpha, \beta) \in \mathbb{R}^{6 \times 16}$$

Cấu trúc ma trận cục bộ cho nhánh $i$:

$$A_i = \begin{bmatrix}
I_{3 \times 3} & 0_{3 \times 1} \\
S(r_{\text{total},i}) & -v_{\text{dir},i}
\end{bmatrix}$$

Trong đó:
- $I_{3 \times 3}$: Ánh xạ lực tịnh tiến 1:1
- $S(r_{\text{total},i})$: Ma trận skew-symmetric của cánh tay đòn động → tính momen sức bẩy
- $-v_{\text{dir},i}$: Vector định hướng → phân bổ $\Delta M_i$ vào Roll/Pitch/Yaw đúng tỷ lệ góc servo
- $0_{3 \times 1}$: Momen xoắn nội tại **không** sinh lực tịnh tiến

### Cánh tay đòn động

Do Tilt-Rotor, cánh tay đòn thay đổi liên tục theo góc servo:

$$r_{\text{total},i} = r_{\text{pivot},i} + r_{\text{offset},i}$$

$$r_{\text{offset},i} = \begin{bmatrix}
h_{\text{prop}} \sin\alpha_i \cos\beta_i \\
h_{\text{prop}} \sin\beta_i \\
-h_{\text{prop}} \cos\alpha_i \cos\beta_i
\end{bmatrix}$$

### Đặc tính Coaxial — Hệ số suy hao

| Hệ số | Khoảng | Ý nghĩa |
|-------|--------|---------|
| $\eta_{\text{coax}}$ | 0.75 — 0.9 | Suy giảm lực đẩy cánh dưới do nhiễu động đồng trục |
| $\lambda_{\text{coax}}$ | 0 — 1 | Suy giảm hiệu suất momen quay cánh dưới |

Phương trình lực đẩy và momen tại mỗi cụm nhánh:

$$\sum T_i = K_f \Omega_{\text{upper},i}^2 + \eta_{\text{coax}} K_f \Omega_{\text{lower},i}^2$$

$$\Delta M_i = S_i K_Q (\lambda_{\text{coax}} \Omega_{\text{upper},i}^2 - \Omega_{\text{lower},i}^2)$$

---

## 6. Động lực học & Không gian trạng thái

### Phương trình vi phân đầy đủ

Hệ phương trình trạng thái $\dot{\mathbf{x}} = f(\mathbf{x}, u)$ gồm 12 phương trình vi phân:

**Động học vị trí:**
$$\dot{\xi} = R^E_B \cdot \nu$$

**Động học tư thế:**
$$\dot{\eta} = W^{-1}(\eta) \cdot \omega$$

**Động lực học tịnh tiến:**
$$m(\dot{\nu} + \omega \times \nu) = F_{\text{control}}^B + F_{\text{gravity}}^B + F_{\text{drag}}^B$$

**Động lực học quay:**
$$J\dot{\omega} + \omega \times (J\omega) = M_{\text{control}}^B + M_{\text{gyro}}^B + M_{\text{drag}}^B$$

### Các thành phần lực/momen

| Thành phần | Công thức | Vai trò |
|------------|-----------|---------|
| Lực điều khiển | $F_{\text{control}}^B = \sum_{i=1}^4 F_i$ | Chủ động từ mixer |
| Trọng lực | $F_{\text{gravity}}^B = (R^E_B)^T [0, 0, mg]^T$ | Phụ thuộc tư thế |
| Lực cản | $F_{\text{drag}}^B = -D_\nu \cdot \nu$ | Tỷ lệ vận tốc |
| Momen Gyro | $M_{\text{gyro}} = \sum_{i=1}^8 J_{\text{prop}} (\omega \times e_{zi} \Omega_i)$ | Hiệu ứng hồi chuyển |
| Momen cản | $M_{\text{drag}}^B = -D_\omega \cdot \omega$ | Cản quay |

> **Ưu điểm Coaxial**: Do 2 motor quay ngược chiều, tổng động lượng góc mỗi nhánh ≈ 0 → $M_{\text{gyro,branch}} \approx 0$, triệt tiêu nhiễu phi tuyến lên ngàm Servo.

---

## 7. Bộ phân bổ giải tích (Analytical Mixer)

### Phương pháp xấp xỉ tĩnh

Giai đoạn 1 sử dụng **xấp xỉ tĩnh** thay vì giải trực tiếp ma trận $A(\alpha, \beta)^{6 \times 16}$:
- Giả định Servo hoạt động quanh điểm cân bằng
- Sử dụng quy tắc cộng/trừ đại số tuyến tính
- Giảm tải tính toán tối đa cho vi điều khiển

### Tính toán góc ngàm Servo

**1. Đồng bộ hệ tọa độ:**
Vector gia tốc mong muốn từ hệ E → xoay theo Yaw → hệ B.

**2. Nội suy góc bẻ cơ sở:**

$$\alpha_{\text{base}} = \arcsin\left(\frac{a_x}{g}\right)$$

$$\beta_{\text{base}} = \arcsin\left(\frac{a_y}{g}\right)$$

**3. Giải trừ liên kết tư thế (Decoupling):**

$$\alpha_{\text{cmd}} = \alpha_{\text{base}} - \theta$$

$$\beta_{\text{cmd}} = \beta_{\text{base}} - \phi$$

Các phép trừ trực tiếp góc Pitch/Roll ($\theta$, $\phi$) từ IMU giúp neo giữ vector lực đẩy luôn hướng xuống trục $Z_E$ — thực thi ở 400Hz.

### Bù trừ lực nâng (Thrust Loss Compensation)

Khi Servo bẻ góc → thành phần lực đẩy Z bị suy giảm:

$$T_{\text{base}} = \frac{F_{z,\text{req}}}{\cos\alpha_{\text{fb}} \cdot \cos\beta_{\text{fb}} \times 4}$$

### Phân bổ momen lật

**Roll moment → chênh lệch lực các nhánh:**

$$\Delta T_{\text{roll},i} = M_x \cdot \frac{\text{sign}(y_i)}{\sum |y_i|}$$

**Pitch moment → chênh lệch lực các nhánh:**

$$\Delta T_{\text{pitch},i} = M_y \cdot \frac{\text{sign}(x_i)}{\sum |x_i|}$$

**Tổng hợp lực đẩy mỗi nhánh:**

$$T_{\text{arm},i} = T_{\text{base}} + \Delta T_{\text{pitch},i} - \Delta T_{\text{roll},i}$$

---

## 8. Kiến trúc phần mềm & Single Source of Truth

### Nguyên tắc "Nguồn chân lý duy nhất"

Toàn bộ thông số phần cứng tập trung vào một **Bảng ánh xạ phần cứng (Hardware Mapping Table)** — ma trận $4 \times 8$ chứa:

| Trường | Mô tả |
|--------|-------|
| Arm ID | 1: Trước-Phải, 2: Sau-Trái, 3: Trước-Trái, 4: Sau-Phải |
| Tọa độ (X, Y) | Khoảng cách từ CoG đến ngàm xoay |
| Chỉ số động cơ (Top/Bot) | Ánh xạ ID chuẩn PX4 |
| Chiều quay (S) | +1: CCW, -1: CW |
| Chiều bẻ Servo ($\alpha$, $\beta$) | Bù trừ hướng lắp đặt đối xứng gương |

> **Lợi ích**: Module nào cũng truy xuất từ bảng này → dễ nâng cấp lên Hexa-Tilt (6 nhánh) hoặc Octo-Tilt (8 nhánh) chỉ cần thêm hàng.

### Luồng tín hiệu (Signal Flow v1.4)

```
Target Command (X, Y, Z đặt)
        │
        ▼
Trajectory Planner (Actuator-aware — giới hạn gia tốc/vận tốc)
        │
        ▼
Cascade PID Controller
  ├── Outer Loop (vị trí → góc mong muốn)
  └── Inner Loop (góc/sai lệch → 4 nỗ lực: Thrust, Pitch, Roll, Yaw)
        │
        ▼
Analytical Mixer (Giải tích — 4 biến nỗ lực → 16 đầu vào vật lý)
  ├── Tính góc Servo (α, β) từ gia tốc mong muốn
  ├── Bù trừ lực nâng (cos⁻¹)
  ├── Phân bổ momen (sign-based)
  ├── R-CRM (phân rã lực đồng trục)
  └── Inverse Kinematics → 8 lệnh motor + 8 lệnh servo
        │
        ▼
6-DOF Simscape Plant (Mô phỏng vật lý đa vật thể)
```

---

## 9. Thuật toán R-CRM (Rotor-Coaxial Rotor Mixer)

### Bài toán

Tại mỗi nhánh $i$, từ $T_{\text{arm},i}$ và $\Delta T_{\text{yaw}}$ → phân rã thành lực đẩy riêng cho motor Trên ($T_{\text{top}}$) và Dưới ($T_{\text{bottom}}$), có tính đến suy hao đồng trục $\eta_{\text{coax}}$, $\lambda_{\text{coax}}$.

### Hệ phương trình

**(1) Cân bằng lực đẩy:**
$$T_{\text{arm},i} = T_{\text{top}} + \eta_{\text{coax}} T_{\text{bottom}}$$

**(2) Cân bằng momen (chênh lệch lực):**
$$T_{\text{top}} - \lambda_{\text{coax}} T_{\text{bottom}} = \Delta T_{\text{yaw}}$$

### Nghiệm giải tích (dạng đóng)

**Lực đẩy motor Dưới:**
$$T_{\text{bottom}} = \frac{T_{\text{arm},i} - \Delta T_{\text{yaw}}}{\eta_{\text{coax}} + \lambda_{\text{coax}}}$$

**Lực đẩy motor Trên:**
$$T_{\text{top}} = T_{\text{arm},i} - \eta_{\text{coax}} \cdot T_{\text{bottom}}$$

### Xử lý bão hòa (Saturation Handling)

Nếu $T_{\text{bottom}} < 0$ hoặc $T_{\text{top}} < 0$:
```matlab
if T_bottom < 0
    T_bottom = 0;
    T_top = T_arm_i;       % Motor trên gánh toàn bộ
elseif T_top < 0
    T_top = 0;
    T_bottom = T_arm_i / eta_coax;  % Motor dưới gánh toàn bộ
end
```

> **Ưu điểm**: Giải nghiệm đóng (closed-form) → tính toán cực nhanh trên vi điều khiển. Triệt tiêu momen xoắn dư thừa ngay từ tầng cơ cấu chấp hành, không cần chờ PID bù trừ.

---

## 10. Kết quả kiểm chứng

### Môi trường thử nghiệm

- **Scripts**: MATLAB — mô hình toán học thuần túy
- **Simscape Multibody**: Mô phỏng vật lý đa vật thể 6-DOF phi tuyến đầy đủ

### Kết quả chính

| Kịch bản | Kết quả | Ghi chú |
|----------|---------|---------|
| **Hover (giữ vị trí)** | Ổn định | Motor dưới 3.64N > motor trên 3.27N (bù 15% hao hụt coax) |
| **Decoupling 6-DOF** | ✅ Thành công | Vừa ngóc mũi +10° vừa bay tiến — bất khả thi với UAV thường |
| **Scripts vs Simscape** | ✅ Khớp | Logic giải tích kiểm soát được hệ phi tuyến phức tạp |

### Kịch bản đặc biệt: Tịnh tiến độc lập

Yêu cầu: UAV di chuyển tiến 10m trên trục X, đồng thời **ngóc đầu Pitch +10°**.

- **Quadcopter truyền thống**: Bất khả thi — phải chúi mũi (Pitch âm) để bay tiến.
- **OVAP-X1 v1.4**: ✅ Hoàn hảo.
  - Servo tự động bẻ góc lớn hơn về phía trước để bù
  - Vector lực đẩy tổng hợp vẫn hướng chéo về sau → đẩy UAV tiến
  - Thân máy bay giữ nguyên tư thế ngóc đầu ổn định

---

## 11. Hạn chế & Điểm kỳ dị

### Phát hiện chính

Khi góc Servo Tay $\beta \geq 75^\circ$, hệ thống xuất hiện:

| Góc β | Hiện tượng |
|-------|-----------|
| 75° | Dao động Yaw + đập nhả lực đẩy tần số cao |
| 80°—85° | Mất ổn định hoàn toàn, PID bão hòa, UAV mất kiểm soát |

### Nguyên nhân gốc rễ

1. **Suy giảm quyền điều khiển Pitch**: $F_z \propto \sin(80^\circ) \approx 0.17$ → mất 83% khả năng điều khiển Pitch.

2. **Nhiễu chéo Yaw**: Chênh lệch $T_{\text{front}} - T_{\text{rear}}$ tạo lực ngang → momen Yaw phá hoại.

3. **Tỷ lệ nhiễu chéo cực đại**:
   $$\frac{\sin(80^\circ)}{\cos(80^\circ)} = \tan(80^\circ) \approx 5.67$$

   → Cứ 1 đơn vị lực Pitch → 5.67 đơn vị lực Yaw ngoài ý muốn.

4. **Khả năng chống Yaw bị vô hiệu**: Trục motor nằm ngang → mất 83% sức mạnh điều khiển Yaw nội tại.

### Giải pháp tạm thời (v1.4)

Hệ số bù chéo tĩnh $K_{\text{cross}}$:
- ✅ Hiệu quả ở $\beta \leq 75^\circ$
- ❌ Thất bại ở $\beta \geq 75^\circ$ — bù tĩnh không đáp ứng kịp động lực học tần số cao

### Hạn chế tổng thể của v1.4

| Hạn chế | Mô tả | Hướng giải quyết (Phase 2) |
|---------|-------|---------------------------|
| Cánh tay đòn tĩnh | Chưa bao hàm biến thiên $r_z$ ở góc lớn | WPIN + ma trận $A(\alpha,\beta)$ động |
| Không tận dụng Null-space | Lãng phí 10 bậc tự do dư thừa | WPIN tối ưu đa mục tiêu |
| PID truyền thống | Khó xử lý phi tuyến cao | Chuyển sang điều khiển phi tuyến |
| Điểm kỳ dị $\beta \geq 80^\circ$ | Mất ổn định toàn phần | Thuật toán Phân bổ Phi tuyến (WPIN) |

---

## 12. Modules trong v1.4

### Cấu trúc module

```
OVAP-X1-Flight-Control-1.4/
├── main_sim.m                  # Script chính — khởi tạo & chạy mô phỏng
├── mission_manager.m           # Quản lý nhiệm vụ, waypoint
├── trajectory_planner.m        # Bộ tạo quỹ đạo (Actuator-aware)
├── modules/
│   ├── control/
│   │   └── cascade_pid.m       # Cascade PID Controller
│   ├── plant/
│   │   ├── dynamics_12dof.m    # Mô hình 12-DOF
│   │   └── coaxial_mixer.m     # R-CRM Mixer
│   └── visualization/
│       └── visualize_3d.m      # 3D visualization
├── config/
│   └── hardware_map.m          # Bảng ánh xạ phần cứng (SSoT)
└── STL_block_create.m          # Tạo khối Simscape
```

### Chức năng từng module

| Module | Input | Output | Chức năng |
|--------|-------|--------|-----------|
| `main_sim.m` | — | Simulation loop | Khởi tạo tham số, chạy vòng lặp mô phỏng |
| `mission_manager.m` | `t` | `raw_target` | Sinh tín hiệu đặt (waypoint) |
| `trajectory_planner.m` | `raw_target` | `setpoint` | Làm mềm tín hiệu, giới hạn gia tốc/vận tốc |
| `cascade_pid.m` | `setpoint`, `state` | `effort` (4 biến) | PID vòng ngoài + vòng trong |
| `coaxial_mixer.m` | `effort` | `u_16` (16 đầu vào) | Analytical Mixer + R-CRM |
| `dynamics_12dof.m` | `u_16` | `next_state` | Newton-Euler 12-DOF + Gyro + Drag |
| `hardware_map.m` | — | `params` | Bảng ánh xạ phần cứng tập trung |

---

## 13. Tham số kỹ thuật

### Tham số vật lý

| Tham số | Ký hiệu | Giá trị | Đơn vị |
|---------|---------|---------|--------|
| Khối lượng | $m$ | 2.6 | kg |
| Hệ số lực đẩy | $K_f$ | — | (phụ thuộc cánh quạt) |
| Hệ số momen cản | $K_Q$ | — | (phụ thuộc cánh quạt) |
| Suy hao lực đẩy coax | $\eta_{\text{coax}}$ | 0.75 — 0.9 | — |
| Suy hao momen coax | $\lambda_{\text{coax}}$ | 0 — 1 | — |
| Khoảng cách pivot X | $d_x$ | — | m |
| Khoảng cách pivot Y | $d_y$ | — | m |
| Chiều dài prop | $h_{\text{prop}}$ | — | m |

### Tham số điều khiển

| Tham số | Giá trị | Ghi chú |
|---------|---------|---------|
| Chu kỳ điều khiển | 400 Hz | IMU + Mixer |
| Giới hạn góc Servo α | ±75° | Giới hạn an toàn |
| Giới hạn góc Servo β | ±75° | Giới hạn an toàn (trên thực tế) |
| Tần số vòng ngoài PID | — | Position loop |
| Tần số vòng trong PID | — | Attitude loop |

---

## Liên kết

- [[ovap-x1]] — Project profile
- [[../troubleshooting/matlab-drawnow-nocancel-unsupported]] — MATLAB troubleshooting
- [[../skills/verification-protocol]] — Giao thức kiểm chứng

#ovap-x1 #v1.4 #flight-control #tilt-rotor #coaxial #control-allocation #r-crm