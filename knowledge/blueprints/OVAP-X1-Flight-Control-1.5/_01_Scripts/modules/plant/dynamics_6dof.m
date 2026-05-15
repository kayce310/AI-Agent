function [dx, F_b_total, M_b_total] = dynamics_6dof(t, x, actuators, sys)
% File Name: dynamics_6dof.m
% Position: Root > modules > plant > dynamics_6dof.m
% Description: Rigid Body Dynamics with Propeller Offset Logic & Coaxial Aerodynamics (R-CRM).

    % ... (Phần 1: Unpack State) ...
    state.pos   = x(1:3);
    state.vel_b = x(4:6);
    state.euler = x(7:9);
    state.rates = x(10:12);
    
    J    = sys.J;
    invJ = sys.invJ;
    m    = sys.mass;
    
    % Tính toán lực và momen
    % Tính toán lực Actuator
    [F_act_b, M_act_b] = calculate_actuator_forces(actuators, sys);
    
    % [SỬA LỖI]: Tính R_eb trước khi nạp vào environment
    R_eb = rotation_matrix_body2earth(state.euler); 
    
    % Gọi Môi trường
    [F_env_b, M_env_b] = environment(t, state, sys, R_eb);
    
    F_sum_b = F_act_b + F_env_b;
    M_sum_b = M_act_b + M_env_b;
    F_b_total = F_sum_b; 
    M_b_total = M_sum_b;
    
    % Phương trình động lực học Newton-Euler
    acc_b = F_sum_b / m - skew_symmetric(state.rates) * state.vel_b;
    rate_dot = invJ * (M_sum_b - skew_symmetric(state.rates) * (J * state.rates));
    
    % Kinematics & Navigation
    phi = state.euler(1); theta = state.euler(2);
    ct = cos(theta); if abs(ct)<0.01, ct=0.01; end
    tt = sin(theta)/ct; 
    phi_dot   = state.rates(1) + (state.rates(2)*sin(phi) + state.rates(3)*cos(phi)) * tt;
    theta_dot = state.rates(2)*cos(phi) - state.rates(3)*sin(phi);
    psi_dot   = (state.rates(2)*sin(phi) + state.rates(3)*cos(phi)) / ct;
    
    R_eb = rotation_matrix_body2earth(state.euler); 
    pos_dot = R_eb * state.vel_b;
    
    dx = [pos_dot; acc_b; phi_dot; theta_dot; psi_dot; rate_dot];
end

% --- Helper Function: Actuator Physics ---
function [F_b, M_b] = calculate_actuator_forces(actuators, sys)
    F_b = zeros(3,1);
    M_b = zeros(3,1);
    r_pivots = sys.geo.r; 
    
    h_eff = sys.geo.h_eff; 
    c_q   = sys.motor.tau; % Hệ số momen phản lực (Torque/Thrust ratio)
    
    % [CẬP NHẬT R-CRM]: Lấy 2 hệ số suy giảm khí động học từ init_params
    eta_c = sys.motor.coax_eff;        % Suy giảm lực đẩy
    lam_c = sys.motor.coax_torque_eff; % Suy giảm momen xoắn
    
    for i = 1:4
       % [CẬP NHẬT ĐỒNG BỘ]: Trích xuất ID động cơ từ hệ thống
        idx_top = sys.motor.top_idx(i);
        idx_bot = sys.motor.bot_idx(i);
        
        T_top = actuators.thrust(idx_top);
        T_bot = actuators.thrust(idx_bot);
        
        % Tính tổng lực (Đã bao gồm suy hao đồng trục)
        T_i = T_top + T_bot * sys.motor.coax_eff;
        
        % 2. Momen Yaw nội tại (Có tính chiều quay dir_top và suy hao momen lam_c)
        M_delta_i = sys.motor.dir_top(i) * c_q * (T_top - lam_c * T_bot);
        
        alpha_phys = actuators.alpha(i) * sys.servo.dir_alpha(i);
        beta_phys  = actuators.beta(i)  * sys.servo.dir_beta(i);
        
        sa = sin(alpha_phys); ca = cos(alpha_phys);
        sb = sin(beta_phys);  cb = cos(beta_phys);
        
        % Vector định hướng lực đẩy (Hướng lên trên so với Drone)
        vec_F_unit = [ -sa * cb; sb; -ca * cb ];
        F_i_local = T_i * vec_F_unit;
        
        % Tính điểm đặt lực thực tế
        R_alpha = [ca, 0, sa; 0, 1, 0; -sa, 0, ca];
        R_beta  = [1, 0, 0; 0, cb, -sb; 0, sb, cb];
        R_servo = R_alpha * R_beta;
        
        r_offset = R_servo * [0; 0; -h_eff];
        r_total = r_pivots(i, :)' + r_offset;
        
        % 3. Momen từ cánh tay đòn (r x F)
        M_force = skew_symmetric(r_total) * F_i_local;
        
        % 4. Momen nội tại chiếu theo trục nghiêng của motor
        % Do thrust hướng lên, trục motor hướng xuống nên lấy (-vec_F_unit)
        M_coax_vector = M_delta_i * (-vec_F_unit);
        
        % Tổng hợp lại
        F_b = F_b + F_i_local;
        M_b = M_b + M_force + M_coax_vector;
    end
end

% --- Các hàm hỗ trợ ---
function S = skew_symmetric(v)
    S = [  0,   -v(3),  v(2);
         v(3),   0,    -v(1);
        -v(2),  v(1),   0   ];
end

function R = rotation_matrix_body2earth(e)
    ph = e(1); th = e(2); ps = e(3);
    R = [cos(th)*cos(ps), sin(ph)*sin(th)*cos(ps)-cos(ph)*sin(ps), cos(ph)*sin(th)*cos(ps)+sin(ph)*sin(ps);
         cos(th)*sin(ps), sin(ph)*sin(th)*sin(ps)+cos(ph)*cos(ps), cos(ph)*sin(th)*sin(ps)-sin(ph)*cos(ps);
        -sin(th),         sin(ph)*cos(th),                         cos(ph)*cos(th)];
end
