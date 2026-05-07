function target = mission_manager(t, mission_type, params)
% File Name: mission_manager.m
% Description: Cung cấp các quỹ đạo thử nghiệm khả năng độc lập Vị trí & Tư thế.

    % =====================================================================
    % 0. THÔNG SỐ MẶC ĐỊNH
    % =====================================================================
    if nargin < 2, mission_type = 0; end
    if nargin < 3
        params.v_forward = 2.0;  % Vận tốc tiến (m/s)
        params.radius    = 5.0;  % Bán kính/Biên độ (m)
        params.omega     = 0.4;  % Tần số quỹ đạo (rad/s)
        params.z_base    = -5.0; % Độ cao cơ sở
    end

    target.pos   = [0; 0; 0];
    target.euler = [0; 0; 0];
    t_flight = max(0, t - 5.0); % Bắt đầu tính quỹ đạo sau 5s cất cánh

    switch mission_type
        case 1
            % -------------------------------------------------------------
            % [LOẠI 1]: QUỸ ĐẠO MẮT BÃO (ORBIT WITH CENTER-FOCUS YAW)
            % Bay vòng tròn nhưng mũi (Yaw) luôn chĩa vào tâm (0,0).
            % -------------------------------------------------------------
            target.pos(1) = params.radius * cos(params.omega * t_flight);
            target.pos(2) = params.radius * sin(params.omega * t_flight);
            target.pos(3) = params.z_base;
            
            % Ép Yaw chĩa vào tâm: Vector từ Current_Pos đến (0,0)
            % Hướng ngược lại với vector vị trí (vị trí là ra xa tâm)
            target.euler(3) = atan2(-target.pos(2), -target.pos(1));

        case 2
            % -------------------------------------------------------------
            % [LOẠI 2]: CUA NGANG (STRAFING / CRAB WALK)
            % Bay thẳng trục X nhưng mặt quay vuông góc sang trục Y.
            % -------------------------------------------------------------
            target.pos(1) = params.v_forward * t_flight;
            target.pos(2) = 0;
            target.pos(3) = params.z_base;
            
            % Ép Yaw nhìn sang ngang (90 độ) trong khi đang bay tới
            target.euler(3) = pi/2; 

        case 3
            % -------------------------------------------------------------
            % [LOẠI 3]: BAY THẲNG + ROLL DAO ĐỘNG (±90 DEG)
            % Bay thẳng X, mặt nhìn thẳng nhưng thân Roll liên tục.
            % -------------------------------------------------------------
            target.pos(1) = params.v_forward * t_flight;
            target.pos(2) = 0;
            target.pos(3) = params.z_base;
            
            % Yaw nhìn thẳng theo hướng tiến
            target.euler(3) = 0;
            
            % Roll dao động hình sin trong khoảng ±90 độ (pi/2)
            % Tần số dao động nhanh gấp đôi tần số quỹ đạo để thấy rõ hiệu ứng
            target.euler(1) = deg2rad(80) * sin(params.omega * 2 * t_flight);

        case 4
            % -------------------------------------------------------------
            % [LOẠI 4]: LƯỢN SÓNG 3D (3D CORKSCREW / HELIX WAVE)
            % Bay thẳng X, đồng thời dao động hình sin trên cả Y và Z.
            % Mô phỏng quỹ đạo: x tăng dần, y dao động (-2 đến 2), z dao động (5 đến 7)
            % -------------------------------------------------------------
            % X: Tiến đều
            target.pos(1) = params.v_forward * t_flight;
            
            % Y: Lượn sóng ngang (Biên độ radius)
            target.pos(2) = params.radius * sin(params.omega * t_flight);
            
            % Z: Lượn sóng dọc (Dao động quanh z_base)
            % Để giống ví dụ của bạn (từ 5 lên 7 rồi về 5), ta dùng hàm -cos 
            % và cộng thêm biên độ để z luôn bắt đầu từ z_base và nhô lên.
            % Biên độ Z ở đây giả sử bằng 1/2 biên độ Y (tùy bạn chỉnh)
            z_amplitude = params.radius * 0.5; 
            target.pos(3) = params.z_base - z_amplitude * (1 - cos(params.omega * t_flight * 2));
            
            % --- Tư thế ---
            % Cách 1: Mặt luôn nhìn thẳng (Test Vectoring thần thánh)
            target.euler = [0; 0; 0];
            
            % Cách 2 (Tùy chọn): Mũi luôn hướng theo quỹ đạo 3D (Bỏ comment để dùng)
            % dx = params.v_forward;
            % dy = params.radius * params.omega * cos(params.omega * t_flight);
            % dz = -z_amplitude * params.omega * 2 * sin(params.omega * t_flight * 2);
            % target.euler(3) = atan2(dy, dx);     % Yaw bám quỹ đạo ngang
            % target.euler(2) = atan2(-dz, sqrt(dx^2+dy^2)); % Pitch bám quỹ đạo dọc

        otherwise
            % Mặc định: Giữ nguyên logic Waypoint cũ nếu type=0
            if t < 5.0   
                target.pos = [0; 0; -5.0];
                target.euler = [0; 0; 0];
            elseif t < 15.0
                target.pos      = [0; 10; -5.0]; 
                target.euler    = deg2rad([0; 0; 0]);
            elseif t < 20.0
                target.pos      = [10; 0; -5.0]; 
                target.euler    = deg2rad([0; 0; 0]);
            else
                target.pos      = [0; 0; -5.0]; 
                target.euler    = deg2rad([0; 80; 0]);
            end
    end
    
    % Giai đoạn cất cánh an toàn (0-5s)
    if t < 5.0
        target.pos = [0; 0; params.z_base * (t/5.0)];
        target.euler = [0; 0; 0];
    end
end