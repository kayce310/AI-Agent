function [dx, F_b_total, M_b_total] = dynamics_dcm(t, x, actuators, sys)
% File Name: dynamics_dcm.m
% Description: 18-State Rigid Body Dynamics using Direction Cosine Matrix (DCM).
% Không bao giờ bị Gimbal Lock. Không có điểm kỳ dị.

    state.pos   = x(1:3);
    state.vel_b = x(4:6);
    R_eb        = reshape(x(7:15), 3, 3); % Giải nén Ma trận 3x3 từ x_true
    state.rates = x(16:18);
    
    J = sys.J; invJ = sys.invJ; m = sys.mass;
    
    % Tính toán lực Actuator (Hàm nội bộ bên dưới)
    [F_act_b, M_act_b] = calculate_actuator_forces(actuators, sys);
    
    % Gọi Môi trường (Truyền R_eb là ma trận Body->Earth)
    [F_env_b, M_env_b] = environment(t, state, sys, R_eb);
    
    F_sum_b = F_act_b + F_env_b;
    M_sum_b = M_act_b + M_env_b;
    F_b_total = F_sum_b; 
    M_b_total = M_sum_b;
    
    % Động lực học Newton-Euler
    acc_b = F_sum_b / m - skew_symmetric(state.rates) * state.vel_b;
    rate_dot = invJ * (M_sum_b - skew_symmetric(state.rates) * (J * state.rates));
    
    % TÍCH PHÂN TƯ THẾ BẰNG MA TRẬN DCM (Triệt tiêu Gimbal Lock)
    R_dot = R_eb * skew_symmetric(state.rates);
    pos_dot = R_eb * state.vel_b;
    
    dx = [pos_dot; acc_b; R_dot(:); rate_dot];
end

%% ====== LOCAL FUNCTIONS ======
function S = skew_symmetric(v)
    S = [0 -v(3) v(2); v(3) 0 -v(1); -v(2) v(1) 0];
end

function [F_b, M_b] = calculate_actuator_forces(actuators, sys)
    % (Bản copy giữ nguyên logic của bạn từ dynamics_6dof.m)
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
        sa = sin(alpha_phys); ca = cos(alpha_phys);
        sb = sin(beta_phys);  cb = cos(beta_phys);
        
        vec_F_unit = [-sa*cb; sb; -ca*cb];
        F_i_local = T_i * vec_F_unit;
        
        R_servo = [ca, 0, sa; 0, 1, 0; -sa, 0, ca] * [1, 0, 0; 0, cb, -sb; 0, sb, cb];
        r_total = r_pivots(i, :)' + R_servo * [0; 0; -h_eff];
        
        M_force = skew_symmetric(r_total) * F_i_local;
        M_coax_vector = M_delta_i * (-vec_F_unit);
        
        F_b = F_b + F_i_local; M_b = M_b + M_force + M_coax_vector;
    end
end