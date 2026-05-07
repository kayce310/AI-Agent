function visualize_3d(hist, sys, t_arr)
% File Name: visualize_3d.m
% Position: Root > modules > visualization > visualize_3d.m
% Description: Interactive 3D Digital Twin with Deadband Camera Tracking
    %% ================= PARAMETERS =================
    UI_BG_COLOR     = [0.94 0.94 0.94]; 
    AXES_BG_COLOR   = [1 1 1];          
    PANEL_BG_COLOR  = [0.9 0.9 0.9];
    TRAIL_COLOR     = 'b';              
    TRAIL_WIDTH     = 1.5;
    THRUST_SCALE    = 0.05;
    PLAY_SPEED_INIT = 2;
    
    pos_n = hist.x(1, :); pos_e = hist.x(2, :); pos_d = hist.x(3, :); pos_alt = -pos_d;
    
    % Tính toán giới hạn tổng (cả hành trình +- 2m)
    max_xy = max(max(abs(pos_e)), max(abs(pos_n))) + 2;
    max_z  = max(max(pos_alt), 1) + 2;
    max_span = max(max_xy, max_z); 
    
    %% ================= SETUP FIGURE & AXES =================
    hFig = figure('Name', 'OVAP-X1 Digital Twin', 'Color', UI_BG_COLOR, ...
        'Units', 'normalized', 'Position', [0.1 0.1 0.8 0.8], 'MenuBar', 'figure', 'ToolBar', 'figure'); 
    ax = axes('Parent', hFig, 'Color', AXES_BG_COLOR, 'XColor', 'k', 'YColor', 'k', 'ZColor', 'k', ...
        'Units', 'normalized', 'Position', [0.25 0.15 0.7 0.85]); 
    
    hold(ax, 'on'); grid(ax, 'on'); view(ax, 3);
    xlabel(ax, 'East (m)'); ylabel(ax, 'North (m)'); zlabel(ax, 'Alt (m)'); 
    
    hRotate = rotate3d(hFig); set(hRotate, 'Enable', 'on');
    hZoom = zoom(hFig); set(hZoom, 'Enable', 'on');
    axis(ax, 'equal'); 
    
    hGround = surf(ax, zeros(2), zeros(2), zeros(2), 'FaceColor', [0.85 0.85 0.85], 'EdgeColor', [0.7 0.7 0.7], 'FaceAlpha', 0.5);
    
    %% ================= GEOMETRY GENERATION =================
    pivots_b = sys.geo.r'; 
    R_fuse = 0.055; L_cyl = 0.40;   
    [v_fuse, f_fuse] = create_aero_fuselage(R_fuse, L_cyl);
    hBody = patch('Parent', ax, 'Vertices', v_fuse, 'Faces', f_fuse, 'FaceColor', [0.55 0.55 0.58], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
    
    % --- THÊM MŨI ĐỎ (NOSE CONE) ĐỂ NHẬN BIẾT PHÍA TRƯỚC ---
    % Tạo một hình nón nhỏ. Trong hệ tọa độ của nón, trục Z là chiều cao.
    % Chúng ta sẽ xoay nó để chỉ về phía trước (trục X)
    R_nose = 0.02; L_nose = 0.05;
    [v_nose, f_nose] = create_cylinder(R_nose, L_nose, 1, 16);
    % Vót nhọn đầu nón (phần có X dương lớn nhất)
    max_x = max(v_nose(:,1));
    is_front = v_nose(:,1) > 0;
    v_nose(is_front, 2:3) = 0; % Kéo các điểm phía trước về trục X để tạo chóp
    
    % Dịch chuyển mũi nón ra phía trước thân máy bay
    nose_offset = L_cyl/2 + R_fuse*2.0; % Tính toán vị trí phần mép trước của fuselage
    v_nose(:,1) = v_nose(:,1) + nose_offset;
    
    hNose = patch('Parent', ax, 'Vertices', v_nose, 'Faces', f_nose, 'FaceColor', [0.8 0.1 0.1], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
    % -------------------------------------------------------

    hArms = struct('Boom', [], 'UBracket', [], 'ShaftX', [], 'MotorTop', [], 'MotorBot', [], 'MotorMid', [], 'PropTop', [], 'PropBot', [], 'ThrustVec', [], 'v_boom_base', [], 'v_u_base', []);
    
    h_top = sys.geo.h_top; h_bot = sys.geo.h_bot;
    R_mot = 0.02; L_mot_half = 0.02; 
    [v_mot_top, f_mot_top] = create_cylinder(R_mot, L_mot_half, 3, 20); v_mot_top(:,3) = v_mot_top(:,3) - h_top; 
    [v_mot_bot, f_mot_bot] = create_cylinder(R_mot, L_mot_half, 3, 20); v_mot_bot(:,3) = v_mot_bot(:,3) - h_bot;
    [v_mot_mid, f_mot_mid] = create_cylinder(0.015, 0.01, 3, 16);
    [v_prop, f_prop] = create_disk(0.09, 24); 
    
    u_len = 0.16; u_wid = 0.09; r_tube = 0.015;
    [v_shaft, f_shaft] = create_cylinder(0.005, u_len, 1, 16); 
    
    for arm_idx = 1:4
        dir_y = sign(pivots_b(2,arm_idx)); 
        p_beta_b = pivots_b(:, arm_idx); p_alpha_b = p_beta_b; p_alpha_b(2) = p_alpha_b(2) - dir_y * u_wid;
        L_boom = abs(p_alpha_b(2)) - R_fuse; 
        
        [v_boom, f_boom] = create_cylinder(0.015, max(L_boom, 0.01), 2, 16);
        v_boom(:,1) = v_boom(:,1) + p_alpha_b(1); v_boom(:,2) = v_boom(:,2) + dir_y * (R_fuse + max(L_boom, 0)/2); v_boom(:,3) = v_boom(:,3) + p_alpha_b(3);
        
        hArms(arm_idx).v_boom_base = v_boom;
        hArms(arm_idx).Boom = patch('Parent', ax, 'Vertices', v_boom, 'Faces', f_boom, 'FaceColor', [0.25 0.25 0.28], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
        
        [v_u_init, f_u] = create_outward_u(u_len, u_wid, r_tube, dir_y);
        hArms(arm_idx).v_u_base = v_u_init;
        
        hArms(arm_idx).UBracket = patch('Parent', ax, 'Vertices', v_u_init, 'Faces', f_u, 'FaceColor', [0.7 0.7 0.72], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
        hArms(arm_idx).ShaftX   = patch('Parent', ax, 'Vertices', v_shaft, 'Faces', f_shaft, 'FaceColor', [0.5 0.5 0.55], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
        hArms(arm_idx).MotorTop = patch('Parent', ax, 'Vertices', v_mot_top, 'Faces', f_mot_top, 'FaceColor', [0.15 0.15 0.15], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
        hArms(arm_idx).MotorBot = patch('Parent', ax, 'Vertices', v_mot_bot, 'Faces', f_mot_bot, 'FaceColor', [0.15 0.15 0.15], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
        hArms(arm_idx).MotorMid = patch('Parent', ax, 'Vertices', v_mot_mid, 'Faces', f_mot_mid, 'FaceColor', [0.8 0.5 0.2], 'EdgeColor', 'none', 'FaceLighting', 'gouraud');
        hArms(arm_idx).PropTop  = patch('Parent', ax, 'Vertices', v_prop, 'Faces', f_prop, 'FaceColor', [0 0.4 0.8], 'FaceAlpha', 0.25, 'EdgeColor', 'none', 'FaceLighting', 'none');
        hArms(arm_idx).PropBot  = patch('Parent', ax, 'Vertices', v_prop, 'Faces', f_prop, 'FaceColor', [0 0.4 0.8], 'FaceAlpha', 0.25, 'EdgeColor', 'none', 'FaceLighting', 'none');
        hArms(arm_idx).ThrustVec= quiver3(ax, 0,0,0,0,0,1, 'Color', 'r', 'LineWidth', 1.5, 'MaxHeadSize', 0.5, 'AutoScale', 'off');
    end
    
    hTrail = plot3(ax, NaN, NaN, NaN, 'Color', TRAIL_COLOR, 'LineWidth', TRAIL_WIDTH);
    light('Parent', ax, 'Position', [5 5 20], 'Style', 'local'); lighting gouraud; material dull;
    
    %% ================= UI CONTROLS =================
    % Đặt mặc định khởi động vào luôn Mode 3 (Follow View) để xem cho rõ
    gui.idx = 1; gui.playing = false; gui.speed = PLAY_SPEED_INIT; gui.view_mode = 3; 
    
    hPanel = uipanel('Parent', hFig, 'BackgroundColor', PANEL_BG_COLOR, 'Units', 'normalized', 'Position', [0.02 0.02 0.96 0.10]);
    
    hBtnPlay = uicontrol('Parent', hPanel, 'Style', 'pushbutton', 'String', '▶ PLAY', ...
        'Units', 'normalized', 'Position', [0.01 0.2 0.08 0.6], 'Callback', @cb_play, 'FontWeight', 'bold');
        
    hSlider = uicontrol('Parent', hPanel, 'Style', 'slider', 'Min', 1, 'Max', length(t_arr), 'Value', 1, 'Units', 'normalized', 'Position', [0.10 0.3 0.55 0.4], 'Callback', @cb_slider);
    
    uicontrol('Parent', hPanel, 'Style', 'text', 'String', 'CAMERA:', 'Units', 'normalized', 'Position', [0.66 0.3 0.05 0.3], 'BackgroundColor', PANEL_BG_COLOR, 'FontWeight', 'bold');
    
    % [CẬP NHẬT]: Thêm Mode 3 (Follow View) vào Dropdown
    hModeDrop = uicontrol('Parent', hPanel, 'Style', 'popupmenu', ...
        'String', {'1: World View (Smart Bounds)', '2: Lab View (Fixed)', '3: Follow View (Iso / Fit)'}, ...
        'Value', gui.view_mode, 'Units', 'normalized', 'Position', [0.72 0.3 0.16 0.4], 'Callback', @cb_mode);
    
    uicontrol('Parent', hPanel, 'Style', 'edit', 'String', num2str(PLAY_SPEED_INIT), 'Units', 'normalized', 'Position', [0.90 0.3 0.05 0.4], 'Callback', @(s,~) set_speed(s), 'BackgroundColor', 'w');
    
    hInfo = uicontrol('Parent', hFig, 'Style', 'text', 'String', '', 'Units', 'normalized', ...
        'Position', [0.01 0.15 0.22 0.80], 'BackgroundColor', 'w', 'HorizontalAlignment', 'left', 'FontName', 'Consolas', 'FontSize', 10, 'FontWeight', 'bold');
        
    %% ================= CORE UPDATE FUNCTION =================
    function update_frame(k)
        if k > length(t_arr), k = length(t_arr); end
        T_NED2ENU = [0 1 0; 1 0 0; 0 0 -1];
        R_b2e = rot_mat(hist.x(7:9, k));
        
        pos_draw = [pos_e(k), pos_n(k), pos_alt(k)]; 
        
        if gui.view_mode == 2
            % [MODE 2]: Cố định UAV tại tâm, không vẽ mặt đất
            pos_draw = [0, 0, 0]; 
            set(hGround, 'Visible', 'off'); set(hTrail, 'Visible', 'off');
            xlim(ax, [-1 1]); ylim(ax, [-1 1]); zlim(ax, [-1 1]);
            
        elseif gui.view_mode == 3
            % [MODE 3 TÍNH NĂNG MỚI]: FOLLOW VIEW (ISO / FIT)
            set(hGround, 'Visible', 'on'); set(hTrail, 'Visible', 'on');
            
            % Khóa chặt camera vào UAV (Span 1.5m để phóng to hết cỡ vào UAV)
            span = 1.5; 
            cx = pos_draw(1); cy = pos_draw(2); cz = pos_draw(3);
            
            xlim(ax, [cx - span, cx + span]);
            ylim(ax, [cy - span, cy + span]);
            zlim(ax, [cz - span, cz + span]);
            
            % Khóa góc nhìn về chuẩn Isometric (Giống Simscape)
            view(ax, 37.5, 30); 
            
            % Rải lưới Ground chạy theo máy bay
            grid_step = 0.5;
            [Xg, Yg] = meshgrid(cx-span : grid_step : cx+span, cy-span : grid_step : cy+span);
            set(hGround, 'XData', Xg, 'YData', Yg, 'ZData', zeros(size(Xg)));
            
        else
            % [MODE 1]: WORLD VIEW (Deadband Tracking cũ của bạn)
            set(hGround, 'Visible', 'on'); set(hTrail, 'Visible', 'on');
            
            xl = xlim(ax); yl = ylim(ax); zl = zlim(ax);
            cx = mean(xl); cy = mean(yl); cz = mean(zl);
            span = max([(xl(2)-xl(1))/2, (yl(2)-yl(1))/2, (zl(2)-zl(1))/2]);
            
            if span < 1.5, span = 1.5; end           
            if span > max_span, span = max_span; end 
            
            margin = 1.5; 
            box_lim = max(0, span - margin);
            
            if pos_draw(1) > cx + box_lim, cx = pos_draw(1) - box_lim; end
            if pos_draw(1) < cx - box_lim, cx = pos_draw(1) + box_lim; end
            if pos_draw(2) > cy + box_lim, cy = pos_draw(2) - box_lim; end
            if pos_draw(2) < cy - box_lim, cy = pos_draw(2) + box_lim; end
            if pos_draw(3) > cz + box_lim, cz = pos_draw(3) - box_lim; end
            if pos_draw(3) < cz - box_lim, cz = pos_draw(3) + box_lim; end
            
            xlim(ax, [cx - span, cx + span]);
            ylim(ax, [cy - span, cy + span]);
            zlim(ax, [cz - span, cz + span]);
            
            grid_step = max(1, span/5);
            [Xg, Yg] = meshgrid(cx-span : grid_step : cx+span, cy-span : grid_step : cy+span);
            set(hGround, 'XData', Xg, 'YData', Yg, 'ZData', zeros(size(Xg)));
        end
        
        % Cập nhật Meshes
        set(hBody, 'Vertices', transform_mesh(v_fuse, R_b2e, pos_draw, T_NED2ENU));
        set(hNose, 'Vertices', transform_mesh(v_nose, R_b2e, pos_draw, T_NED2ENU)); % Cập nhật mũi đỏ
        set(hTrail, 'XData', pos_e(1:k), 'YData', pos_n(1:k), 'ZData', pos_alt(1:k));
        
        alphas = hist.u_phys_alpha(:, k); betas = hist.u_phys_beta(:, k); thrusts = hist.u_phys_thrust(:, k);
        for j = 1:4
            ang_alpha = alphas(j) * sys.servo.dir_alpha(j); 
            ang_beta  = betas(j)  * sys.servo.dir_beta(j);  
            R_a = [cos(ang_alpha) 0 sin(ang_alpha); 0 1 0; -sin(ang_alpha) 0 cos(ang_alpha)]; 
            R_b = [1 0 0; 0 cos(ang_beta) -sin(ang_beta); 0 sin(ang_beta) cos(ang_beta)];   
            
            p_alpha_b = pivots_b(:, j) - [0; sign(pivots_b(2,j)) * u_wid; 0];
            p_alpha_w = ((R_b2e * p_alpha_b)' * T_NED2ENU) + pos_draw;
            
            p_beta_b = p_alpha_b + R_a * [0; sign(pivots_b(2,j)) * u_wid; 0];
            p_beta_w = ((R_b2e * p_beta_b)' * T_NED2ENU) + pos_draw;
            
            set(hArms(j).Boom, 'Vertices', transform_mesh(hArms(j).v_boom_base, R_b2e, pos_draw, T_NED2ENU));
            set(hArms(j).UBracket, 'Vertices', transform_mesh(hArms(j).v_u_base, R_b2e * R_a, p_alpha_w, T_NED2ENU));
            
            R_total = R_b2e * R_a * R_b;
            set(hArms(j).ShaftX, 'Vertices', transform_mesh(v_shaft, R_total, p_beta_w, T_NED2ENU));
            set(hArms(j).MotorTop, 'Vertices', transform_mesh(v_mot_top, R_total, p_beta_w, T_NED2ENU));
            set(hArms(j).MotorBot, 'Vertices', transform_mesh(v_mot_bot, R_total, p_beta_w, T_NED2ENU));
            set(hArms(j).MotorMid, 'Vertices', transform_mesh(v_mot_mid, R_total, p_beta_w, T_NED2ENU));
            
            set(hArms(j).PropTop, 'Vertices', transform_mesh(v_prop, R_total, p_beta_w + ((R_total*[0;0;-h_top])'*T_NED2ENU), T_NED2ENU));
            set(hArms(j).PropBot, 'Vertices', transform_mesh(v_prop, R_total, p_beta_w + ((R_total*[0;0;-h_bot])'*T_NED2ENU), T_NED2ENU));
            
            f_vec = (R_total * [0;0;-1])' * T_NED2ENU; 
            scale = (thrusts(j) + thrusts(j+4)) * THRUST_SCALE;
            set(hArms(j).ThrustVec, 'XData', p_beta_w(1), 'YData', p_beta_w(2), 'ZData', p_beta_w(3), 'UData', f_vec(1)*scale, 'VData', f_vec(2)*scale, 'WData', f_vec(3)*scale);
        end
        
        v_body = hist.x(4:6, k); speed = norm(v_body); v_z = -v_body(3); 
        
        txt = sprintf(['--- FLIGHT DATA ---\n', ...
            'TIME : %.2f s\n', ...
            'ALT  : %.2f m\n', ...
            'SPEED: %.2f m/s\n', ...
            'Vz   : %+.2f m/s\n\n', ...
            '--- ATTITUDE ---\n', ...
            'ROLL : %5.1f°\n', ...
            'PITCH: %5.1f°\n', ...
            'YAW  : %5.1f°\n\n', ...
            '--- SERVO ANGLES ---\n', ...
            'M1(FR) α:%+5.1f° β:%+5.1f°\n', ...
            'M2(RL) α:%+5.1f° β:%+5.1f°\n', ...
            'M3(FL) α:%+5.1f° β:%+5.1f°\n', ...
            'M4(RR) α:%+5.1f° β:%+5.1f°'], ...
            t_arr(k), pos_alt(k), speed, v_z, ...
            rad2deg(hist.x(7,k)), rad2deg(hist.x(8,k)), rad2deg(hist.x(9,k)), ...
            rad2deg(alphas(1)), rad2deg(betas(1)), ...
            rad2deg(alphas(2)), rad2deg(betas(2)), ...
            rad2deg(alphas(3)), rad2deg(betas(3)), ...
            rad2deg(alphas(4)), rad2deg(betas(4)));
        set(hInfo, 'String', txt); 
        
        if ~gui.playing
            drawnow;
        end
    end
    %% ================= CALLBACKS =================
    function cb_mode(src, ~)
        gui.view_mode = get(src, 'Value'); 
        if gui.view_mode == 1
            % Khi vừa chuyển sang World View, bung khung hiển thị bằng Max Span
            cx = pos_e(gui.idx); cy = pos_n(gui.idx); cz = pos_alt(gui.idx);
            xlim(ax, [cx - max_span, cx + max_span]);
            ylim(ax, [cy - max_span, cy + max_span]);
            zlim(ax, [cz - max_span, cz + max_span]);
        end
        update_frame(gui.idx); 
    end
    
    function set_speed(src), val = str2double(get(src, 'String')); if ~isnan(val), gui.speed = val; end; end
    function cb_slider(src, ~), gui.playing = false; gui.idx = round(get(src, 'Value')); update_frame(gui.idx); end
    
    function cb_play(src, ~)
        if gui.playing
            gui.playing = false; 
            set(src, 'String', '▶ PLAY');
            return; 
        end
        
        gui.playing = true;
        set(src, 'String', '⏸ PAUSE');
        
        while gui.playing && gui.idx < length(t_arr)
            % [CHỐT AN TOÀN]: Thoát nếu cửa sổ bị đóng
            if ~isvalid(hFig)
                return;
            end
            
            tic; 
            gui.idx = min(gui.idx + gui.speed, length(t_arr)); 
            set(hSlider, 'Value', gui.idx); 
            update_frame(gui.idx); 
            
            time_left = 0.02 - toc; 
            if time_left > 0
                pause(time_left); 
            else
                drawnow; % Đảm bảo MATLAB nhận sự kiện (click nút Pause)
            end
        end
        
        if isvalid(hFig) && gui.idx >= length(t_arr)
            gui.playing = false; 
            set(src, 'String', '▶ PLAY'); 
        end
    end
    
    cb_mode(hModeDrop, []);
end 
%% ================= LOCAL FUNCTIONS =================
function v_out = transform_mesh(v_in, R, pos, T_NED2ENU)
    v_out = (v_in * R') * T_NED2ENU + pos;
end
function [V, F] = create_aero_fuselage(R, L_cyl)
    N_cir = 32; N_len = 20; Stretch = 2.0; 
    z_rear = linspace(-L_cyl/2 - R*Stretch, -L_cyl/2, N_len);
    r_rear = R * real(sqrt(1 - ((z_rear - (-L_cyl/2))/(R*Stretch)).^2));
    z_mid = linspace(-L_cyl/2, L_cyl/2, 10); r_mid = R * ones(1, 10);
    z_front = linspace(L_cyl/2, L_cyl/2 + R*Stretch, N_len);
    r_front = R * real(sqrt(1 - ((z_front - L_cyl/2)/(R*Stretch)).^2));
    Z_prof = [z_rear, z_mid(2:end), z_front(2:end)]'; R_prof = [r_rear, r_mid(2:end), r_front(2:end)]';
    theta = linspace(0, 2*pi, N_cir);
    X = R_prof * cos(theta); Y = R_prof * sin(theta); Z = repmat(Z_prof, 1, N_cir);
    [F, V] = surf2patch(X, Y, Z, 'triangles'); V = [V(:,3), V(:,2), -V(:,1)];
end
function [V, F] = create_outward_u(L, W, R_tube, dir_y)
    N_path = 20; N_tube = 16; theta = linspace(0, pi, N_path); 
    Px = (L/2) * cos(theta); Py = dir_y * W * (1 - sin(theta)); Pz = zeros(1, N_path); 
    Tx = -(L/2) * sin(theta); Ty = -dir_y * W * cos(theta); Tz = zeros(1, N_path);
    V = []; F = [];
    for i_path = 1:N_path
        T = [Tx(i_path), Ty(i_path), Tz(i_path)]; 
        if norm(T) > 1e-6, T = T / norm(T); else, T = [1,0,0]; end
        B = [0, 0, 1]; N_vec = cross(B, T); phi = linspace(0, 2*pi, N_tube+1)'; phi(end) = [];
        rx = Px(i_path) + R_tube * (cos(phi)*N_vec(1) + sin(phi)*B(1)); 
        ry = Py(i_path) + R_tube * (cos(phi)*N_vec(2) + sin(phi)*B(2)); 
        rz = Pz(i_path) + R_tube * (cos(phi)*N_vec(3) + sin(phi)*B(3)); 
        V = [V; rx, ry, rz];
    end
    for i_path = 1:(N_path-1)
        for j_tube = 1:N_tube
            jn = mod(j_tube, N_tube) + 1; 
            idx1 = (i_path-1)*N_tube + j_tube; idx2 = (i_path-1)*N_tube + jn; 
            idx3 = i_path*N_tube + jn; idx4 = i_path*N_tube + j_tube; 
            F = [F; idx1, idx2, idx3; idx1, idx3, idx4]; 
        end
    end
    [X, Y, Z] = sphere(12); [fc, vc] = surf2patch(X, Y, Z, 'triangles'); vc = vc * R_tube;
    V1 = vc + repmat([L/2, dir_y*W, 0], size(vc,1), 1); F = [F; fc + size(V,1)]; V = [V; V1];
    V2 = vc + repmat([-L/2, dir_y*W, 0], size(vc,1), 1); F = [F; fc + size(V,1)]; V = [V; V2];
end
function [v, f] = create_cylinder(R, L, axis_idx, N)
    [X, Y, Z] = cylinder(R, N); Z = Z * L - L/2; [f, v] = surf2patch(X, Y, Z, 'triangles');
    if axis_idx == 1, v = [v(:,3), v(:,2), -v(:,1)]; elseif axis_idx == 2, v = [v(:,1), v(:,3), -v(:,2)]; end
end
function [v, f] = create_disk(R, N)
    th = linspace(0, 2*pi, N)'; v = [0 0 0; R*cos(th) R*sin(th) zeros(N,1)]; f = [ones(N,1), (2:N+1)', [(3:N+1)'; 2]];
end
function R = rot_mat(e)
    ph=e(1); th=e(2); ps=e(3); cph=cos(ph); sph=sin(ph); cth=cos(th); sth=sin(th); cps=cos(ps); sps=sin(ps);
    R = [cth*cps, sph*sth*cps-cph*sps, cph*sth*cps+sph*sps; cth*sps, sph*sth*sps+cph*cps, cph*sth*sps-sph*cps; -sth, sph*cth, cph*cth];
end