function next_act = actuator_dynamics(cmd_act, prev_act, sys)
% File Name: actuator_dynamics.m
% Description: Mô phỏng động lực học Motor (Quán tính dòng) và Servo (Trễ + Giới hạn tốc độ).
% [CẬP NHẬT]: Sử dụng đúng SYS_TAU_MOTOR và SYS_TAU_SERVO từ hệ thống.

    dt = sys.sim.dt;
    
    % --- [BẢO VỆ 1: ĐỒNG BỘ KÍCH THƯỚC] ---
    if length(prev_act.thrust) ~= length(cmd_act.thrust)
        prev_act.thrust = zeros(size(cmd_act.thrust));
    end
    
    % --- [BẢO VỆ 2: TRÍCH XUẤT THAM SỐ THỰC TẾ] ---
    % Thời hằng Motor (SYS_TAU_MOTOR = 0.03s)
    tau_m = 0.03; 
    if isfield(sys.motor, 'tau_motor'), tau_m = sys.motor.tau_motor; end
    
    % Thời hằng Servo (SYS_TAU_SERVO = 0.05s)
    tau_s = 0.05; 
    if isfield(sys.servo, 'tau'), tau_s = sys.servo.tau; end
    
    % Tốc độ xoay Servo (SYS_RATE_LIM_TILT = 15 rad/s hoặc deg/s tùy cấu hình)
    rate_lim = 15.0; 
    if isfield(sys.servo, 'rate_lim'), rate_lim = sys.servo.rate_lim; end
    
    % --- 1. Motor Dynamics (First Order Lag) ---
    % Sử dụng phương pháp tích phân Euler để mô phỏng trễ đáp ứng lực đẩy
    % dT/dt = (T_cmd - T_prev) / tau_m
    thrust_next = prev_act.thrust + (dt / tau_m) * (cmd_act.thrust - prev_act.thrust);
    
    % Chống lỗi vọt lố (Numerical Instability) nếu dt > tau_m
    thrust_next = max(0, min(thrust_next, sys.motor.max_thrust)); 
    
    % --- 2. Servo Dynamics (Rate Limit -> First Order Lag) ---
    % Cần giới hạn tốc độ bẻ ngàm trước khi tính đến độ trễ cơ khí
    
    % Update Alpha (Tilt dọc)
    alpha_next = update_servo_logic(cmd_act.alpha, prev_act.alpha, tau_s, rate_lim, dt);
    
    % Update Beta (Tilt ngang)
    beta_next = update_servo_logic(cmd_act.beta, prev_act.beta, tau_s, rate_lim, dt);
    
    % Bão hòa góc ngàm (Saturate)
    alpha_next = max(min(alpha_next, sys.servo.lim_alpha), -sys.servo.lim_alpha);
    beta_next  = max(min(beta_next,  sys.servo.lim_beta),  -sys.servo.lim_beta);
    
    % --- Đóng gói đầu ra ---
    next_act.thrust = thrust_next;
    next_act.alpha  = alpha_next;
    next_act.beta   = beta_next;
end

%% ================= LOCAL FUNCTIONS =================
function angle_out = update_servo_logic(cmd, prev, tau, rate_limit, dt)
    % BƯỚC 1: Giới hạn tốc độ cơ khí (Rate Limiting)
    % Đây là giới hạn cứng của mô-men xoắn servo
    max_delta = rate_limit * dt;
    error_raw = cmd - prev;
    cmd_limited = prev + max(min(error_raw, max_delta), -max_delta);
    
    % BƯỚC 2: Trễ đáp ứng (First Order Lag)
    % Mô phỏng quán tính của cụm động cơ nặng 2.6kg khi xoay
    angle_out = prev + (dt / tau) * (cmd_limited - prev);
end