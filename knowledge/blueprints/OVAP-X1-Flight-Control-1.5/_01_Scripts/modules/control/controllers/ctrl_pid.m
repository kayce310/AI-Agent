function [acc_cmd_earth, F_vec_body, M_body_des, ctrl_state] = ctrl_pid(state_est, setpoints, dt, params, ctrl_state)
% File Name: ctrl_pid.m
% Position: Root > modules > control > controllers > ctrl_pid.m
% Description: Unified Cascade PID Controller for both Position & Attitude.
% Output: Standardized signals ready for ANY Allocator.

    % =====================================================================
    % 1. UNPACK STATES & INITIALIZE
    % =====================================================================
    pos_curr_earth = state_est(1:3);   
    vel_curr_body  = state_est(4:6);   
    euler_curr     = state_est(7:9);   
    rate_curr      = state_est(10:12);
    
    % Khởi tạo bộ nhớ PID nếu là vòng lặp đầu tiên
    if isempty(ctrl_state)
        for i=1:3, ctrl_state.vel_pid{i} = struct('integrator', 0, 'prev_error', 0, 'd_filter', 0); end
        for i=1:3, ctrl_state.rate_pid{i} = struct('integrator', 0, 'prev_error', 0, 'd_filter', 0); end
    end

    % Chuyển đổi vận tốc Body -> Earth (Quan trọng cho Position PID)
    R_b2e = rotation_matrix_local(euler_curr); 
    vel_curr_earth = R_b2e * vel_curr_body; 

    % =====================================================================
    % 2. POSITION CONTROL LOOP (Translational Dynamics)
    % =====================================================================
    pos_error = setpoints.pos - pos_curr_earth;
    vel_sp = params.pos_P .* pos_error;
    
    % Giới hạn vận tốc tịnh tiến độc lập từng trục
    vel_sp = max(min(vel_sp, params.max_vel), -params.max_vel);
    
    vel_error = vel_sp - vel_curr_earth; 
    acc_cmd_earth = zeros(3,1);
    
    for i = 1:3
        [acc_cmd_earth(i), ctrl_state.vel_pid{i}] = pid_core(...
            vel_error(i), dt, ...
            params.vel_Kp(i), params.vel_Ki(i), params.vel_Kd(i), ...
            params.max_acc(i), ctrl_state.vel_pid{i});
    end
    
    % Bù trọng lực
    g_val = 9.81;
    if isfield(params, 'g'), g_val = params.g; end
    g_vec = [0; 0; g_val];
    
    % [ĐẦU RA 1]: Gia tốc hệ Earth (Dùng cho Analytical Mixer)
    % acc_cmd_earth đã được tính ở vòng lặp trên
    
    % [ĐẦU RA 2]: Lực hệ Body (Dùng cho WPIN)
    F_earth_total = params.mass * (acc_cmd_earth - g_vec); 
    F_vec_body = R_b2e' * F_earth_total;

    % =====================================================================
    % 3. ATTITUDE CONTROL LOOP (Rotational Dynamics)
    % =====================================================================
    error_att = setpoints.euler - euler_curr;
    
    % Xử lý góc Yaw (-pi to pi wrapping) để xoay đường ngắn nhất
    error_att(3) = atan2(sin(error_att(3)), cos(error_att(3)));
    
    rate_sp = params.att_P .* error_att;
    error_rate = rate_sp - rate_curr;
    
    % [ĐẦU RA 3]: Mô-men xoắn yêu cầu hệ Body (Dùng cho mọi Mixer)
    M_body_des = zeros(3,1);
    for i = 1:3
        [M_body_des(i), ctrl_state.rate_pid{i}] = pid_core(...
            error_rate(i), dt, ...
            params.rate_Kp(i), params.rate_Ki(i), params.rate_Kd(i), ...
            params.max_torque(i), ctrl_state.rate_pid{i});
    end
end

%% ================= LOCAL FUNCTIONS =================
function R = rotation_matrix_local(e)
    ph = e(1); th = e(2); ps = e(3);
    R = [cos(th)*cos(ps), sin(ph)*sin(th)*cos(ps)-cos(ph)*sin(ps), cos(ph)*sin(th)*cos(ps)+sin(ph)*sin(ps);
         cos(th)*sin(ps), sin(ph)*sin(th)*sin(ps)+cos(ph)*cos(ps), cos(ph)*sin(th)*sin(ps)-sin(ph)*cos(ps);
        -sin(th),         sin(ph)*cos(th),                         cos(ph)*cos(th)];
end