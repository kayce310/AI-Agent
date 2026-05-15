function [M_cmd, internal_state] = attitude_ctrl(euler_sp, euler_meas, rate_meas, dt, params, internal_state)
% File Name: attitude_ctrl.m
% Position: Root > modules > control > attitude_ctrl.m
% Description: Cascaded Attitude Controller (Angle P -> Rate PID). 
%              Strictly outputs Moments (Mx, My, Mz) for Decoupled 6-DOF.

    % --- 1. Outer Loop: Angle Control (P Controller) ---
    error_att = euler_sp - euler_meas;
    
    % [BỔ SUNG AN TOÀN] Xử lý góc Yaw (-pi to pi wrapping)
    % Đảm bảo máy bay luôn xoay Yaw theo đường ngắn nhất
    error_att(3) = atan2(sin(error_att(3)), cos(error_att(3)));
    
    rate_sp = params.att_P .* error_att;
    
    % --- 2. Inner Loop: Rate Control (PID Controller) ---
    error_rate = rate_sp - rate_meas;
    
    M_cmd = zeros(3,1);
    
    % Loop for Roll(1), Pitch(2), Yaw(3)
    for i = 1:3
        [M_cmd(i), internal_state.rate_pid{i}] = pid_core(...
            error_rate(i), ...
            dt, ...
            params.rate_Kp(i), ...
            params.rate_Ki(i), ...
            params.rate_Kd(i), ...
            params.max_torque(i), ...
            internal_state.rate_pid{i});
    end
end