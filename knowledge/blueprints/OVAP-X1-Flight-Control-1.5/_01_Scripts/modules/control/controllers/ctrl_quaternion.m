function [acc_cmd_earth, F_vec_body, M_body_des, ctrl_state] = ctrl_quaternion(state_est, setpoints, dt, params, ctrl_state)
% File Name: ctrl_quaternion.m
% Description: PX4-Style Native Quaternion Controller (13-State)

    % 1. Lấy dữ liệu 13-State
    pos_curr_earth = state_est(1:3);   
    vel_curr_body  = state_est(4:6);   
    q_curr         = state_est(7:10); % [qw, qx, qy, qz]
    rate_curr      = state_est(11:13);
    
    if isempty(ctrl_state)
        for i=1:3, ctrl_state.vel_pid{i} = struct('integrator', 0, 'prev_error', 0, 'd_filter', 0); end
        for i=1:3, ctrl_state.rate_pid{i} = struct('integrator', 0, 'prev_error', 0, 'd_filter', 0); end
    end

    R_b2e = quat2rotm_local(q_curr); 
    vel_curr_earth = R_b2e * vel_curr_body; 

    % 2. Vòng lặp Vị trí (Không đổi)
    pos_error = setpoints.pos - pos_curr_earth;
    vel_sp = max(min(params.pos_P .* pos_error, params.max_vel), -params.max_vel);
    vel_error = vel_sp - vel_curr_earth; 
    
    acc_cmd_earth = zeros(3,1);
    for i = 1:3
        [acc_cmd_earth(i), ctrl_state.vel_pid{i}] = pid_core(vel_error(i), dt, params.vel_Kp(i), params.vel_Ki(i), params.vel_Kd(i), params.max_acc(i), ctrl_state.vel_pid{i});
    end
    
    g_val = 9.81; if isfield(params, 'g'), g_val = params.g; end
    F_earth_total = params.mass * (acc_cmd_earth - [0; 0; g_val]); 
    F_vec_body = R_b2e' * F_earth_total;

    % 3. Vòng lặp Tư thế Quaternion (PX4 Math)
    % Dịch Setpoint Euler từ Planner sang Quaternion
    q_des = eul2quat_local(setpoints.euler); 
    
    % Tính Quaternion sai số: q_err = q_curr^(-1) * q_des
    q_err = quat_mult_local(quat_inv_local(q_curr), q_des);
    
    % Chọn con đường ngắn nhất (Chống lật lặp vòng)
    if q_err(1) < 0
        q_err = -q_err;
    end
    
    % Trích xuất góc sai số từ vector Quaternion (2 * vec)
    error_att = 2 * q_err(2:4);
    
    rate_sp = params.att_P .* error_att;
    error_rate = rate_sp - rate_curr;
    
    M_body_des = zeros(3,1);
    for i = 1:3
        [M_body_des(i), ctrl_state.rate_pid{i}] = pid_core(error_rate(i), dt, params.rate_Kp(i), params.rate_Ki(i), params.rate_Kd(i), params.max_torque(i), ctrl_state.rate_pid{i});
    end
end

%% ====== LOCAL MATH HELPERS ======
function R = quat2rotm_local(q)
    q = q / norm(q); qw=q(1); qx=q(2); qy=q(3); qz=q(4);
    R = [1-2*(qy^2+qz^2), 2*(qx*qy-qw*qz),   2*(qx*qz+qw*qy);
         2*(qx*qy+qw*qz),   1-2*(qx^2+qz^2), 2*(qy*qz-qw*qx);
         2*(qx*qz-qw*qy),   2*(qy*qz+qw*qx),   1-2*(qx^2+qy^2)];
end

function q = eul2quat_local(e)
    cy = cos(e(3)*0.5); sy = sin(e(3)*0.5);
    cp = cos(e(2)*0.5); sp = sin(e(2)*0.5);
    cr = cos(e(1)*0.5); sr = sin(e(1)*0.5);
    q = [cr*cp*cy + sr*sp*sy; sr*cp*cy - cr*sp*sy; cr*sp*cy + sr*cp*sy; cr*cp*sy - sr*sp*cy];
end

function q_out = quat_mult_local(q1, q2)
    w1=q1(1); x1=q1(2); y1=q1(3); z1=q1(4);
    w2=q2(1); x2=q2(2); y2=q2(3); z2=q2(4);
    q_out = [w1*w2 - x1*x2 - y1*y2 - z1*z2;
             w1*x2 + x1*w2 + y1*z2 - z1*y2;
             w1*y2 - x1*z2 + y1*w2 + z1*x2;
             w1*z2 + x1*y2 - y1*x2 + z1*w2];
end

function q_inv = quat_inv_local(q)
    q_inv = [q(1); -q(2); -q(3); -q(4)] / (norm(q)^2);
end