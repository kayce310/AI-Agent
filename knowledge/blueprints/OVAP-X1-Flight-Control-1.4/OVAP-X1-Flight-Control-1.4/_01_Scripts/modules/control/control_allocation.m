function [cmd_thrust, cmd_alpha, cmd_beta] = control_allocation(tau_des, sys, act_phys)
% File Name: control_allocation.m
% Position: Root > modules > control > control_allocation.m
% Description: 16-DOF WPIN Allocation matched with PX4 Coaxial Directions & FCD3 Aerodynamics.

    % 1. Xây dựng ma trận Jacobian A (6x16)
    A = zeros(6, 16);
    for i = 1:4
        alpha = act_phys.alpha(i); 
        beta = act_phys.beta(i);
        
        % [CẬP NHẬT 1]: Ma trận xoay nối tiếp (Ry rồi Rx). 
        % Phản ánh chính xác cấu trúc cơ khí: Ngàm chữ U xoay trục Y, Motor xoay trục X.
        R_s = [ cos(alpha),  sin(alpha)*sin(beta),  sin(alpha)*cos(beta);
                         0,            cos(beta),           -sin(beta);
               -sin(alpha),  cos(alpha)*sin(beta),  cos(alpha)*cos(beta)];
        
        % [CẬP NHẬT 2]: Tính cánh tay đòn động Si bằng Tâm lực đẩy hiệu dụng (h_eff)
        r_pivot = sys.geo.r(i,:)';
        r_prop_offset = R_s * [0; 0; -sys.geo.h_eff]; 
        r_total = r_pivot + r_prop_offset; 
        
        % [CẬP NHẬT 3]: Vector hướng momen nội tại (v_dir_neg)
        % Nó luôn là trục -Z cục bộ của động cơ được chiếu qua ma trận xoay
        v_dir_neg = R_s * [0; 0; 1];
        
        idx = (i-1)*4;
        A(1:3, idx+1 : idx+3) = eye(3);
        A(4:6, idx+1 : idx+3) = skew_symmetric(r_total);
        A(4:6, idx+4)         = v_dir_neg; 
    end

    % 2. Ma trận Trọng số W
    % [Fx, Fy, Fz, M_delta]. Đặt trọng số Fx, Fy (15) để ưu tiên dùng Servo.
    % Đặt trọng số M_delta (2) để khuyến khích dùng chênh lệch vòng quay điều khiển Yaw.
    W_arm = diag([15, 15, 1, 2]); 
    W = blkdiag(W_arm, W_arm, W_arm, W_arm);

    % 3. Giải Giả nghịch đảo WPIN
    W_inv = diag(1 ./ diag(W)); % Tính nghịch đảo ma trận đường chéo
    
    % [CẬP NHẬT 4]: Dùng toán tử '/' của MATLAB thay cho inv()
    % Tính toán nhanh hơn, an toàn hơn và tránh lỗi suy biến (Floating-point error)
    A_dagger = W_inv * A' / (A * W_inv * A');
    u_total = A_dagger * tau_des;

    % 4. Inverse Kinematics & Phân rã Đồng trục (Coaxial Decomposition)
    cmd_thrust = zeros(8,1); % 1-4: Động cơ Trên | 5-8: Động cơ Dưới
    cmd_alpha  = zeros(4,1); 
    cmd_beta   = zeros(4,1);
    
    eta_c  = sys.motor.coax_eff;        % eta_coax (hao hụt lực nâng)
    lam_c  = sys.motor.coax_torque_eff; % lambda (hao hụt mô-men)
    c_q    = sys.motor.tau;
    
    for i = 1:4
        idx = (i-1)*4;
        Fi      = u_total(idx+1 : idx+3);
        M_delta = u_total(idx+4); 
        
        % Tính Lực tổng và Góc Servo lý tưởng
        T_i = norm(Fi);
        if T_i > 0.01
            cmd_alpha(i) = atan2(-Fi(1), -Fi(3));
            cmd_beta(i)  = atan2(Fi(2), sqrt(Fi(1)^2 + Fi(3)^2));
        end
        
        % [CẬP NHẬT 5]: PHÂN RÃ LỰC THEO CHIỀU QUAY (PX4 Logic)
        % Sự phân rã giờ đây phụ thuộc vào chiều quay (dir_top) để tự động 
        % đảo ngược logic tăng/giảm ga giúp 4 nhánh đồng thuận tạo ra Momen Yaw.
        delta_T = M_delta / (sys.motor.dir_top(i) * c_q);
        
        % Giải hệ phương trình 2 ẩn dựa trên R-CRM
        % T_bot nhận gánh nặng bù trừ cho cả 2 loại hao hụt
        T_bot = (T_i - delta_T) / (eta_c + lam_c); 
        T_top = T_i - eta_c * T_bot;
        
        % Defensive Programming: Chống bão hòa (Động cơ không thể quay ngược)
        if T_bot < 0
            T_bot = 0;
            T_top = T_i; % Dồn toàn bộ lực yêu cầu lên động cơ trên
        end
        if T_top < 0
            T_top = 0;
            % SỬA LỖI Ở ĐÂY: Chia cho eta_c thay vì lam_c để đảm bảo đủ lực nâng (Thrust)
            T_bot = T_i / eta_c; 
        end
        
        % [CẬP NHẬT 6]: Chặn giới hạn Max Thrust vật lý của động cơ
        cmd_thrust(i)   = min(T_top, sys.motor.max_thrust);
        cmd_thrust(i+4) = min(T_bot, sys.motor.max_thrust);
    end

    % [GIỮ NGUYÊN]: Ánh xạ Góc Toán Học -> Lệnh Phần Cứng
    % Nếu lắp ngược (dir = -1), lệnh xuất ra sẽ bị đảo dấu để bù trừ cơ khí
    cmd_alpha = cmd_alpha .* sys.servo.dir_alpha;
    cmd_beta  = cmd_beta  .* sys.servo.dir_beta;

    % 5. Saturation Servo
    cmd_alpha = saturate(cmd_alpha, -sys.servo.lim_alpha, sys.servo.lim_alpha);
    cmd_beta  = saturate(cmd_beta,  -sys.servo.lim_beta,  sys.servo.lim_beta);
end

%% ================= LOCAL FUNCTIONS =================
function S = skew_symmetric(v)
    S = [0 -v(3) v(2); v(3) 0 -v(1); -v(2) v(1) 0];
end

function v_out = saturate(v_in, v_min, v_max)
    v_out = max(min(v_in, v_max), v_min);
end