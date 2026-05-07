function [acc_cmd_earth, F_vec_body, M_body_des, ctrl_state] = ctrl_so3(state_est, setpoints, dt, params, ctrl_state)
% File Name: ctrl_so3.m
% Position: Root > modules > control > controllers > ctrl_so3.m
% Description: PID Controller with SO(3) Error Projection to avoid Gimbal Lock.

    % =====================================================================
    % 1. UNPACK STATES & INITIALIZE (Giống hệt bản PID cũ)
    % =====================================================================
    pos_curr_earth = state_est(1:3);   
    vel_curr_body  = state_est(4:6);   
    euler_curr     = state_est(7:9);   
    rate_curr      = state_est(10:12);
    
    if isempty(ctrl_state)
        for i=1:3, ctrl_state.vel_pid{i} = struct('integrator', 0, 'prev_error', 0, 'd_filter', 0); end
        for i=1:3, ctrl_state.rate_pid{i} = struct('integrator', 0, 'prev_error', 0, 'd_filter', 0); end
    end

    R_b2e = rotation_matrix_local(euler_curr); 
    vel_curr_earth = R_b2e * vel_curr_body; 

    % =====================================================================
    % 2. POSITION CONTROL LOOP (Giống hệt bản PID cũ)
    % =====================================================================
    pos_error = setpoints.pos - pos_curr_earth;
    vel_sp = params.pos_P .* pos_error;
    vel_sp = max(min(vel_sp, params.max_vel), -params.max_vel);
    
    vel_error = vel_sp - vel_curr_earth; 
    acc_cmd_earth = zeros(3,1);
    for i = 1:3
        [acc_cmd_earth(i), ctrl_state.vel_pid{i}] = pid_core(...
            vel_error(i), dt, params.vel_Kp(i), params.vel_Ki(i), params.vel_Kd(i), ...
            params.max_acc(i), ctrl_state.vel_pid{i});
    end
    
    g_val = 9.81; if isfield(params, 'g'), g_val = params.g; end
    F_earth_total = params.mass * (acc_cmd_earth - [0; 0; g_val]); 
    F_vec_body = R_b2e' * F_earth_total;

    % =====================================================================
    % 3. ATTITUDE CONTROL LOOP - PHÉP CHIẾU SO(3) MỚI
    % =====================================================================
    % 3.1. Chuyển đổi Euler sang Ma trận xoay (DCM)
    R_curr = rotation_matrix_local(euler_curr);
    R_des  = rotation_matrix_local(setpoints.euler);
    
    % 3.2. Tính Ma trận sai số tư thế (R_err) trên nhóm SO(3)
    R_err = R_curr' * R_des; 
    
    % 3.3. Trích xuất vector sai số góc (Decoupled Error Vector)
    error_att = zeros(3,1);
    error_att(1) = 0.5 * (R_err(3,2) - R_err(2,3)); % Lỗi Roll
    error_att(2) = 0.5 * (R_err(1,3) - R_err(3,1)); % Lỗi Pitch
    error_att(3) = 0.5 * (R_err(2,1) - R_err(1,2)); % Lỗi Yaw
    
    % 3.4. Trả về góc Radian
    error_att = asin(max(min(error_att, 1), -1));
    
    % 3.5. Luật điều khiển P và PID (Bình thường)
    rate_sp = params.att_P .* error_att;
    error_rate = rate_sp - rate_curr;
    
    M_body_des = zeros(3,1);
    for i = 1:3
        [M_body_des(i), ctrl_state.rate_pid{i}] = pid_core(...
            error_rate(i), dt, params.rate_Kp(i), params.rate_Ki(i), params.rate_Kd(i), ...
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