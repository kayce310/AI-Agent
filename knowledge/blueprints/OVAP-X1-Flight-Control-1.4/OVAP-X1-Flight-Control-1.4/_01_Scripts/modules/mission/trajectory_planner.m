function [setpoint, traj_state] = trajectory_planner(target, dt, constraints, traj_state, planner_mode, sys)
% File Name: trajectory_planner.m
% Description: 1st-Order Kinematic S-Curve Planner (Dựa trên logic Mission_Planner gốc).
% Khắc phục hoàn toàn lỗi Overshoot (vọt lố) của hệ bậc 2.

    % =====================================================================
    % 1. KHỞI TẠO BẢO VỆ
    % =====================================================================
    if isempty(traj_state) || ~isfield(traj_state, 'pos')
        % [ĐÃ SỬA]: Lấy tọa độ xuất phát từ thông số hệ thống (Mặt đất: 0,0,0)
        traj_state.pos   = sys.init.x(1:3); 
        traj_state.vel   = zeros(3,1);
        traj_state.acc   = zeros(3,1);
        
        % [ĐÃ SỬA]: Lấy góc xuất phát từ thông số hệ thống
        traj_state.euler = sys.init.x(7:9); 
        traj_state.rate  = zeros(3,1);
        
        % Bổ sung thêm dòng này để chống lỗi nếu Data Logger cố gắng đọc
        traj_state.rate_dot = zeros(3,1); 
    end

    % =====================================================================
    % 2. [MODE 0]: STEP RESPONSE (HÀM NẤC)
    % =====================================================================
    if planner_mode == 0
        setpoint.pos   = target.pos;
        setpoint.vel   = zeros(3,1);
        setpoint.acc   = zeros(3,1);
        setpoint.euler = target.euler;
        setpoint.rate  = zeros(3,1);
        
        traj_state.pos   = target.pos;
        traj_state.euler = target.euler;
        traj_state.vel   = zeros(3,1);
        traj_state.rate  = zeros(3,1);
        return;
    end

    % =====================================================================
    % 3. [MODE 1]: 1ST-ORDER KINEMATIC SMOOTHING
    % =====================================================================
    % Hệ số P của quỹ đạo (Độ gắt khi kéo về đích)
    k_pos_smooth = 1.0; 
    k_att_smooth = 0.5; 

    % --- A. Quy hoạch Vị trí (XYZ) ---
    for i = 1:3
        % B1: Tính Vận tốc mong muốn (Đường cong chữ S)
        pos_err = target.pos(i) - traj_state.pos(i);
        v_target = constraints.v_max(i) * tanh((k_pos_smooth * pos_err) / constraints.v_max(i));
        
        % B2: Ép gia tốc để đuổi kịp v_target ngay lập tức
        a_req = (v_target - traj_state.vel(i)) / dt;
        
        % B3: Bão hòa theo giới hạn gia tốc vật lý
        a_req = max(min(a_req, constraints.a_max(i)), -constraints.a_max(i));
        
        % B4: Tích phân động học
        traj_state.acc(i) = a_req;
        traj_state.vel(i) = traj_state.vel(i) + a_req * dt;
        traj_state.pos(i) = traj_state.pos(i) + traj_state.vel(i) * dt;
    end

    % --- B. Quy hoạch Tư thế (Euler) ---
    for k = 1:3
        % B1: Xử lý Shortest Path cho Yaw (-pi đến pi)
        if k == 3
            ang_err = atan2(sin(target.euler(3) - traj_state.euler(3)), ...
                            cos(target.euler(3) - traj_state.euler(3)));
        else
            ang_err = target.euler(k) - traj_state.euler(k);
        end
        
        % B2: Tốc độ góc mong muốn
        rate_target = constraints.w_max(k) * tanh((k_att_smooth * ang_err) / constraints.w_max(k));
        
        % B3: Ép gia tốc góc & Bão hòa
        alpha_req = (rate_target - traj_state.rate(k)) / dt;
        alpha_req = max(min(alpha_req, constraints.alpha_max(k)), -constraints.alpha_max(k));
        
        % B4: Tích phân động học
        % Ghi chú: Thêm trường rate_dot để lỡ data_logger cần đọc gia tốc góc
        traj_state.rate_dot(k) = alpha_req; 
        traj_state.rate(k)  = traj_state.rate(k) + alpha_req * dt;
        traj_state.euler(k) = traj_state.euler(k) + traj_state.rate(k) * dt;
    end

    % =====================================================================
    % 4. ĐÓNG GÓI SETPOINT
    % =====================================================================
    setpoint.pos   = traj_state.pos;
    setpoint.vel   = traj_state.vel;
    setpoint.acc   = traj_state.acc;
    setpoint.euler = traj_state.euler;
    setpoint.rate  = traj_state.rate;
end