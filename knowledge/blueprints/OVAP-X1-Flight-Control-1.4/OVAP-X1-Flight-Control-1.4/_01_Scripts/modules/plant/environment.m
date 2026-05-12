function [F_env_b, M_env_b] = environment(t, state, sys)
% File Name: environment.m
% Position in Structure: Root > plant_model > environment.m
% Brief Function Description: Calculates environmental forces (Gravity, Drag, Wind) in Body Frame.

    % --- 1. Unpack State ---
    % state.vel_b: Vận tốc trong hệ Body (u, v, w)
    % state.euler: Góc Euler (phi, theta, psi)
    % state.rates: Vận tốc góc (p, q, r)
    vel_b = state.vel_b;
    euler = state.euler;
    rates = state.rates;
    
    phi   = euler(1);
    theta = euler(2);
    
    % --- 2. Gravity (Body Frame) ---
    % Chuyển vector trọng lực [0; 0; g] từ hệ NED sang Body
    % R_eb' * [0;0;g]
    g_b = sys.sim.g * [ -sin(theta);
                         cos(theta)*sin(phi);
                         cos(theta)*cos(phi) ];
                     
    F_gravity_b = sys.mass * g_b;
    
    % --- 3. Aerodynamic Drag (Body Frame) ---
    % F_drag^B = -C_d * ν (linear) — đồng bộ với v1.5
    C_d = sys.aero.C_d_matrix;
    F_drag_b = -C_d * vel_b;
    
    % --- 4. Total Environmental Forces ---
    F_env_b = F_gravity_b + F_drag_b;
    
    % --- 5. Rotational Damping (Aerodynamic Moments) ---
    % M_drag = -C_m * rates — giúp attitude PID ổn định hơn
    C_m = sys.aero.C_m_matrix;
    M_env_b = -C_m * rates;
end