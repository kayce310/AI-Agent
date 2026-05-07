function q = euler_to_quat(euler)
    % EULER_TO_QUAT - Convert Z-Y-X Euler angles to Quaternion
    % q = [qw, qx, qy, qz]'
    
    phi = euler(1) / 2;
    theta = euler(2) / 2;
    psi = euler(3) / 2;
    
    c_p = cos(phi); s_p = sin(phi);
    c_t = cos(theta); s_t = sin(theta);
    c_ps = cos(psi); s_ps = sin(psi);
    
    qw = c_p * c_t * c_ps + s_p * s_t * s_ps;
    qx = s_p * c_t * c_ps - c_p * s_t * s_ps;
    qy = c_p * s_t * c_ps + s_p * c_t * s_ps;
    qz = c_p * c_t * s_ps - s_p * s_t * c_ps;
    
    q = [qw; qx; qy; qz];
end