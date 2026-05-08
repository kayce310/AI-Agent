% -------------------------------------------------------------------------
% OVAP-X1: Full Mission Simulation & Benchmarking Dashboard
% File Name: main_sim.m
% Position: Root > main_sim.m
% Description: Multi-config Automated Testing + 3D Visualizer + Open/Static Modes
% -------------------------------------------------------------------------
clear; clc; close all;

addpath(genpath('config'));
addpath(genpath('modules'));     
addpath(genpath('utils'));       

fprintf('======================================================\n');
fprintf('  OVAP-X1: MULTI-CONFIG BENCHMARKING & VISUALIZATION\n');
fprintf('======================================================\n');

% =========================================================================
% 1. MASTER CONTROL PANEL (BẢNG ĐIỀU KHIỂN TRUNG TÂM)
% =========================================================================

% --- A. CHỌN MÔI TRƯỜNG THỬ NGHIỆM ---
% 1: Bay tự động hoàn toàn (Closed-Loop Flight Mode)
% 2: Kiểm chứng Vật lý Vòng hở (Open-Loop Dynamics Test) - Ép Servo tự múa
% 3: Bàn thử nghiệm tĩnh (Static Testbed) - Ép UAV đứng im, test ma trận trộn
SIM_MODE = 1; 

% --- B. CHỌN CHẾ ĐỘ TẠO QUỸ ĐẠO (Dành cho SIM_MODE = 1) ---
% 0: Hàm nấc (Step Response) - Bật mode này để Tune độ vọt lố PID
% 1: Quỹ đạo mượt (Smooth Trajectory) - Bật mode này để bay thực tế
PLANNER_MODE = 1; 

% --- C. CHỌN QUỸ ĐẠO NHIỆM VỤ (MISSION TYPE) ---
% 0: Waypoint tĩnh (Giữ nguyên cấu hình cũ)
% 1: QUỸ ĐẠO MẮT BÃO (ORBIT WITH CENTER-FOCUS YAW) - Spiral Ascent
% 2: CUA NGANG (STRAFING / CRAB WALK)
% 3: BAY THẲNG + ROLL DAO ĐỘNG (±90 DEG)
% 4: LƯỢN SÓNG 3D (3D CORKSCREW / HELIX WAVE)
MISSION_TYPE = 1;  

% Tùy chỉnh thông số quỹ đạo
mission_params.v_forward = 2.0;  % Vận tốc tiến (m/s)
mission_params.radius    = 5.0;  % Biên độ (m)
mission_params.omega     = 0.4;  % Tần số góc (rad/s)
mission_params.z_base    = -5.0; % Độ cao (m)

% --- D. CẤU HÌNH XUẤT HÌNH ẢNH 3D DIGITAL TWIN ---
% 0: Tắt 3D.  
% 1: Xem 3D của cấu hình Test số 1 (Analytical). 
% 2: Xem 3D của cấu hình Test số 2 (WPIN).
VISUALIZE_TEST_IDX = 1; 

% --- E. CẤU HÌNH MÔI TRƯỜNG ---
% [0: TẮT NHIỄU TUYỆT ĐỐI] | [1: BẬT NHIỄU]
USE_NOISE = 0; 

% --- F. DANH SÁCH CÁC CẤU HÌNH SO SÁNH (A/B TESTING) ---
active_tests = {
    struct('name', 'PID + Analytical', 'controller', 'pid', 'allocator', 'analytical');
    % struct('name', 'PID + WPIN',        'controller', 'pid', 'allocator', 'wpin');
};

% =========================================================================
% 2. KHỞI TẠO HỆ THỐNG
% =========================================================================
sys         = init_params();  
dt          = sys.sim.dt; 
traj_limits = init_limits();
all_params  = controller_params(sys, traj_limits);

num_tests = length(active_tests);
histories = cell(1, num_tests);

% =========================================================================
% 3. VÒNG LẶP BENCHMARK TỰ ĐỘNG
% =========================================================================
for i_test = 1:num_tests
    current_config = active_tests{i_test};
    fprintf('\n---> Đang chạy Test %d/%d: [%s]...\n', i_test, num_tests, current_config.name);
    
    % Nạp đúng bộ thông số (Gain Tuning)
    if strcmp(current_config.allocator, 'analytical')
        active_params = all_params.pid_analytical;
    else
        active_params = all_params.pid_wpin;
    end

    % Reset Trạng thái hệ thống
    N_steps = floor(sys.sim.t_end / dt) + 1;
    x_true  = zeros(12, 1); 
    
    act_phys.thrust = zeros(8,1); act_phys.alpha = zeros(4,1); act_phys.beta = zeros(4,1);
    act_cmd         = act_phys;
    
    ctrl_state = []; 
    % traj_state.pos = x_true(1:3); traj_state.vel = x_true(4:6);
    % traj_state.euler = x_true(7:9); traj_state.rate = x_true(10:12);
    traj_state = [];
    
    hist = data_logger('init', N_steps, x_true);
    
    % --- VÒNG LẶP THỜI GIAN (FLIGHT LOOP) ---
    t = 0;
    for k = 1:N_steps
        state_est = sensor_model(x_true, USE_NOISE);
        
        if SIM_MODE == 1
            % =============================================================
            % [MODE 1] BAY TỰ ĐỘNG (CLOSED-LOOP)
            % =============================================================
            raw_target = mission_manager(t, MISSION_TYPE, mission_params);
            [setpoints, traj_state] = trajectory_planner(raw_target, dt, traj_limits, traj_state, PLANNER_MODE, sys);
            [act_cmd, ctrl_state] = flight_main(state_est, setpoints, sys, ctrl_state, active_params, current_config, act_phys);
            
        elseif SIM_MODE == 2
            % =============================================================
            % [MODE 2] VÒNG HỞ (OPEN-LOOP TEST) - ÉP SERVO MÚA TỰ DO
            % =============================================================
            % Ép motor duy trì lực nâng bằng trọng lượng
            hover_thrust_per_motor = (sys.mass * sys.sim.g) / 8;
            act_cmd.thrust = zeros(8,1) + hover_thrust_per_motor;
            
            % Cho 4 ngàm Alpha quét một góc sin +-30 độ để quan sát
            act_cmd.alpha = zeros(4,1) + deg2rad(30) * sin(2*pi*0.5*t); 
            act_cmd.beta  = zeros(4,1); 
            
        elseif SIM_MODE == 3
            % =============================================================
            % [MODE 3] BÀN THỬ NGHIỆM TĨNH (STATIC TESTBED)
            % =============================================================
            % Bơm thẳng lệnh mong muốn (VD: Đòi Lực nâng + Mô-men Yaw = 2.0 N.m)
            tau_des = [0; 0; -sys.mass*sys.sim.g; 0; 0; 2.0];
            
            % Lấy tín hiệu tĩnh
            acc_cmd_earth = [0; 0; 0];
            M_body_des    = tau_des(4:6);
            euler_curr    = zeros(3,1);
            
            % Thử nghiệm Allocator đang chọn
            if strcmp(current_config.allocator, 'analytical')
                [act_cmd.thrust, act_cmd.alpha, act_cmd.beta] = alloc_analytical(acc_cmd_earth, M_body_des, euler_curr, sys, act_phys);
            else
                [act_cmd.thrust, act_cmd.alpha, act_cmd.beta] = alloc_wpin(tau_des, sys, act_phys);
            end
            
            x_true = zeros(12,1); % Ép chặt khung máy bay xuống bàn
        end
        
        % Động lực học Cơ cấu chấp hành
        act_phys = actuator_dynamics(act_cmd, act_phys, sys);
        
        % Tích phân Vật lý (Chỉ chạy nếu không bị ép trên Bàn tĩnh)
        if SIM_MODE ~= 3
            [k1,~,~] = dynamics_6dof(t,          x_true,            act_phys, sys);
            [k2,~,~] = dynamics_6dof(t+0.5*dt, x_true + 0.5*dt*k1, act_phys, sys);
            [k3,~,~] = dynamics_6dof(t+0.5*dt, x_true + 0.5*dt*k2, act_phys, sys);
            [k4,~,~] = dynamics_6dof(t+dt,     x_true + dt*k3,     act_phys, sys);
            x_true = x_true + (dt/6)*(k1 + 2*k2 + 2*k3 + k4);
        end
        
        hist = data_logger('log', k, x_true, act_phys, act_cmd, setpoints, hist);
        t = t + dt;
    end
    histories{i_test} = hist;
    fprintf('     Hoàn tất.\n');
end

fprintf('\n======================================================\n');
fprintf('ĐANG KẾT XUẤT KẾT QUẢ...\n');

% 1. XUẤT BIỂU ĐỒ SO SÁNH (OVERLAY PLOTS)
data_logger('plot_multi', histories, sys, active_tests, {'pos', 'att', 'act'});

% 2. XUẤT MÔ HÌNH 3D DIGITAL TWIN (BẬT LẠI THEO YÊU CẦU CỦA BẠN)
if VISUALIZE_TEST_IDX > 0 && VISUALIZE_TEST_IDX <= num_tests
    fprintf('Đang khởi động 3D Digital Twin cho [%s]...\n', active_tests{VISUALIZE_TEST_IDX}.name);
    t_arr = (0:N_steps-1)*dt;
    visualize_3d(histories{VISUALIZE_TEST_IDX}, sys, t_arr);
end