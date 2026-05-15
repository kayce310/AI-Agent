% =========================================================================
% FILE: debug_tilt_rotor.m
% MÔ TẢ: Debug luồng tín hiệu từ PID đến lệnh Servo vật lý
% =========================================================================
clc; clear;

fprintf('======================================================\n');
fprintf('  DEBUG HỆ TỌA ĐỘ FRD VÀ LUỒNG TÍN HIỆU TOÀN DIỆN\n');
fprintf('======================================================\n\n');

% ---------------------------------------------------------
% 1. KHỞI TẠO THAM SỐ (Mô phỏng sys struct)
% ---------------------------------------------------------
sys.mass = 2.6;
sys.sim.g = 9.81;
% Bảng MAP CHUẨN FRD: 1=FR, 2=RL, 3=FL, 4=RR
sys.hw_map = [
     1,  0.23,  0.23, 1, 6,  1,  1,  1; 
     2, -0.23, -0.23, 2, 5,  1, -1, -1; 
     3,  0.23, -0.23, 3, 8, -1, -1, -1; 
     4, -0.23,  0.23, 4, 7, -1,  1,  1
];
sys.servo.dir_alpha = sys.hw_map(:,7);
sys.servo.dir_beta  = sys.hw_map(:,8);

params.mass = sys.mass;
params.pos_P = [1; 1; 1];
params.vel_Kp = [2; 2; 2];  % P-gain cho Vận tốc

% ---------------------------------------------------------
% 2. THIẾT LẬP KỊCH BẢN TEST (Scenario)
% ---------------------------------------------------------
state_est = zeros(12,1);
% Đặt Yaw = 90 độ (pi/2). Trục X thân máy bay đang quay về hướng Đông (+Y thế giới)
state_est(7:9) = [0; 0; deg2rad(90)]; 

setpoints.pos = [1; 0; 0]; % PID muốn bay về hướng Bắc (+X thế giới)
setpoints.euler = [0; 0; deg2rad(90)]; % Giữ nguyên Yaw
dt = 0.01;

fprintf('[THÔNG TIN KỊCH BẢN]\n');
fprintf('- Vị trí hiện tại: [0, 0, 0]\n');
fprintf('- Vị trí Setpoint: [1, 0, 0] (Muốn tiến về Bắc)\n');
fprintf('- Góc Yaw hiện tại: 90 độ (Mũi máy bay đang nhìn về Đông)\n\n');

% ---------------------------------------------------------
% 3. CHẠY MÔ PHỎNG LỚP PID
% ---------------------------------------------------------
pos_error = setpoints.pos - state_est(1:3);
vel_sp = params.pos_P .* pos_error;
vel_error = vel_sp - state_est(4:6); 
acc_cmd_earth = params.vel_Kp .* vel_error; % Gia tốc mong muốn hệ Earth

fprintf('[STEP 1: ĐẦU RA BỘ PID]\n');
fprintf('Sai số vị trí (pos_error)   = [%.3f, %.3f, %.3f] m\n', pos_error);
fprintf('Gia tốc yêu cầu (acc_earth) = [%.3f, %.3f, %.3f] m/s^2\n', acc_cmd_earth);
fprintf('=> PID yêu cầu gia tốc dương trên trục +X. (ĐÚNG LOGIC)\n\n');

% ---------------------------------------------------------
% 4. CHẠY MÔ PHỎNG LỚP ALLOCATOR (Khâu xoay tọa độ)
% ---------------------------------------------------------
ax_world = acc_cmd_earth(1);
ay_world = acc_cmd_earth(2);
yaw = state_est(9);

ax_heading = ax_world * cos(yaw) + ay_world * sin(yaw);
ay_heading = -ax_world * sin(yaw) + ay_world * cos(yaw);

fprintf('[STEP 2: BIẾN ĐỔI HỆ TỌA ĐỘ HEADING]\n');
fprintf('ax_heading = %.3f\n', ax_heading);
fprintf('ay_heading = %.3f\n', ay_heading);
fprintf('=> Giải thích: Máy bay quay mặt sang Đông, muốn đi về Bắc thì Bắc nằm bên TRÁI máy bay (-Y).\n');
fprintf('=> ay_heading BẮT BUỘC phải là số ÂM. Kết quả là %.3f. (ĐÚNG TOÁN HỌC!)\n\n', ay_heading);

% ---------------------------------------------------------
% 5. TÍNH GÓC TOÁN HỌC & ÁNH XẠ VẬT LÝ
% ---------------------------------------------------------
ratio_x = ax_heading / sys.sim.g;
ratio_y = ay_heading / sys.sim.g;

% [Mã chuẩn Scripts: -asin, +asin]
alpha_base = -asin(ratio_x); 
beta_base  =  asin(ratio_y); 

cmd_alpha = alpha_base .* sys.servo.dir_alpha;
cmd_beta  = beta_base  .* sys.servo.dir_beta;

fprintf('[STEP 3: LỆNH GÓC TOÁN HỌC]\n');
fprintf('alpha_base_math = %.2f deg (Phải xấp xỉ 0 vì ax_heading = 0)\n', rad2deg(alpha_base));
fprintf('beta_base_math  = %.2f deg (Phải mang dấu ÂM để bay sang trái)\n\n', rad2deg(beta_base));

fprintf('[STEP 4: LỆNH VẬT LÝ SAU KHI NHÂN DIR_MAP]\n');
fprintf('Mảng dir_beta đang dùng   = [%d, %d, %d, %d]\n', sys.servo.dir_beta);
fprintf('Lệnh gửi Simscape (cmd_beta) = [%.2f, %.2f, %.2f, %.2f] deg\n\n', rad2deg(cmd_beta(1)), rad2deg(cmd_beta(2)), rad2deg(cmd_beta(3)), rad2deg(cmd_beta(4)));

% ---------------------------------------------------------
% 6. ĐỐI CHIẾU LẠI QUY TẮC BÀN TAY PHẢI CỦA BẠN
% ---------------------------------------------------------
fprintf('[STEP 5: KIỂM CHỨNG VẬT LÝ TẠI NHÁNH 1 VÀ 2]\n');
fprintf('=> Lệnh Vật lý Beta 1 = %.2f độ.\n', rad2deg(cmd_beta(1)));
fprintf('   Trục Servo Beta 1 là +X. Góc âm bẻ động cơ xoay quanh +X một góc âm (Đẩy lực sang Phải).\n');
fprintf('   Phản lực đẩy máy bay sang TRÁI (-Y). ĐÚNG YÊU CẦU!\n');

fprintf('=> Lệnh Vật lý Beta 2 = %.2f độ.\n', rad2deg(cmd_beta(2)));
fprintf('   Trục Servo Beta 2 là -X. Góc dương bẻ động cơ xoay quanh -X một góc dương (Đẩy lực sang Phải).\n');
fprintf('   Phản lực đẩy máy bay sang TRÁI (-Y). ĐÚNG YÊU CẦU!\n');
fprintf('======================================================\n');