function [F_vec_body, internal_state] = position_ctrl(pos_sp, pos_meas, vel_meas, euler_curr, dt, params, internal_state)
% File Name: position_ctrl.m
% Position: Root > modules > control > position_ctrl.m
% Description: Decoupled Position Controller for 6-DOF UAV.

    % --- 1. Outer Loop: Position P-Controller ---
    pos_error = pos_sp - pos_meas;
    vel_sp = params.pos_P .* pos_error;
    
    % Velocity Limit
    % [SỬA LỖI] Velocity Limit (Component-wise Saturation)
    % Giới hạn độc lập vận tốc từng trục X, Y, Z để tương thích mảng 3x1
    vel_sp = max(min(vel_sp, params.max_vel), -params.max_vel);
    
    % --- 2. Inner Loop: Velocity PID-Controller ---
    % Cả vel_sp và vel_meas đều ở hệ Earth -> Sai số đúng hướng
    vel_error = vel_sp - vel_meas; 
    acc_cmd_earth = zeros(3,1);
    
    for i = 1:3
        [acc_cmd_earth(i), internal_state.vel_pid{i}] = pid_core(...
            vel_error(i), dt, ...
            params.vel_Kp(i), params.vel_Ki(i), params.vel_Kd(i), ...
            params.max_acc(i), internal_state.vel_pid{i});
    end
    
    % --- 3. Gravity Compensation (Earth Frame) ---
    % Lấy g từ tham số hệ thống thay vì hardcode 9.81
    g_val = 9.81;
    if isfield(params, 'g'), g_val = params.g; end
    
    g_vec = [0; 0; g_val];
    F_earth_total = params.mass * (acc_cmd_earth - g_vec); 
    
    % --- 4. Coordinate Transformation (Earth -> Body) ---
    % Chiếu lực cần thiết lên hệ trục Thân để ép Servo nghiêng
    R_b2e = rotation_matrix_local(euler_curr); 
    R_e2b = R_b2e'; 
    
    F_vec_body = R_e2b * F_earth_total;
end

%% ================= LOCAL FUNCTIONS =================
function R = rotation_matrix_local(e)
    ph = e(1); th = e(2); ps = e(3);
    R = [cos(th)*cos(ps), sin(ph)*sin(th)*cos(ps)-cos(ph)*sin(ps), cos(ph)*sin(th)*cos(ps)+sin(ph)*sin(ps);
         cos(th)*sin(ps), sin(ph)*sin(th)*sin(ps)+cos(ph)*cos(ps), cos(ph)*sin(th)*sin(ps)-sin(ph)*cos(ps);
        -sin(th),         sin(ph)*cos(th),                         cos(ph)*cos(th)];
end