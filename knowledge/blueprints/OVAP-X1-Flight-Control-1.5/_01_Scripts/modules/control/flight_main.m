function [actuators_cmd, ctrl_state] = flight_main(state_est, setpoints, sys, ctrl_state, active_params, current_config, act_phys)
% File Name: flight_main.m
% Position: Root > modules > control > flight_main.m
% Description: The Router. Connects chosen Controller with chosen Allocator.
% [V2.5 UPGRADE]: Supports both 12-State (Euler) and 13-State (Quaternion) routing.

    dt = sys.sim.dt;
    
    % --- [BẢO VỆ]: Nếu chạy code cũ chưa kịp cập nhật main_sim ---
    if nargin < 6 || isempty(current_config)
        current_config.controller = 'pid';
        current_config.allocator  = 'analytical';
    end

    % =====================================================================
    % 0. XỬ LÝ TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY)
    % =====================================================================
    if length(state_est) == 13
        % HỆ THỐNG MỚI (13-State): Tích phân bằng Quaternion
        quat_curr = state_est(7:10);
        euler_curr = quat2eul_local(quat_curr); % Dịch Quat -> Euler để giữ form cũ
        
        % Lắp ráp một state giả lập 12-biến để lừa bộ Não cũ (ctrl_pid)
        state_est_legacy = [state_est(1:6); euler_curr; state_est(11:13)];
    else
        % HỆ THỐNG CŨ (12-State): Đang chạy tích phân Euler
        euler_curr = state_est(7:9);
        state_est_legacy = state_est; 
    end

    % =====================================================================
    % 1. ĐIỀU KHIỂN CẤP CAO (CONTROLLERS)
    % =====================================================================
    if strcmp(current_config.controller, 'pid')
        [acc_cmd_earth, F_vec_body, M_body_des, ctrl_state] = ctrl_pid(...
            state_est_legacy, setpoints, dt, active_params, ctrl_state);
            
    elseif strcmp(current_config.controller, 'so3')
        % [THÊM MỚI]: Gọi khối Điều khiển SO(3) (Vẫn dùng state 12-biến)
        [acc_cmd_earth, F_vec_body, M_body_des, ctrl_state] = ctrl_so3(...
            state_est_legacy, setpoints, dt, active_params, ctrl_state);
            
    elseif strcmp(current_config.controller, 'quaternion')
        [acc_cmd_earth, F_vec_body, M_body_des, ctrl_state] = ctrl_quaternion(...
            state_est, setpoints, dt, active_params, ctrl_state);
            
    else
        error('Controller [%s] chưa được hỗ trợ!', current_config.controller);
    end

    % =====================================================================
    % 2. PHÂN BỔ LỰC CHẤP HÀNH (ALLOCATORS)
    % =====================================================================
    if strcmp(current_config.allocator, 'analytical')
        % Lượng giác 1:1 (Chống lật, Bù tiền tiếp)
        [cmd_thrust, cmd_alpha, cmd_beta] = alloc_analytical(...
            acc_cmd_earth, M_body_des, euler_curr, sys, act_phys);

        % BỔ SUNG NHÁNH NÀY CHO MA TRẬN VECTORING
    % BỔ SUNG NHÁNH NÀY CHO MA TRẬN VECTORING (Đã sửa config -> current_config)
    elseif strcmp(current_config.allocator, 'alloc_vectoring_r_b2e')
        % 1. Trích xuất Ma trận xoay R_b2e từ State Estimate
        if strcmp(current_config.kinematics, 'quat')
            q = state_est(7:10);
            q = q / norm(q); % Chuẩn hóa
            qw=q(1); qx=q(2); qy=q(3); qz=q(4);
            R_b2e = [1 - 2*(qy^2 + qz^2),   2*(qx*qy - qw*qz),     2*(qx*qz + qw*qy);
                     2*(qx*qy + qw*qz),     1 - 2*(qx^2 + qz^2),   2*(qy*qz - qw*qx);
                     2*(qx*qz - qw*qy),     2*(qy*qz + qw*qx),     1 - 2*(qx^2 + qy^2)];
                     
        elseif strcmp(current_config.kinematics, 'dcm')
            R_b2e = reshape(state_est(7:15), 3, 3);
            
        else
            % Fallback an toàn nếu đang dùng Euler
            ph = state_est(7); th = state_est(8); ps = state_est(9);
            R_b2e = [cos(th)*cos(ps), sin(ph)*sin(th)*cos(ps)-cos(ph)*sin(ps), cos(ph)*sin(th)*cos(ps)+sin(ph)*sin(ps);
                     cos(th)*sin(ps), sin(ph)*sin(th)*sin(ps)+cos(ph)*cos(ps), cos(ph)*sin(th)*sin(ps)-sin(ph)*cos(ps);
                    -sin(th),         sin(ph)*cos(th),                         cos(ph)*cos(th)];
        end
        
        % 2. Gọi hàm Allocator mới
        [cmd_thrust, cmd_alpha, cmd_beta] = alloc_vectoring_r_b2e(acc_cmd_earth, M_body_des, R_b2e, sys, act_phys);
            
    elseif strcmp(current_config.allocator, 'vectoring')
        % Gọi hàm 3D Force Vectoring V1.5
        [cmd_thrust, cmd_alpha, cmd_beta] = alloc_vectoring(...
            acc_cmd_earth, M_body_des, euler_curr, sys, act_phys);
            
    elseif strcmp(current_config.allocator, 'wpin')
        % Giả nghịch đảo Jacobian truyền thống
        tau_des = [F_vec_body; M_body_des];
        [cmd_thrust, cmd_alpha, cmd_beta] = alloc_wpin(tau_des, sys, act_phys);
        
    else
        error('Allocator [%s] chưa được hỗ trợ!', current_config.allocator);
    end

    % =====================================================================
    % 3. ĐÓNG GÓI ĐẦU RA 16-DOF
    % =====================================================================
    actuators_cmd.thrust = cmd_thrust;
    actuators_cmd.alpha  = cmd_alpha;
    actuators_cmd.beta   = cmd_beta;
end

%% ================= LOCAL FUNCTIONS =================
function eul = quat2eul_local(q)
    % Hàm nội bộ dịch Quaternion [w, x, y, z] về Euler [Roll, Pitch, Yaw]
    % Để cấp cho các hàm cũ mà không cần gọi thư viện ngoài
    w = q(1); x = q(2); y = q(3); z = q(4);
    
    roll  = atan2(2*(w*x + y*z), 1 - 2*(x^2 + y^2));
    pitch = asin(max(min(2*(w*y - z*x), 1), -1)); % Dùng max/min chặn NaN
    yaw   = atan2(2*(w*z + x*y), 1 - 2*(y^2 + z^2));
    
    eul = [roll; pitch; yaw];
end