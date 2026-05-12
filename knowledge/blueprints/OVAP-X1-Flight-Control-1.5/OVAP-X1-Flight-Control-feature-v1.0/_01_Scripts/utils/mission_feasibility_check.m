function is_feasible = mission_feasibility_check(sys, limits)
% File Name: mission_feasibility_check.m
% Description: Evaluates if the demanded trajectory limits exceed physical hardware capabilities.

    fprintf('\n======================================================\n');
    fprintf('[PRE-FLIGHT CHECK] VALIDATING 6-DOF MECHANICAL LIMITS\n');
    fprintf('======================================================\n');
    is_feasible = true;

    % 1. Thông số vật lý cốt lõi
    T_motor_max = sys.motor.max_thrust; 
    coax_eff    = sys.motor.coax_eff; 
    mass        = sys.mass;
    g           = sys.sim.g;

    % Tổng lực đẩy tối đa của hệ thống X8 (4 ngàm x (Top + Bot*eff))
    T_arm_max   = T_motor_max + (T_motor_max * coax_eff);
    T_total_max = 4 * T_arm_max; 
    W_hover     = mass * g; 

    if T_total_max < W_hover
        fprintf('[ERROR] Lực đẩy tối đa (%.1f N) KHÔNG ĐỦ để nâng UAV (%.1f N)!\n', T_total_max, W_hover);
        is_feasible = false;
        return;
    else
        fprintf('[OK] Tỷ lệ Thrust-to-Weight an toàn: %.2f : 1\n', T_total_max / W_hover);
    end

    % 2. Kiểm tra năng lực Tịnh tiến Độc lập (Decoupled Translation)
    % Khả năng tăng tốc ngang cực đại khi giữ thân phẳng (Pitch/Roll = 0)
    % Góc nghiêng Servo tối đa khả dụng mà vẫn giữ được độ cao:
    max_tilt_phys = acos(W_hover / T_total_max); 
    max_tilt_servo = min(sys.servo.lim_alpha, max_tilt_phys);
    
    F_xy_max = T_total_max * sin(max_tilt_servo);
    a_xy_max = F_xy_max / mass; % Gia tốc ngang tối đa (m/s^2)

    req_a_xy = max(limits.a_max(1), limits.a_max(2));

    if req_a_xy > a_xy_max
        fprintf('[WARNING] Mission đòi hỏi gia tốc ngang %.2f m/s^2.\n', req_a_xy);
        fprintf('          VƯỢT QUÁ giới hạn vật lý %.2f m/s^2 (Khi giữ thân phẳng)!\n', a_xy_max);
        fprintf('          -> Hậu quả: UAV sẽ bị tụt độ cao do bão hòa động cơ.\n');
        is_feasible = false;
    else
        fprintf('[OK] Gia tốc tịnh tiến ngang (%.2f m/s^2) nằm trong năng lực Servo.\n', req_a_xy);
    end

    % 3. Kiểm tra năng lực Xoay Yaw Độc lập (Coaxial Momen)
    M_yaw_max = 4 * (sys.motor.tau * T_motor_max); % Momen cực đại sinh ra do chênh lệch Top/Bot
    alpha_yaw_max = M_yaw_max / sys.J(3,3);

    if limits.alpha_max(3) > alpha_yaw_max
        fprintf('[WARNING] Mission đòi hỏi gia tốc Yaw %.2f rad/s^2.\n', limits.alpha_max(3));
        fprintf('          VƯỢT QUÁ momen đồng trục tối đa %.2f rad/s^2!\n', alpha_yaw_max);
        is_feasible = false;
    else
        fprintf('[OK] Năng lực Momen Yaw đồng trục đảm bảo.\n');
    end

    fprintf('======================================================\n');
    if is_feasible
        fprintf('>>> TRẠNG THÁI: MISSION KHẢ THI. READY TO FLY!\n\n');
    else
        fprintf('>>> TRẠNG THÁI: RỦI RO BÃO HÒA. HÃY GIẢM LIMITS HOẶC ĐỔI PHẦN CỨNG!\n\n');
    end
end