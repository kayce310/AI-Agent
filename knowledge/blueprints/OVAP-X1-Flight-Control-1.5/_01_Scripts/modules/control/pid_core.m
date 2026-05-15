function [output, pid_state] = pid_core(error, dt, Kp, Ki, Kd, limit, pid_state)
% File Name: pid_core.m
% Position in Structure: Root > modules > control > pid_core.m
% Brief Function Description: Standard PID with Anti-windup and Low-pass Filter on Derivative term.

    % 1. Proportional
    P = Kp * error;
    
    % 2. Integral (with dynamic anti-windup clamping)
    pid_state.integrator = pid_state.integrator + (error * dt);
    
    I_max = limit * 0.5; % Giới hạn I ở mức 50% tổng lực
    % [OPTIMIZED] Dùng saturate
    pid_state.integrator = saturate(pid_state.integrator, -I_max/Ki, I_max/Ki);
    
    I_term = Ki * pid_state.integrator;
    
    % 3. Derivative (WITH LOW PASS FILTER)
    derivative_raw = (error - pid_state.prev_error) / dt;
    
    if ~isfield(pid_state, 'd_filter')
        pid_state.d_filter = 0;
    end
    
    % [OPTIMIZED] Sử dụng module low_pass_filter
    cutoff_freq = 20.0; % Hz (Bộ lọc 20Hz)
    
    [filtered_deriv, pid_state.d_filter] = low_pass_filter(...
        derivative_raw, ...
        dt, ...
        cutoff_freq, ...
        pid_state.d_filter);
        
    D = Kd * filtered_deriv;
    
    % 4. Total Output
    output = P + I_term + D;
    
    % Output Saturation
    output = saturate(output, -limit, limit);
    
    % Update State
    pid_state.prev_error = error;
end