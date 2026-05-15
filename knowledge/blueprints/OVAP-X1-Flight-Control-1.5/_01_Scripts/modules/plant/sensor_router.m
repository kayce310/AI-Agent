function meas = sensor_router(kinematics_mode, x_true, use_noise, varargin)
% Cập nhật: Tự động kích thước đầu ra dựa trên số lượng tham số đầu vào
    
    output_format = 'legacy_12';
    if nargin >= 4, output_format = varargin{1}; end
    
    if strcmp(kinematics_mode, 'quat')
        if strcmp(output_format, 'native_13')
            meas = x_true; % Truyền thẳng 13 biến cho Não PX4
        else
            % Dịch an toàn về 12 biến cho Logger
            q = x_true(7:10); q = q / norm(q); qw=q(1); qx=q(2); qy=q(3); qz=q(4);
            
            pitch = asin(max(min(2*(qw*qy - qz*qx), 1), -1));
            roll  = atan2(2*(qw*qx + qy*qz), 1 - 2*(qx^2 + qy^2));
            yaw   = atan2(2*(qw*qz + qx*qy), 1 - 2*(qy^2 + qz^2));
                        
            x_legacy = [x_true(1:6); roll; pitch; yaw; x_true(11:13)];
            meas = sensor_model(x_legacy, use_noise);
        end
        
    elseif strcmp(kinematics_mode, 'dcm')
        % (Giữ nguyên đoạn code DCM cũ của bạn ở đây...)
        R_eb = reshape(x_true(7:15), 3, 3);
        [U, ~, V] = svd(R_eb); 
        det_UV = det(U * V');
        R_eb = U * diag([1, 1, det_UV]) * V'; 
        pitch = asin(max(min(-R_eb(3,1), 1), -1));
        if abs(cos(pitch)) > 1e-4
            roll = atan2(R_eb(3,2), R_eb(3,3));
            yaw  = atan2(R_eb(2,1), R_eb(1,1));
        else
            roll = 0; 
            yaw  = atan2(-R_eb(1,2), R_eb(2,2));
        end
        x_legacy = [x_true(1:6); roll; pitch; yaw; x_true(16:18)];
        meas = sensor_model(x_legacy, use_noise);
        
    else
        meas = sensor_model(x_true, use_noise);
    end
end