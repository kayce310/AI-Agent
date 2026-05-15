function R = rotation_matrix(euler)
% File Name: rotation_matrix.m
% Position: Root > utils > rotation_matrix.m
% Description: Computes Rotation Matrix from Body to Earth (NED) using Z-Y-X sequence.
    phi   = euler(1);
    theta = euler(2);
    psi   = euler(3);
    
    c_phi = cos(phi);   s_phi = sin(phi);
    c_th  = cos(theta); s_th  = sin(theta);
    c_psi = cos(psi);   s_psi = sin(psi);
    
    R = [ c_th*c_psi,   s_phi*s_th*c_psi - c_phi*s_psi,   c_phi*s_th*c_psi + s_phi*s_psi;
          c_th*s_psi,   s_phi*s_th*s_psi + c_phi*c_psi,   c_phi*s_th*s_psi - s_phi*c_psi;
         -s_th,         s_phi*c_th,                       c_phi*c_th                     ];
end