function [cmd_thrust, cmd_alpha, cmd_beta] = alloc_analytical(acc_cmd_earth, M_body_des, euler_curr, sys, act_phys)
% File Name: alloc_analytical.m
% Position: Root > modules > control > allocators > alloc_analytical.m
% Description: Unified Analytical Mixer with Coaxial R-CRM & Parasitic Torque Mitigation.
% [ĐỒNG BỘ V7.5]: Hệ quy chiếu chuẩn FRD (-asin, -pitch, [1, -1, -1, 1]).

    % =====================================================================
    % 1. TRÍCH XUẤT TÍN HIỆU ĐẦU VÀO
    % =====================================================================
    ax_world = acc_cmd_earth(1);
    ay_world = acc_cmd_earth(2);
    
    roll  = euler_curr(1);
    pitch = euler_curr(2);
    yaw   = euler_curr(3);
    
    cmd_effort_roll  = M_body_des(1); % Mx
    cmd_effort_pitch = M_body_des(2); % My
    cmd_effort_yaw   = M_body_des(3); % Mz
    
    % Nhận diện Bán cầu lật úp
    inv_x = sign(cos(pitch) + eps);
    inv_y = sign(cos(roll)  + eps);
    
    % =====================================================================
    % 2. BỘ TÍNH TOÁN VỊ TRÍ & NGÀM SERVO (Decoupling & Assist)
    % =====================================================================
    % Xoay vector gia tốc
    ax_heading = ax_world * cos(yaw) + ay_world * sin(yaw);
    ay_heading = -ax_world * sin(yaw) + ay_world * cos(yaw);
    % ay_heading = ax_world * sin(yaw) + ay_world * cos(yaw);
    
    % Khóa giới hạn gia tốc ngang
    ratio_x = max(min(ax_heading / sys.sim.g, 0.99), -0.99);
    ratio_y = max(min(ay_heading / sys.sim.g, 0.99), -0.99);
    
    % [TOÁN HỌC CHUẨN FRD]: Tính góc Base
    alpha_base_array = zeros(4,1) - asin(ratio_x); 
    beta_base_array  = zeros(4,1) + asin(ratio_y); 
    
    % Tiền tiếp Hỗ trợ Tư thế (Feedforward Assist)
    K_assist_pitch = 0;
    K_assist_roll  = 0;
    lim_assist     = 0.17; 
    
    assist_pitch = max(min(cmd_effort_pitch * K_assist_pitch, lim_assist), -lim_assist);
    assist_roll  = max(min(cmd_effort_roll  * K_assist_roll,  lim_assist), -lim_assist);
    
    % [TOÁN HỌC CHUẨN FRD]: Giải trừ liên kết tư thế
    cmd_math_alpha = alpha_base_array - pitch + assist_pitch;
    cmd_math_beta  = beta_base_array  - roll  + assist_roll;
    
    % Wrap góc
    cmd_math_alpha = atan2(sin(cmd_math_alpha), cos(cmd_math_alpha));
    cmd_math_beta  = atan2(sin(cmd_math_beta),  cos(cmd_math_beta));
    
    % Ánh xạ phần cứng Servo (Chỉ định chính xác từ sys.servo.dir)
    cmd_alpha = cmd_math_alpha .* sys.servo.dir_alpha;
    cmd_beta  = cmd_math_beta  .* sys.servo.dir_beta;
    
    cmd_alpha = max(min(cmd_alpha, sys.servo.lim_alpha), -sys.servo.lim_alpha);
    cmd_beta  = max(min(cmd_beta,  sys.servo.lim_beta),  -sys.servo.lim_beta);
    
    % =====================================================================
    % 3. BỘ PHÂN BỔ ĐỘNG CƠ TÍCH HỢP ĐỒNG TRỤC (R-CRM Motor Mixer)
    % =====================================================================
    % Giải mã ngược từ Hardware về Math
    math_alpha_fb = act_phys.alpha ./ sys.servo.dir_alpha;
    math_beta_fb  = act_phys.beta  ./ sys.servo.dir_beta;
    
    % [TOÁN HỌC CHUẨN FRD]: Tính góc Global
    global_alpha = math_alpha_fb + pitch; 
    global_beta  = math_beta_fb  + roll;
    
    mean_global_alpha = mean(abs(global_alpha));
    mean_global_beta  = mean(abs(global_beta));
    
    % Tính lực cơ sở (T_base)
    total_z_req = sys.mass * (sys.sim.g - acc_cmd_earth(3)); 
    T_base = (total_z_req / (cos(mean_global_alpha) * cos(mean_global_beta))) / 4;
    
    % Xử lý Mô-men Ký sinh
    K_cross_pitch = 0; 
    K_cross_roll  = 0; 
    net_alpha = mean(math_alpha_fb);  
    net_beta  = mean(math_beta_fb);  
    
    pitch_parasitic = K_cross_pitch * sin(net_alpha); 
    roll_parasitic  = K_cross_roll  * sin(net_beta);  
    
    % Áp dụng Trigger Bán cầu
    real_cmd_pitch = (cmd_effort_pitch - pitch_parasitic) * inv_x;
    real_cmd_roll  = (cmd_effort_roll  - roll_parasitic)  * inv_y;
    
    % Phân rã Đồng trục (R-CRM)
    cmd_thrust = zeros(8,1); 
    eta_c = sys.motor.coax_eff; 
    lam_c = sys.motor.coax_torque_eff; 
    c_q   = sys.motor.tau; 
    
    % Đồng bộ biến limit_thrust đề phòng kiểu vector
    limit_thrust = sys.motor.max_thrust;
    if length(limit_thrust) > 1
        limit_thrust = limit_thrust(end);
    end
    
    d_yaw = cmd_effort_yaw / 4; 
    
    for i = 1:4
        pos_x   = sys.hw_map(i, 2);
        pos_y   = sys.hw_map(i, 3);
        idx_top = sys.motor.top_idx(i);
        idx_bot = sys.motor.bot_idx(i);
        dir_top = sys.motor.dir_top(i);
        
        % Chuyển đổi tương đương với việc chia (4 * dist_x) bên Simulink
        d_pitch_i = (real_cmd_pitch / (4 * abs(pos_x))) * sign(pos_x);
        d_roll_i  = (real_cmd_roll  / (4 * abs(pos_y))) * sign(pos_y);
        
        T_arm = T_base + d_pitch_i - d_roll_i;
        
        dT_yaw = d_yaw / (dir_top * c_q);
        
        T_bot = (T_arm - dT_yaw) / (eta_c + lam_c);
        T_top = T_arm - eta_c * T_bot;
        
        if T_bot < 0, T_bot = 0; T_top = T_arm; end
        if T_top < 0, T_top = 0; T_bot = T_arm / eta_c; end
        
        cmd_thrust(idx_top) = min(max(T_top, 0), limit_thrust);
        cmd_thrust(idx_bot) = min(max(T_bot, 0), limit_thrust);
    end
end