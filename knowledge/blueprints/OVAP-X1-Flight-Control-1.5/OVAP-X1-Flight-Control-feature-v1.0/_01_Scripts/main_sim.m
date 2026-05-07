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
% 1: QUỸ ĐẠO MẮT BÃO (ORBIT WITH CENTER-FOCUS YAW)
% 2: CUA NGANG (STRAFING / CRAB WALK)
% 3: BAY THẲNG + ROLL DAO ĐỘNG (±90 DEG)
MISSION_TYPE = 0; 

% Tùy chỉnh thông số quỹ đạo
mission_params.v_forward = 5.0;  % Vận tốc tiến (m/s)
mission_params.radius    = 5.0;  % Biên độ (m)
mission_params.omega     = 0.5;  % Tần số góc (rad/s)
mission_params.z_base    = -5.0;% Độ cao (m)


% --- D. CẤU HÌNH XUẤT HÌNH ẢNH 3D DIGITAL TWIN ---
% 0: Tắt 3D.  
% 1: Xem 3D của cấu hình Test số 1. 
% 2: Xem 3D của cấu hình Test số 2.
% 3: ...
VISUALIZE_TEST_IDX = 1; 

% --- E. CẤU HÌNH MÔI TRƯỜNG ---
% [0: TẮT NHIỄU TUYỆT ĐỐI] | [1: BẬT NHIỄU]
USE_NOISE = 0; 

% --- F. DANH SÁCH CÁC CẤU HÌNH SO SÁNH (A/B TESTING) ---
active_tests = {
    % % struct('name', 'PID + Analytical V1.2', 'controller', 'pid', 'allocator', 'analytical', 'kinematics', 'euler');
    % % struct('name', 'SO(3)(Lật góc chủ động) PID + Analytical',  'controller', 'so3', 'allocator', 'analytical', 'kinematics', 'euler');
    % % struct('name', 'PID + Analytical (Vectoring)',  'controller', 'pid', 'allocator', 'vectoring', 'kinematics', 'euler');
    % % struct('name', 'SO(3)(Lật góc chủ động) PID + Analytical (Vectoring)',  'controller', 'so3', 'allocator', 'vectoring', 'kinematics', 'euler');
    % % struct('name', 'PID + WPIN V2.0',       'controller', 'pid', 'allocator', 'wpin', 'kinematics', 'euler');
    % % struct('name', 'Euler Plant', 'controller', 'so3', 'allocator', 'vectoring', 'kinematics', 'euler');
    % % struct('name', 'DCM Plant', 'controller', 'pid', 'allocator', 'vectoring', 'kinematics', 'euler');
    struct('name', 'Euler Analytical', 'controller', 'pid', 'allocator', 'analytical', 'kinematics', 'euler');
    % struct('name', 'Euler Vectoring', 'controller', 'pid', 'allocator', 'vectoring', 'kinematics', 'euler');
    % struct('name', 'Euler Matrix Vectoring',  'controller', 'so3', 'allocator', 'vectoring', 'kinematics', 'euler');
    % struct('name', 'Euler Vectoring', 'controller', 'pid', 'allocator', 'vectoring', 'kinematics', 'euler');
    % struct('name', 'Euler WPIN',  'controller', 'pid', 'allocator', 'wpin', 'kinematics', 'euler');
    % struct('name', 'Matrix Vectoring',  'controller', 'so3', 'allocator', 'vectoring', 'kinematics', 'euler');
    % struct('name', 'Matrix WPIN',  'controller', 'so3', 'allocator', 'wpin', 'kinematics', 'euler');
    % struct('name', 'Quaternion Analytical',  'controller', 'quaternion', 'allocator', 'analytical', 'kinematics', 'quat');
    % struct('name', 'Quaternion Matrix Vectoring',  'controller', 'quaternion', 'allocator', 'alloc_vectoring_r_b2e', 'kinematics', 'quat');
    % struct('name', 'Quaternion Vectoring',  'controller', 'quaternion', 'allocator', 'vectoring', 'kinematics', 'quat');
    struct('name', 'Quaternion WPIN',  'controller', 'quaternion', 'allocator', 'wpin', 'kinematics', 'quat');
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
    % [BẢO VỆ]: Nếu code cũ không có trường kinematics, mặc định là euler (Dời lên trước khi in)
    if ~isfield(current_config, 'kinematics'), current_config.kinematics = 'euler'; end
    
    % [CẬP NHẬT]: In log chi tiết theo yêu cầu
    fprintf('\n---> Đang chạy Test %d/%d: [%s], controller dùng %s, bộ phân bổ %s, động học %s...\n', ...
        i_test, num_tests, current_config.name, ...
        current_config.controller, current_config.allocator, current_config.kinematics);
    % Nạp đúng bộ thông số (Gain Tuning)
    if strcmp(current_config.allocator, 'analytical')
        active_params = all_params.pid_analytical;
    elseif strcmp(current_config.allocator, 'wpin')
        active_params = all_params.pid_wpin;
    else 
        active_params = all_params.pid_vectoring;
    end

    % Reset Trạng thái hệ thống
    N_steps = floor(sys.sim.t_end / dt) + 1;
    % Nếu code cũ không có trường kinematics, mặc định là euler
    if ~isfield(current_config, 'kinematics'), current_config.kinematics = 'euler'; end

    % Khởi tạo
    if strcmp(current_config.kinematics, 'quat')
        x_true = zeros(13, 1);
        x_true(7) = 1; % q_w = 1 (Tư thế góc 0 độ mặc định)
    elseif strcmp(current_config.kinematics, 'dcm')
        x_true = zeros(18, 1);
        x_true(7:15) = reshape(eye(3), 9, 1); 
    else
        x_true = zeros(12, 1); 
    end
    
    act_phys.thrust = zeros(8,1); act_phys.alpha = zeros(4,1); act_phys.beta = zeros(4,1);
    act_cmd         = act_phys;
    
    ctrl_state = []; 
    % traj_state.pos = x_true(1:3); traj_state.vel = x_true(4:6);
    % traj_state.euler = x_true(7:9); traj_state.rate = x_true(10:12);
    traj_state = [];
    
    % hist = data_logger('init', N_steps, x_true);

    if strcmp(current_config.kinematics, 'quat') || strcmp(current_config.kinematics, 'dcm')
        x_log_init = sensor_router(current_config.kinematics, x_true, 0); 
    else
        x_log_init = x_true;
    end
    hist = data_logger('init', N_steps, x_log_init);
    
    % --- VÒNG LẶP THỜI GIAN (FLIGHT LOOP) ---
    t = 0;
    for k = 1:N_steps
        % Dùng Sensor Router thay vì gọi trực tiếp
        % state_est = sensor_router(current_config.kinematics, x_true, USE_NOISE);
        % Yêu cầu 13 biến nếu đang dùng Não Quaternion, ngược lại mặc định 12 biến
        req_format = 'legacy_12';
        if strcmp(current_config.controller, 'quaternion')
            req_format = 'native_13'; 
        end
        state_est = sensor_router(current_config.kinematics, x_true, USE_NOISE, req_format);
        
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
            elseif strcmp(current_config.allocator, 'vectoring')
                [act_cmd.thrust, act_cmd.alpha, act_cmd.beta] = alloc_vectoring(acc_cmd_earth, M_body_des, euler_curr, sys, act_phys);
            else
                [act_cmd.thrust, act_cmd.alpha, act_cmd.beta] = alloc_wpin(tau_des, sys, act_phys);
            end
            
            x_true = zeros(12,1); % Ép chặt khung máy bay xuống bàn
        end
        
        % Động lực học Cơ cấu chấp hành
        act_phys = actuator_dynamics(act_cmd, act_phys, sys);
        
        % Tích phân Vật lý (Chỉ chạy nếu không bị ép trên Bàn tĩnh)
        if SIM_MODE ~= 3
            [k1,~,~] = dynamics_router(current_config.kinematics, t,          x_true,            act_phys, sys);
            [k2,~,~] = dynamics_router(current_config.kinematics, t+0.5*dt, x_true + 0.5*dt*k1, act_phys, sys);
            [k3,~,~] = dynamics_router(current_config.kinematics, t+0.5*dt, x_true + 0.5*dt*k2, act_phys, sys);
            [k4,~,~] = dynamics_router(current_config.kinematics, t+dt,     x_true + dt*k3,     act_phys, sys);
            x_true = x_true + (dt/6)*(k1 + 2*k2 + 2*k3 + k4);
        end
        
        if strcmp(current_config.kinematics, 'quat') || strcmp(current_config.kinematics, 'dcm')
            x_log = sensor_router(current_config.kinematics, x_true, 0); 
        else
            x_log = x_true;
        end
        hist = data_logger('log', k, x_log, act_phys, act_cmd, setpoints, hist);
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