function [cmd_thrust, cmd_alpha, cmd_beta] = alloc_vectoring_r_b2e(acc_cmd_earth, M_body_des, R_b2e, sys, act_phys)
% File Name: alloc_vectoring_r_b2e.m
% Description: Vectoring Allocator sử dụng trực tiếp Ma trận xoay (R_b2e).
% Khử hoàn toàn điểm kỳ dị Euler, hỗ trợ đầy đủ R-CRM Coaxial và Pitch/Roll/Yaw.

    % =====================================================================
    % 1. ĐỊNH NGHĨA VECTOR LỰC TRÁI ĐẤT & CHIẾU VỀ BODY BẰNG MA TRẬN R
    % =====================================================================
    F_earth_x = sys.mass * acc_cmd_earth(1);
    F_earth_y = sys.mass * acc_cmd_earth(2);
    F_earth_z = sys.mass * (acc_cmd_earth(3) - sys.sim.g); 
    F_earth = [F_earth_x; F_earth_y; F_earth_z];

    % Chiếu vector lực bằng Ma trận nghịch đảo (Chuyển vị R_b2e')
    F_body = R_b2e' * F_earth;
    
    Fx_base = F_body(1) / 4;
    Fy_base = F_body(2) / 4;
    Fz_base = F_body(3) / 4;

    % =====================================================================
    % 2. PHÂN RÃ LỰC VÀ GIẢI ĐỘNG HỌC NGƯỢC CHO 4 NHÁNH
    % =====================================================================
    cmd_effort_roll  = M_body_des(1);
    cmd_effort_pitch = M_body_des(2);
    cmd_effort_yaw   = M_body_des(3);
    
    cmd_thrust = zeros(8,1); 
    cmd_alpha  = zeros(4,1); 
    cmd_beta   = zeros(4,1);
    
    eta_c = sys.motor.coax_eff; 
    lam_c = sys.motor.coax_torque_eff; 
    c_q   = sys.motor.tau; 
    
    limit_thrust = sys.motor.max_thrust;
    if length(limit_thrust) > 1, limit_thrust = limit_thrust(end); end
    d_yaw = cmd_effort_yaw / 4; 

    for i = 1:4
        pos_x   = sys.hw_map(i, 2);
        pos_y   = sys.hw_map(i, 3);
        idx_top = sys.motor.top_idx(i);
        idx_bot = sys.motor.bot_idx(i);
        dir_top = sys.motor.dir_top(i);
        dir_alpha = sys.servo.dir_alpha(i);
        dir_beta  = sys.servo.dir_beta(i);
        
        % Lực bù trừ Momen Pitch/Roll (Ép vào trục Z của nhánh i)
        d_pitch_i = (cmd_effort_pitch / (4 * abs(pos_x))) * sign(pos_x);
        d_roll_i  = (cmd_effort_roll  / (4 * abs(pos_y))) * sign(pos_y);
        
        F_arm_x = Fx_base;
        F_arm_y = Fy_base;
        F_arm_z = Fz_base - d_pitch_i + d_roll_i;
        
        % Động học ngược (atan2) để tìm góc Servo
        cmd_math_alpha = atan2(-F_arm_x, -F_arm_z);
        cmd_math_beta  = atan2(F_arm_y, sqrt(F_arm_x^2 + F_arm_z^2));
        T_arm = norm([F_arm_x, F_arm_y, F_arm_z]);
        
        cmd_alpha(i) = max(min(cmd_math_alpha * dir_alpha, sys.servo.lim_alpha), -sys.servo.lim_alpha);
        cmd_beta(i)  = max(min(cmd_math_beta  * dir_beta,  sys.servo.lim_beta),  -sys.servo.lim_beta);
        
        % Tính Động cơ Đồng trục R-CRM
        dT_yaw = d_yaw / (dir_top * c_q);
        T_bot = (T_arm - dT_yaw) / (eta_c + lam_c);
        T_top = T_arm - eta_c * T_bot;
        
        if T_bot < 0, T_bot = 0; T_top = T_arm; end
        if T_top < 0, T_top = 0; T_bot = T_arm / eta_c; end
        
        cmd_thrust(idx_top) = min(max(T_top, 0), limit_thrust);
        cmd_thrust(idx_bot) = min(max(T_bot, 0), limit_thrust);
    end
end