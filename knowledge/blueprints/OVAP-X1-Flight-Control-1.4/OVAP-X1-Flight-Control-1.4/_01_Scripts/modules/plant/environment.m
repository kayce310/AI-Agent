function [F_env_b, M_env_b] = environment(t, state, sys)
% File Name: environment.m
% Position in Structure: Root > plant_model > environment.m
% Brief Function Description: Calculates environmental forces (Gravity, Drag, Wind) in Body Frame.

    % --- 1. Unpack State ---
    % state.vel_b: Vận tốc trong hệ Body (u, v, w)
    % state.euler: Góc Euler (phi, theta, psi)
    vel_b = state.vel_b;
    euler = state.euler;
    
    phi   = euler(1);
    theta = euler(2);
    
    % --- 2. Gravity (Body Frame) ---
    % Chuyển vector trọng lực [0; 0; g] từ hệ NED sang Body
    % R_eb' * [0;0;g]
    g_b = sys.sim.g * [ -sin(theta);
                         cos(theta)*sin(phi);
                         cos(theta)*cos(phi) ];
                     
    F_gravity_b = sys.mass * g_b;
    
    % --- 3. Aerodynamic Drag (Body Frame) ---
    % Giả sử mô hình cản tuyến tính đơn giản: F_drag = -Cd * V
    % Trong thực tế, có thể thay bằng mô hình: F = -0.5 * rho * V^2 * S * Cd
    
    % Hệ số cản (Có thể đưa vào sys.aero nếu cần)
    % Cd_x, Cd_y thấp (ít cản), Cd_z cao (cản lớn khi rơi)
    C_d_coeff = [0.15; 0.15; 0.30]; 
    C_d = diag(C_d_coeff);
    
    % Wind Simulation (Optional)
    % Giả sử có gió thổi theo hướng Bắc (North) 2m/s
    % v_wind_ned = [0; 0; 0]; 
    % Nếu có gió, cần chuyển v_wind sang Body và trừ vào vel_b để ra Airspeed.
    
    F_drag_b = -C_d * vel_b;
    
    % --- 4. Total Environmental Forces ---
    F_env_b = F_gravity_b + F_drag_b;
    
    % Moment do khí động học (Aerodynamic Moments)
    % Tạm thời bỏ qua hoặc thêm damping momen quay
    % M_drag = -C_m * rates
    M_env_b = [0; 0; 0];
end