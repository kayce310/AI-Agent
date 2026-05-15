function [cmd_thrust, cmd_alpha, cmd_beta] = alloc_analytical(acc_cmd_earth, M_body_des, euler_curr, sys, act_phys)
% =========================================================================
% File Name: alloc_analytical.m
% Version: 1.2 (Stable Release - Non-Aerobatic, Tilt < 90 deg)
% Description: Bộ Phân bổ Giải tích (Analytical Mixer) truyền thống.
%              Chuyên trị bay ổn định, giữ tọa độ và tư thế ở góc an toàn.
%              Đã tích hợp xử lý R-CRM cho động cơ đồng trục.
% =========================================================================

    % =====================================================================
    % 1. TRÍCH XUẤT TÍN HIỆU ĐẦU VÀO TỪ BỘ ĐIỀU KHIỂN
    % =====================================================================
    % Lệnh gia tốc tịnh tiến mong muốn (Hệ Trái Đất)
    ax_world = acc_cmd_earth(1);
    ay_world = acc_cmd_earth(2);
    
    % Góc tư thế hiện tại của máy bay (Body Frame)
    roll  = euler_curr(1);
    pitch = euler_curr(2);
    yaw   = euler_curr(3);
    
    % Lệnh Nỗ lực xoay (Mô-men mong muốn) từ bộ PID Tư thế
    cmd_effort_roll  = M_body_des(1); % Mx: Lật trái/phải
    cmd_effort_pitch = M_body_des(2); % My: Ngóc/Chúi mũi
    cmd_effort_yaw   = M_body_des(3); % Mz: Xoay mũi
    
    % =====================================================================
    % 2. BỘ TÍNH TOÁN NGÀM SERVO (GIẢI TRỪ LIÊN KẾT TƯ THẾ)
    % Nhiệm vụ: Bẻ ngàm Servo sao cho Vector lực luôn chĩa đúng hướng 
    % Trái Đất mong muốn, bất chấp việc Thân máy bay đang nghiêng.
    % =====================================================================
    % 2.1. Chiếu lệnh gia tốc từ Hệ Trái Đất (World) sang Hệ Đầu Xe (Heading)
    % Giúp lệnh Tiến/Lùi luôn đi theo hướng mũi máy bay đang chỉ (Yaw)
    ax_heading = ax_world * cos(yaw) + ay_world * sin(yaw);
    ay_heading = -ax_world * sin(yaw) + ay_world * cos(yaw);
    
    % 2.2. Khóa giới hạn gia tốc ngang (Tránh đòi hỏi lực phi thực tế)
    % Gới hạn ở mức 0.99g để hàm asin() phía dưới không bị lỗi số ảo (NaN)
    ratio_x = max(min(ax_heading / sys.sim.g, 0.99), -0.99);
    ratio_y = max(min(ay_heading / sys.sim.g, 0.99), -0.99);
    
    % 2.3. Tính góc Vector Lực mong muốn so với mặt đất (Base Angle)
    % Dấu trừ (-) ở alpha theo chuẩn FRD: Gia tốc +X cần vector ngóc ra sau
    alpha_base_array = zeros(4,1) - asin(ratio_x); 
    beta_base_array  = zeros(4,1) + asin(ratio_y); 
    
    % 2.4. Tiền tiếp Hỗ trợ Tư thế (Feedforward Assist) - Đang Tắt
    % (Chỉ dùng khi muốn Servo "phụ" motor lật máy bay, hiện tại K=0)
    K_assist_pitch = 0; K_assist_roll  = 0; lim_assist = 0.17; 
    assist_pitch = max(min(cmd_effort_pitch * K_assist_pitch, lim_assist), -lim_assist);
    assist_roll  = max(min(cmd_effort_roll  * K_assist_roll,  lim_assist), -lim_assist);
    
    % 2.5. Giải trừ Liên kết Tư thế (Attitude Decoupling) - Lõi Toán Học
    % Góc Servo = Góc Lực Cần Thiết (Đất) - Góc Nghiêng Của Thân (Body) + Góc Phụ (Assist)
    cmd_math_alpha = alpha_base_array - pitch + assist_pitch;
    cmd_math_beta  = beta_base_array  - roll  + assist_roll;
    
    % 2.6. Chống tràn vòng tròn (Wrap góc về [-pi, pi])
    cmd_math_alpha = atan2(sin(cmd_math_alpha), cos(cmd_math_alpha));
    cmd_math_beta  = atan2(sin(cmd_math_beta),  cos(cmd_math_beta));
    
    % 2.7. Ánh xạ sang Phần cứng Thực tế và Chặn giới hạn cơ khí
    % Nhân với sys.servo.dir để đảo chiều ngàm theo thiết kế lắp ráp đối xứng
    cmd_alpha = cmd_math_alpha .* sys.servo.dir_alpha;
    cmd_beta  = cmd_math_beta  .* sys.servo.dir_beta;
    
    cmd_alpha = max(min(cmd_alpha, sys.servo.lim_alpha), -sys.servo.lim_alpha);
    cmd_beta  = max(min(cmd_beta,  sys.servo.lim_beta),  -sys.servo.lim_beta);
    
    % =====================================================================
    % 3. BỘ PHÂN BỔ ĐỘNG CƠ (R-CRM MOTOR MIXER)
    % Nhiệm vụ: Tính toán Lực đẩy Cơ sở và cộng/trừ Momen để lật máy bay
    % =====================================================================
    % 3.1. Dịch ngược góc Servo vật lý hiện tại về góc Toán học
    math_alpha_fb = act_phys.alpha ./ sys.servo.dir_alpha;
    math_beta_fb  = act_phys.beta  ./ sys.servo.dir_beta;
    
    % 3.2. Tính góc Vector Lực thực tế so với Trái Đất (Global Angle)
    global_alpha = math_alpha_fb + pitch; 
    global_beta  = math_beta_fb  + roll;
    
    mean_global_alpha = mean(abs(global_alpha));
    mean_global_beta  = mean(abs(global_beta));
    
    % 3.3. Tính Lực Nâng Cơ Sở (T_base)
    % Chia cho cos() để bù hao hụt lực nâng do vector lực bị bẻ nghiêng
    % CHỐT AN TOÀN: max(cos, 0.05) ngăn chia cho 0 nếu máy bay vô tình chạm 90 độ
    total_z_req = sys.mass * (sys.sim.g - acc_cmd_earth(3)); 
    cos_comp = max(cos(mean_global_alpha) * cos(mean_global_beta), 0.05);
    T_base = (total_z_req / cos_comp) / 4;
    
    % 3.4. Bù trừ Mô-men Ký sinh (Parasitic Torque) - Đang Tắt
    % (Sinh ra do tâm cánh quạt nằm cách xa trục xoay ngàm Servo)
    K_cross_pitch = 0; K_cross_roll  = 0; 
    net_alpha = mean(math_alpha_fb); net_beta  = mean(math_beta_fb);  
    pitch_parasitic = K_cross_pitch * sin(net_alpha); 
    roll_parasitic  = K_cross_roll  * sin(net_beta);  
    
    % Lệnh Momen cuối cùng cần motor tạo ra (Đã dọn dẹp biến lật úp inv_x/y)
    real_cmd_pitch = cmd_effort_pitch - pitch_parasitic;
    real_cmd_roll  = cmd_effort_roll  - roll_parasitic;
    
    % 3.5. Biến cấu hình cho Động cơ Đồng trục (Coaxial Specs)
    cmd_thrust = zeros(8,1); 
    eta_c = sys.motor.coax_eff; 
    lam_c = sys.motor.coax_torque_eff; 
    c_q   = sys.motor.tau; 
    
    % Xử lý kiểu dữ liệu mảng an toàn cho limit_thrust
    limit_thrust = sys.motor.max_thrust;
    if length(limit_thrust) > 1, limit_thrust = limit_thrust(end); end
    
    % Chia đều nỗ lực Yaw cho 4 cụm tay đòn
    d_yaw = cmd_effort_yaw / 4; 
    
    % --- VÒNG LẶP PHÂN BỔ CHO 4 CỤM TAY ĐÒN (ARMS) ---
    for i = 1:4
        % Đọc dữ liệu Hình học và ID từ bảng hw_map
        pos_x   = sys.hw_map(i, 2);
        pos_y   = sys.hw_map(i, 3);
        idx_top = sys.motor.top_idx(i);
        idx_bot = sys.motor.bot_idx(i);
        dir_top = sys.motor.dir_top(i);
        
        % Tính Lực bù trừ Momen (Cánh tay đòn càng dài, lực cần thiết càng nhỏ)
        d_pitch_i = (real_cmd_pitch / (4 * abs(pos_x))) * sign(pos_x);
        d_roll_i  = (real_cmd_roll  / (4 * abs(pos_y))) * sign(pos_y);
        
        % Tổng lực cần thiết cho toàn bộ Cụm tay đòn i
        T_arm = T_base + d_pitch_i - d_roll_i;
        
        % Momen xoắn Yaw phân rã thành lực chênh lệch giữa Top và Bot
        dT_yaw = d_yaw / (dir_top * c_q);
        
        % Thuật toán R-CRM: Phân rã T_arm thành T_top và T_bot 
        % có tính đến hao hụt khí động học (eta_c, lam_c)
        T_bot = (T_arm - dT_yaw) / (eta_c + lam_c);
        T_top = T_arm - eta_c * T_bot;
        
        % Chống điểm mù lực đẩy (Saturation bounds)
        % Nếu 1 motor bị yêu cầu lực âm, ép về 0 và dồn toàn bộ gánh nặng cho motor còn lại
        if T_bot < 0, T_bot = 0; T_top = T_arm; end
        if T_top < 0, T_top = 0; T_bot = T_arm / eta_c; end
        
        % Gắn Lực đẩy cuối cùng vào mảng xuất ra, chặn kịch trần sức mạnh Motor
        cmd_thrust(idx_top) = min(max(T_top, 0), limit_thrust);
        cmd_thrust(idx_bot) = min(max(T_bot, 0), limit_thrust);
    end
end