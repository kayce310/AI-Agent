function [actuators_cmd, ctrl_state] = flight_main(state_est, setpoints, sys, ctrl_state, active_params, current_config, act_phys)
% File Name: flight_main.m
% Position: Root > modules > control > flight_main.m
% Description: The Router. Connects chosen Controller with chosen Allocator.

    dt = sys.sim.dt;
    euler_curr = state_est(7:9);
    
    % --- [BẢO VỆ]: Nếu chạy code cũ chưa kịp cập nhật main_sim ---
    if nargin < 6 || isempty(current_config)
        current_config.controller = 'pid';
        current_config.allocator  = 'analytical';
    end

    % =====================================================================
    % 1. ĐIỀU KHIỂN CẤP CAO (CONTROLLERS)
    % =====================================================================
    if strcmp(current_config.controller, 'pid')
        % Khối điều khiển tiêu chuẩn xuất ra 3 tín hiệu chuẩn hóa
        [acc_cmd_earth, F_vec_body, M_body_des, ctrl_state] = ctrl_pid(...
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