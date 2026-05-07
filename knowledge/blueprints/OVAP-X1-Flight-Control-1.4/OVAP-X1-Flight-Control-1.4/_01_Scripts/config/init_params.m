function sys = init_params()
% File Name: init_params.m
% Position: Root > config > init_params.m
% Description: Updated parameters matched with OVAP-X1 Hardware Specs 
% (Wheelbase 650mm, 7-inch props, T-Motor F90, 6S 5000mAh).
% Coaxial aerodynamics (h_eff, lambda) and PX4 motor directions integrated.

    % --- 1. Simulation Settings ---
    sys.sim.dt = 0.002;        
    sys.sim.g = 9.81;
    sys.sim.t_end = 50.0;
    
    % --- 2. Khối lượng & Quán tính (Cập nhật theo thực tế) ---
    % Ước tính: Frame 800g + 8xMotor(400g) + Pin 6S 5000(800g) + Servos(400g) + FC/ESC/GPS(200g)
    sys.mass = 2.6; % Tổng khối lượng khoảng 2.6 kg
    
    % Quán tính (Tăng lên do khung 650mm to hơn)
    sys.Ixx = 0.085;  
    sys.Iyy = 0.150;  
    sys.Izz = 0.210;
    sys.J = diag([sys.Ixx, sys.Iyy, sys.Izz]);
    sys.invJ = inv(sys.J);
    
    % =========================================================================
    % 3. BẢNG ÁNH XẠ PHẦN CỨNG (HARDWARE MAPPING TABLE)
    % =========================================================================
    % Cấu hình hình học và chiều cơ khí cho 4 cụm cánh tay đòn (Arms).
    % Chuẩn: PX4 Octo Coax Wide. Bảng này là Single Source of Truth cho toàn hệ thống.
    % Quy ước: 
    % - Chiều Motor (Dir): 1 (CCW), -1 (CW)
    % - Chiều Servo (Dir): 1 (Thuận), -1 (Nghịch - Bù trừ lắp đối xứng gương)
    % ------------------------------------------------------------------------------------------
    % | Arm ID | Pos X(m) | Pos Y(m) | Top Motor | Bot Motor | Top Dir | Alpha Dir | Beta Dir  |
    % ------------------------------------------------------------------------------------------
    sys.hw_map = [
         1,       0.230,     0.230,       1,          6,          1,        1,          1;  % FR (Front-Right)
         2,      -0.230,    -0.230,       3,          8,          1,       -1,         -1;  % RL (Rear-Left)
         3,       0.230,    -0.230,       2,          5,         -1,       -1,         -1;  % FL (Front-Left)
         4,      -0.230,     0.230,       4,          7,         -1,        1,          1   % RR (Rear-Right)
    ];

    % =========================================================================
    % 4. TỰ ĐỘNG TRÍCH XUẤT CẤU HÌNH TỪ BẢNG (AUTO-PARSING)
    % =========================================================================
    % --- 4.1. Hình học (Geometry) ---
    sys.geo.dist_x   = abs(sys.hw_map(1, 2)); 
    sys.geo.dist_y   = abs(sys.hw_map(1, 3)); 
    sys.geo.z_offset = 0.0;
    
    % Vector vị trí ngàm xoay (Khớp tự động từ cột 2 và 3)
    sys.geo.r = [sys.hw_map(:, 2), sys.hw_map(:, 3), zeros(4,1)];
    
    % --- 4.2. Động cơ Đồng trục (Coaxial Motors) ---
    sys.motor.max_thrust = 23.6;     
    sys.motor.min_thrust = 0.0;      
    sys.motor.tau        = 0.03; % Hệ số cản KQ
    
    sys.motor.coax_eff        = 0.85; % Suy giảm lực đẩy
    sys.motor.coax_torque_eff = 0.90; % Suy giảm momen xoắn
    
    sys.geo.h_top =  0.02; 
    sys.geo.h_bot = -0.02; 
    sys.geo.h_eff = (sys.geo.h_top + sys.motor.coax_eff * sys.geo.h_bot) / (1 + sys.motor.coax_eff);
    
    % Trích xuất chỉ số và chiều quay từ Cột 4, 5, 6
    sys.motor.top_idx = sys.hw_map(:, 4);
    sys.motor.bot_idx = sys.hw_map(:, 5);
    sys.motor.dir_top = sys.hw_map(:, 6);
    sys.motor.dir_bot = -sys.hw_map(:, 6); % Động cơ dưới luôn quay ngược động cơ trên
    
    % --- 4.3. Servo ---
    sys.servo.lim_alpha = deg2rad(360); 
    sys.servo.lim_beta  = deg2rad(360); 
    sys.servo.rate_lim  = 15;        
    sys.servo.tau       = 0.015;       
    
    % Trích xuất chiều bẻ Servo từ Cột 7, 8
    sys.servo.dir_alpha = sys.hw_map(:, 7);
    sys.servo.dir_beta  = sys.hw_map(:, 8);
    
    % --- 5. Initial Conditions ---
    sys.init.x = zeros(12, 1);
end