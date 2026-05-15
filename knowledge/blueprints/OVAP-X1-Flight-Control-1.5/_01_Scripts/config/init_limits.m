function limits = init_limits()
% File Name: init_limits.m
% Description: Single Source of Truth cho toàn bộ giới hạn quỹ đạo và bộ điều khiển.

    % --- 1. Giới hạn Tịnh tiến (Translational) ---
    limits.v_max = [10.0; 10.0; 4.0];    % Vận tốc tối đa (m/s)
    limits.a_max = [7.0; 7.0; 2.5];      % Gia tốc tối đa (m/s^2)
    
    % --- 2. Giới hạn Quay (Rotational) ---
    % Tăng giới hạn yaw (Z) cho parametric missions (orbit cần yaw xoay nhanh)
    limits.w_max     = [1.0; 1.0; 2.0];  % Tốc độ góc tối đa (rad/s) - Yaw tăng từ 0.4→2.0
    limits.alpha_max = [0.7; 0.7; 1.0];  % Gia tốc góc tối đa (rad/s^2) - Yaw tăng từ 0.2→1.0
    
    % --- 3. Giới hạn Nỗ lực Điều khiển (Control Effort) ---
    limits.max_torque = [10.0; 10.0; 8.0]; % Mô-men xoắn tối đa PID được phép xuất (N.m)
end