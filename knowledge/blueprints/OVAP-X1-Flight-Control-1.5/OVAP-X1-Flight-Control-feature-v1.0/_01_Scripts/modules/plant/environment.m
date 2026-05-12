function [F_env_b, M_env_b] = environment(t, state, sys, R_b2e)
    vel_b = state.vel_b;
    rates = state.rates;
    
    % Trọng lực
    g_body = R_b2e' * [0; 0; sys.sim.g];
    F_gravity_b = sys.mass * g_body;
    
    % Gió (nếu có)
    v_wind_b = R_b2e' * sys.env.wind_ned;
    v_air_b = vel_b - v_wind_b;
    
    % Cản tĩnh (Gọi từ sys.aero)
    F_drag_b = -sys.aero.C_d_matrix * v_air_b;
    
    % Ma sát xoay (Gọi từ sys.aero)
    M_drag_b = -sys.aero.C_m_matrix * rates;
    
    F_env_b = F_gravity_b + F_drag_b;
    M_env_b = M_drag_b;
end