function [cmd_thrust, cmd_alpha, cmd_beta] = alloc_wpin(tau_des, sys, act_phys)
% File Name: alloc_wpin.m
% Position: Root > modules > control > allocators > alloc_wpin.m
% Description: 16-DOF WPIN Allocation matched with PX4 Coaxial Directions & HW Map.

    % 1. Xây dựng ma trận Jacobian A (6x16)
    A = zeros(6, 16);
    for i = 1:4
        % Giải mã góc từ Phần cứng về Toán học
        alpha = act_phys.alpha(i) * sys.servo.dir_alpha(i); 
        beta  = act_phys.beta(i)  * sys.servo.dir_beta(i);
        
        R_s = [ cos(alpha),  sin(alpha)*sin(beta),  sin(alpha)*cos(beta);
                         0,            cos(beta),           -sin(beta);
               -sin(alpha),  cos(alpha)*sin(beta),  cos(alpha)*cos(beta)];
        
        r_pivot = sys.geo.r(i,:)';
        r_prop_offset = R_s * [0; 0; -sys.geo.h_eff]; 
        r_total = r_pivot + r_prop_offset; 
        v_dir_neg = R_s * [0; 0; 1];
        
        idx = (i-1)*4;
        A(1:3, idx+1 : idx+3) = eye(3);
        A(4:6, idx+1 : idx+3) = skew_symmetric(r_total);
        A(4:6, idx+4)         = v_dir_neg; 
    end
    
    % 2. Ma trận Trọng số W & WPIN
    W_arm = diag([15, 15, 1, 2]); 
    W = blkdiag(W_arm, W_arm, W_arm, W_arm);
    W_inv = diag(1 ./ diag(W)); 
    A_dagger = W_inv * A' / (A * W_inv * A');
    u_total = A_dagger * tau_des;
    
    % 3. Phân rã Đồng trục (Coaxial Decomposition)
    cmd_thrust = zeros(8,1); cmd_alpha = zeros(4,1); cmd_beta = zeros(4,1);
    eta_c = sys.motor.coax_eff; lam_c = sys.motor.coax_torque_eff; c_q = sys.motor.tau;
    
    for i = 1:4
        idx = (i-1)*4;
        Fi = u_total(idx+1 : idx+3);
        M_delta = u_total(idx+4); 
        
        T_i = norm(Fi);
        if T_i > 0.01
            cmd_alpha(i) = atan2(-Fi(1), -Fi(3));
            cmd_beta(i)  = atan2(Fi(2), sqrt(Fi(1)^2 + Fi(3)^2));
        end
        
        % Tính toán R-CRM
        delta_T = M_delta / (sys.motor.dir_top(i) * c_q);
        T_bot = (T_i - delta_T) / (eta_c + lam_c); 
        T_top = T_i - eta_c * T_bot;
        
        if T_bot < 0, T_bot = 0; T_top = T_i; end
        if T_top < 0, T_top = 0; T_bot = T_i / eta_c; end
        
        % [SỬA LỖI 1]: Sử dụng top_idx và bot_idx từ Bảng ánh xạ HW_MAP
        idx_top = sys.motor.top_idx(i);
        idx_bot = sys.motor.bot_idx(i);
        
        % Chặn cả cận dưới (0) và cận trên (max_thrust)
        cmd_thrust(idx_top) = min(max(T_top, 0), sys.motor.max_thrust);
        cmd_thrust(idx_bot) = min(max(T_bot, 0), sys.motor.max_thrust);
    end
    
    % [SỬA LỖI 2]: Loại bỏ hàm saturate lỗi, dùng trực tiếp max(min())
    cmd_alpha = max(min(cmd_alpha .* sys.servo.dir_alpha, sys.servo.lim_alpha), -sys.servo.lim_alpha);
    cmd_beta  = max(min(cmd_beta  .* sys.servo.dir_beta,  sys.servo.lim_beta),  -sys.servo.lim_beta);
end

function S = skew_symmetric(v)
    S = [0 -v(3) v(2); v(3) 0 -v(1); -v(2) v(1) 0];
end