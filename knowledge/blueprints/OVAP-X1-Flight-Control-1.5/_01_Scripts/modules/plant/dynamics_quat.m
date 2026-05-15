function [dx, F_b_total, M_b_total] = dynamics_quat(t, x, actuators, sys)
% File Name: dynamics_quat.m
% Description: 13-State Rigid Body Dynamics using Quaternion (No Gimbal Lock).

    % 1. Unpack State (13 Biến)
    state.pos   = x(1:3);
    state.vel_b = x(4:6);
    q           = x(7:10); % Quaternion [qw, qx, qy, qz]
    state.rates = x(11:13);
    
    J = sys.J; invJ = sys.invJ; m = sys.mass;
    
    % Tính toán lực và momen (Sử dụng hàm Actuator y hệt bản gốc)
    [F_act_b, M_act_b] = calculate_actuator_forces(actuators, sys);
    
    % Ma trận xoay từ Quaternion (Body to Earth)
    R_be = quat2rotm_local(q);
    
    % Lực môi trường (Trọng lực chiếu xuống Body)
    % (Truyền R_be là ma trận Body->Earth)
    [F_env_b, M_env_b] = environment(t, state, sys, R_be);
    
    F_sum_b = F_act_b + F_env_b;
    M_sum_b = M_act_b + M_env_b;
    F_b_total = F_sum_b; M_b_total = M_sum_b;
    
    % 2. Phương trình Động lực học Newton-Euler (Gia tốc & Gia tốc góc)
    acc_b = F_sum_b / m - skew_symmetric(state.rates) * state.vel_b;
    rate_dot = invJ * (M_sum_b - skew_symmetric(state.rates) * (J * state.rates));
    
    % 3. Phương trình Động học Quaternion (Tích phân Tư thế)
    % Đạo hàm q_dot = 0.5 * q * (0, omega)
    qw = q(1); qx = q(2); qy = q(3); qz = q(4);
    wx = state.rates(1); wy = state.rates(2); wz = state.rates(3);
    
    qw_dot = 0.5 * (-qx*wx - qy*wy - qz*wz);
    qx_dot = 0.5 * ( qw*wx - qz*wy + qy*wz);
    qy_dot = 0.5 * ( qz*wx + qw*wy - qx*wz);
    qz_dot = 0.5 * (-qy*wx + qx*wy + qw*wz);
    q_dot  = [qw_dot; qx_dot; qy_dot; qz_dot];
    
    % Vận tốc tịnh tiến
    pos_dot = R_be * state.vel_b;
    
    % Pack đạo hàm (Kích thước 13x1)
    dx = [pos_dot; acc_b; q_dot; rate_dot];
end

%% ====== LOCAL FUNCTIONS ======
function R = quat2rotm_local(q)
    % Đảm bảo an toàn không chia cho 0 nếu q bị suy biến
    norm_q = norm(q); if norm_q > 0, q = q / norm_q; end
    qw=q(1); qx=q(2); qy=q(3); qz=q(4);
    
    R = [1 - 2*(qy^2 + qz^2),   2*(qx*qy - qw*qz),     2*(qx*qz + qw*qy);
         2*(qx*qy + qw*qz),     1 - 2*(qx^2 + qz^2),   2*(qy*qz - qw*qx);
         2*(qx*qz - qw*qy),     2*(qy*qz + qw*qx),     1 - 2*(qx^2 + qy^2)];
end

function S = skew_symmetric(v)
    S = [0 -v(3) v(2); v(3) 0 -v(1); -v(2) v(1) 0];
end

function [F_b, M_b] = calculate_actuator_forces(actuators, sys)
    % (Bản copy giữ nguyên 100% logic cập nhật R-CRM của bạn)
    F_b = zeros(3,1); M_b = zeros(3,1);
    r_pivots = sys.geo.r; h_eff = sys.geo.h_eff; c_q = sys.motor.tau;
    eta_c = sys.motor.coax_eff; lam_c = sys.motor.coax_torque_eff; 
    for i = 1:4
        idx_top = sys.motor.top_idx(i); idx_bot = sys.motor.bot_idx(i);
        T_top = actuators.thrust(idx_top); T_bot = actuators.thrust(idx_bot);
        T_i = T_top + T_bot * eta_c;
        M_delta_i = sys.motor.dir_top(i) * c_q * (T_top - lam_c * T_bot);
        
        alpha_phys = actuators.alpha(i) * sys.servo.dir_alpha(i);
        beta_phys  = actuators.beta(i)  * sys.servo.dir_beta(i);
        sa = sin(alpha_phys); ca = cos(alpha_phys); sb = sin(beta_phys); cb = cos(beta_phys);
        
        vec_F_unit = [-sa*cb; sb; -ca*cb]; F_i_local = T_i * vec_F_unit;
        R_servo = [ca, 0, sa; 0, 1, 0; -sa, 0, ca] * [1, 0, 0; 0, cb, -sb; 0, sb, cb];
        r_total = r_pivots(i, :)' + R_servo * [0; 0; -h_eff];
        
        M_force = skew_symmetric(r_total) * F_i_local;
        M_coax_vector = M_delta_i * (-vec_F_unit);
        F_b = F_b + F_i_local; M_b = M_b + M_force + M_coax_vector;
    end
end