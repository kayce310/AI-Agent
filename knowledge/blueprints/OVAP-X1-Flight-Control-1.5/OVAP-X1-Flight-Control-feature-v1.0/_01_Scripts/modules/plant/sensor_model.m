function meas = sensor_model(x_true, use_noise)
% File Name: sensor_model.m
% Position: Root > modules > plant > sensor_model.m
% Description: Adds noise to true states. Use 'USE_NOISE' to toggle instantly.

    % =========================================================================
    % 1. MASTER SWITCH (Biến duy nhất bạn cần chỉnh)
    % =========================================================================
    % [0: TẮT NHIỄU TUYỆT ĐỐI] | [1: BẬT NHIỄU]
    % =========================================================================
    sys.use_noise = use_noise;
    % Cấu hình độ lệch chuẩn (Standard Deviations)
    sigma_pos   = 0.005; % m
    sigma_vel   = 0.01;  % m/s
    sigma_euler = 0.001; % rad
    sigma_gyro  = 0.002; % rad/s
    
    % Tạo vector nhiễu ngẫu nhiên
    raw_noise = [ randn(3,1) * sigma_pos;
                  randn(3,1) * sigma_vel;
                  randn(3,1) * sigma_euler;
                  randn(3,1) * sigma_gyro ];
          
    % Áp dụng Switch: Nếu USE_NOISE = 0, toàn bộ noise sẽ thành 0
    meas = x_true + (raw_noise * sys.use_noise);
end