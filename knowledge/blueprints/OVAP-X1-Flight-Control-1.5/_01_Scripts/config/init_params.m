function sys = init_params()
% File Name: init_params.m
% Position: Root > config > init_params.m
% Description: Updated parameters matched with OVAP-X1 Hardware Specs.
% [V2.6 UPGRADE]: Centralized ALL environmental and aerodynamic coefficients.

    % --- 1. Simulation Settings ---
    sys.sim.dt = 0.002;        
    sys.sim.g = 9.81;
    sys.sim.t_end = 30.0;
    
    % --- 2. Khối lượng & Quán tính ---
    sys.mass = 2.6; % kg
    sys.Ixx = 0.085; sys.Iyy = 0.150; sys.Izz = 0.210;
    sys.J = diag([sys.Ixx, sys.Iyy, sys.Izz]);
    sys.invJ = inv(sys.J);
    
    % =========================================================================
    % 3. MÔI TRƯỜNG & KHÍ ĐỘNG HỌC (CHUYỂN TỪ ENVIRONMENT.M)
    % =========================================================================
    % Hệ số lực cản không khí tĩnh (Aerodynamic Drag) - Cd_z cao hơn khi rơi
    sys.aero.C_d_coeff = [0.15; 0.15; 0.30]; 
    sys.aero.C_d_matrix = diag(sys.aero.C_d_coeff);
    
    % Hệ số momen cản (Ma sát xoay Damping) - Giúp chống xoay lộn vòng
    sys.aero.C_m_coeff = [0.05; 0.05; 0.10]; 
    sys.aero.C_m_matrix = diag(sys.aero.C_m_coeff);
    
    % Gió môi trường (NED Frame)
    sys.env.wind_ned = [0; 0; 0]; % m/s
    
    % =========================================================================
    % 4. BẢNG ÁNH XẠ PHẦN CỨNG (HARDWARE MAPPING TABLE)
    % =========================================================================
    sys.hw_map = [
         1,       0.230,     0.230,       1,          6,          1,        1,          1;  % FR
         2,      -0.230,    -0.230,       3,          8,          1,       -1,         -1;  % RL
         3,       0.230,    -0.230,       2,          5,         -1,       -1,         -1;  % FL
         4,      -0.230,     0.230,       4,          7,         -1,        1,          1   % RR
    ];
    
    % --- 4.1. Hình học (Geometry) ---
    sys.geo.dist_x = abs(sys.hw_map(1, 2)); 
    sys.geo.dist_y = abs(sys.hw_map(1, 3)); 
    sys.geo.r = [sys.hw_map(:, 2), sys.hw_map(:, 3), zeros(4,1)];
    
    % --- 4.2. Động cơ (Coaxial Motors) ---
    sys.motor.max_thrust = 23.6;     
    sys.motor.min_thrust = 0.0;      
    sys.motor.tau        = 0.03; % Hệ số lực đẩy/momen (Cq/Ct)
    
    sys.motor.coax_eff        = 0.85; 
    sys.motor.coax_torque_eff = 0.90; 
    
    % [CẬP NHẬT TỪ ACTUATOR_DYNAMICS]: Độ trễ đáp ứng Motor (First-order lag)
    sys.motor.time_constant = 0.02; % Giây (Thời gian để đạt 63% lực đẩy)
    
    sys.geo.h_top =  0.02; sys.geo.h_bot = -0.02; 
    sys.geo.h_eff = (sys.geo.h_top + sys.motor.coax_eff * sys.geo.h_bot) / (1 + sys.motor.coax_eff);
    
    sys.motor.top_idx = sys.hw_map(:, 4);
    sys.motor.bot_idx = sys.hw_map(:, 5);
    sys.motor.dir_top = sys.hw_map(:, 6);
    sys.motor.dir_bot = -sys.hw_map(:, 6); 
    
    % --- 4.3. Servo ---
    sys.servo.lim_alpha = deg2rad(360); 
    sys.servo.lim_beta  = deg2rad(360); 
    sys.servo.rate_lim  = 15; % rad/s      
    sys.servo.tau       = 0.015; % Tốc độ đáp ứng Servo (Giây)     
    
    sys.servo.dir_alpha = sys.hw_map(:, 7);
    sys.servo.dir_beta  = sys.hw_map(:, 8);
    
    % --- 5. Initial Conditions ---
    sys.init.x = zeros(12, 1);
end