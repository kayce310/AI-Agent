function params = controller_params(sys, limits)
% File Name: controller_params.m
% Description: Pure Tuning Gains for PID controllers. Limits are dynamically synced.

    % =====================================================================
    % 1. THÔNG SỐ CHO BỘ PID + WPIN
    % =====================================================================
    pid_wpin.pos_P   = [2.0; 2.0; 2.5]; 
    
    pid_wpin.vel_Kp  = [3.0; 3.0; 6.0];
    pid_wpin.vel_Ki  = [0.1; 0.1; 0.2];
    pid_wpin.vel_Kd  = [0.2; 0.2; 0.4];
    
    pid_wpin.att_P   = [15.0; 15.0; 8.0]; 
    
    pid_wpin.rate_Kp = [25.0; 25.0; 15.0]; 
    pid_wpin.rate_Ki = [2.0;  2.0;  1.0];
    pid_wpin.rate_Kd = [3.0;  3.0;  1.5];
    
    % --- Đồng bộ giới hạn từ init_limits ---
    pid_wpin.max_vel    = limits.v_max; 
    pid_wpin.max_acc    = limits.a_max; 
    pid_wpin.max_torque = limits.max_torque; 
    
    % --- Hằng số vật lý ---
    pid_wpin.mass = sys.mass;
    pid_wpin.g    = sys.sim.g;

    % =====================================================================
    % 2. THÔNG SỐ CHO BỘ PID + ANALYTICAL MIXER (V1.2)
    % =====================================================================
    pid_analytical.pos_P   = [4.0; 4.0; 2.0]; 
    
    pid_analytical.vel_Kp  = [4.0; 4.0; 2.0];
    pid_analytical.vel_Ki  = [0.001; 0.001; 0.001];
    pid_analytical.vel_Kd  = [2.5; 2.5; 1.0];
    
    pid_analytical.att_P   = [4; 4; 2]; 
    
    pid_analytical.rate_Kp = [1; 1; 1]; 
    pid_analytical.rate_Ki = [0.001; 0.001; 0.001];
    pid_analytical.rate_Kd = [0.5; 0.5; 0.6];
    
    % --- ĐỒNG BỘ GIỚI HẠN ---
    pid_analytical.max_vel    = limits.v_max; 
    pid_analytical.max_acc    = limits.a_max; 
    pid_analytical.max_torque = limits.max_torque; 
    
    % --- Hằng số vật lý ---
    pid_analytical.mass = sys.mass;
    pid_analytical.g    = sys.sim.g;

    % =====================================================================
    % 3. THÔNG SỐ CHO BỘ PID + VECTORING (V1.5)
    % =====================================================================
    pid_vectoring.pos_P   = [4.0; 4.0; 2.0]; 
    
    pid_vectoring.vel_Kp  = [4.0; 4.0; 2.0];
    pid_vectoring.vel_Ki  = [0.001; 0.001; 0.001];
    pid_vectoring.vel_Kd  = [2.5; 2.5; 1.0];
    
    pid_vectoring.att_P   = [3.5; 3.5; 2]; 
    
    pid_vectoring.rate_Kp = [1; 1; 1]; 
    pid_vectoring.rate_Ki = [0.001; 0.001; 0.001];
    pid_vectoring.rate_Kd = [0.6; 0.6; 0.6]; 
    
    % --- ĐỒNG BỘ GIỚI HẠN ---
    pid_vectoring.max_vel    = limits.v_max; 
    pid_vectoring.max_acc    = limits.a_max; 
    pid_vectoring.max_torque = limits.max_torque; 
    
    % --- Hằng số vật lý ---
    pid_vectoring.mass = sys.mass;
    pid_vectoring.g    = sys.sim.g;

    % =====================================================================
    % 4. ĐÓNG GÓI XUẤT RA
    % =====================================================================
    params.pid_wpin       = pid_wpin;
    params.pid_analytical = pid_analytical;
    params.pid_vectoring  = pid_vectoring;
end