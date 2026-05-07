function out = data_logger(mode, varargin)
% File Name: data_logger.m
% Position: Root > modules > visualization > data_logger.m
% Description: High-performance data logger with Interactive Toggle Dashboards.

    % --- [INIT MODE] ---
    if strcmp(mode, 'init')
        N = varargin{1}; x0 = varargin{2};
        hist.time_idx = 0; hist.x = zeros(12, N); hist.x(:,1) = x0;
        hist.pos_des = zeros(3, N); hist.vel_des = zeros(3, N); hist.acc_des = zeros(3, N); hist.euler_des = zeros(3, N);
        hist.u_phys_thrust = zeros(8, N); hist.u_phys_alpha = zeros(4, N); hist.u_phys_beta = zeros(4, N);
        hist.u_cmd_thrust = zeros(8, N); hist.u_cmd_alpha = zeros(4, N); hist.u_cmd_beta = zeros(4, N);
        out = hist; return;
    
    % --- [LOG MODE] ---
    elseif strcmp(mode, 'log')
        k = varargin{1}; x_curr = varargin{2}; act_phys = varargin{3}; act_cmd = varargin{4}; sp = varargin{5}; hist = varargin{6}; 
        if k > size(hist.x, 2), return; end
        hist.x(:, k) = x_curr;
        hist.pos_des(:, k) = sp.pos; hist.vel_des(:, k) = sp.vel; 
        if isfield(sp, 'acc'), hist.acc_des(:, k) = sp.acc; end
        hist.euler_des(:, k) = sp.euler;
        hist.u_phys_thrust(:, k) = act_phys.thrust; hist.u_phys_alpha(:, k) = act_phys.alpha; hist.u_phys_beta(:, k) = act_phys.beta;
        hist.u_cmd_thrust(:, k) = act_cmd.thrust; hist.u_cmd_alpha(:, k) = act_cmd.alpha; hist.u_cmd_beta(:, k) = act_cmd.beta;
        out = hist; return;
    
    % --- [PLOT SINGLE/MULTI MODE] ---
    elseif ismember(mode, {'plot', 'plot_multi'})
        is_multi = strcmp(mode, 'plot_multi');
        if is_multi
            histories = varargin{1}; sys = varargin{2}; active_tests = varargin{3};
            active_plots = if_else(length(varargin) > 3, varargin{4}, {'pos', 'att'});
            num_tests = length(histories);
            color_map = lines(num_tests);
            end_idx = find(histories{1}.x(1,:) ~= 0, 1, 'last');
            if isempty(end_idx), end_idx = length(histories{1}.x); end
            t = (0:end_idx-1) * sys.sim.dt;
        else
            hist = varargin{1}; sys = varargin{2};
            active_plots = if_else(length(varargin) > 2, varargin{3}, {'pos', 'att', 'act', 'servo', '3d'});
            num_tests = 1; histories = {hist}; active_tests = {{'name', 'Single Run'}};
            color_map = [0 0.447 0.741];
            end_idx = find(hist.x(1,:) ~= 0, 1, 'last');
            if isempty(end_idx), end_idx = length(hist.x); end
            t = (0:end_idx-1) * sys.sim.dt;
        end

        set(groot, 'DefaultAxesFontSize', 12);
        set(groot, 'DefaultTextFontSize', 12); % Áp dụng cho title, label
        set(groot, 'DefaultLegendFontSize', 12);
        
        hFig = figure('Name', 'OVAP-X1 Interactive Dashboard', 'Color', 'w', 'Units', 'normalized', 'Position', [0.05 0.05 0.9 0.85]);
        tgroup = uitabgroup('Parent', hFig);

        % --- MODULE 1: POSITION (X, Y, Z) ---
        if ismember('pos', active_plots)
            tabPos = uitab('Parent', tgroup, 'Title', '1. Position');
            % [SỬA]: Đổi nhãn từ 'Down Z' thành 'Altitude Z' để trực quan hơn
            labels = {'North X (m)', 'East Y (m)', 'Altitude Z (m)'}; 
            
            for row = 1:3
                ax = axes('Parent', tabPos, 'Position', [0.08 1.0-row*0.3 0.88 0.22]); 
                hold(ax, 'on'); grid(ax, 'on'); ylabel(ax, labels{row});
                
                % [SỬA]: Tạo hệ số đảo dấu. Nếu là trục Z (row 3) thì nhân -1
                sign_mod = 1;
                if row == 3
                    sign_mod = -1;
                end
                
                for i = 1:num_tests
                    plot(ax, t, sign_mod * histories{i}.x(row, 1:end_idx), ...
                         'Color', color_map(i,:), 'LineWidth', 1.5, 'DisplayName', active_tests{i}.name);
                end
                
                plot(ax, t, sign_mod * histories{1}.pos_des(row, 1:end_idx), ...
                     'k--', 'LineWidth', 1.2, 'DisplayName', 'Setpoint');
                     
                if row == 3, xlabel(ax, 'Time (s)'); end
                add_y_margin(ax); 
                setup_interactive_legend(ax);
            end
        end

        % --- MODULE 2: ATTITUDE (Roll, Pitch, Yaw) ---
        if ismember('att', active_plots)
            tabAtt = uitab('Parent', tgroup, 'Title', '2. Attitude');
            labels = {'Roll (deg)', 'Pitch (deg)', 'Yaw (deg)'};
            
            % [BỔ SUNG V2.6]: Xử lý mượt dữ liệu (Stitch & Unwrap) trước khi vẽ
            % Tạo một cell array chứa dữ liệu Attitude đã được làm mượt cho từng Test
            smooth_att = cell(1, num_tests);
            for i = 1:num_tests
                raw_att = histories{i}.x(7:9, 1:end_idx); % Trích xuất Roll, Pitch, Yaw thô
                smooth_att{i} = stitch_euler_history(raw_att); % Lọc qua bộ màng lọc Hậu kỳ
            end
            
            for row = 1:3
                ax = axes('Parent', tabAtt, 'Position', [0.08 1.0-row*0.3 0.88 0.22]); hold(ax, 'on'); grid(ax, 'on'); ylabel(ax, labels{row});
                
                for i = 1:num_tests
                    % [ĐÃ SỬA]: Vẽ từ smooth_att thay vì histories gốc
                    plot(ax, t, rad2deg(smooth_att{i}(row, :)), 'Color', color_map(i,:), 'LineWidth', 1.5, 'DisplayName', active_tests{i}.name);
                end
                
                plot(ax, t, rad2deg(histories{1}.euler_des(row, 1:end_idx)), 'k--', 'LineWidth', 1.2, 'DisplayName', 'Setpoint');
                
                if row == 3, xlabel(ax, 'Time (s)'); end
                add_y_margin(ax); 
                setup_interactive_legend(ax);
            end
        end

        % --- MODULE 3: ACTUATORS (Thrust & Servo Commands) ---
        if ismember('act', active_plots)
            for i = 1:num_tests
                test_name = active_tests{i}.name;
                % Tạo tab riêng cho từng bộ phân bổ/điều khiển
                tabAct = uitab('Parent', tgroup, 'Title', ['3. Actuators (', test_name, ')']);
                h_data = histories{i}; 
                
                ax1 = axes('Parent', tabAct, 'Position', [0.1 0.7 0.85 0.22]); hold(ax1, 'on');
                plot(ax1, t, rad2deg(h_data.u_phys_alpha(1,:)), 'r', 'LineWidth', 1.2, 'DisplayName', 'M1 (FR)');
                plot(ax1, t, rad2deg(h_data.u_phys_alpha(2,:)), 'g', 'LineWidth', 1.2, 'DisplayName', 'M2 (RL)');
                plot(ax1, t, rad2deg(h_data.u_phys_alpha(3,:)), 'b', 'LineWidth', 1.2, 'DisplayName', 'M3 (FL)');
                plot(ax1, t, rad2deg(h_data.u_phys_alpha(4,:)), 'k', 'LineWidth', 1.2, 'DisplayName', 'M4 (RR)');
                grid(ax1, 'on'); ylabel(ax1, 'Alpha (deg)'); title(ax1, ['Servo Tilt: Pitch - ', test_name]); 
                add_y_margin(ax1); setup_interactive_legend(ax1);
                
                ax2 = axes('Parent', tabAct, 'Position', [0.1 0.4 0.85 0.22]); hold(ax2, 'on');
                plot(ax2, t, rad2deg(h_data.u_phys_beta(1,:)), 'r', 'LineWidth', 1.2, 'DisplayName', 'M1 (FR)');
                plot(ax2, t, rad2deg(h_data.u_phys_beta(2,:)), 'g', 'LineWidth', 1.2, 'DisplayName', 'M2 (RL)');
                plot(ax2, t, rad2deg(h_data.u_phys_beta(3,:)), 'b', 'LineWidth', 1.2, 'DisplayName', 'M3 (FL)');
                plot(ax2, t, rad2deg(h_data.u_phys_beta(4,:)), 'k', 'LineWidth', 1.2, 'DisplayName', 'M4 (RR)');
                grid(ax2, 'on'); ylabel(ax2, 'Beta (deg)'); title(ax2, ['Servo Tilt: Roll - ', test_name]);
                add_y_margin(ax2); setup_interactive_legend(ax2);
                
                ax3 = axes('Parent', tabAct, 'Position', [0.1 0.1 0.85 0.22]); hold(ax3, 'on');
                colors = {'r','g','b','k'};
                for m = 1:4
                    plot(ax3, t, h_data.u_phys_thrust(m,:), 'Color', colors{m}, 'LineStyle', '-', 'DisplayName', ['Top M', num2str(m)]);
                    plot(ax3, t, h_data.u_phys_thrust(m+4,:), 'Color', colors{m}, 'LineStyle', '--', 'DisplayName', ['Bot M', num2str(m+4)]);
                end
                grid(ax3, 'on'); ylabel(ax3, 'Force (N)'); title(ax3, ['Coaxial Thrust (Solid: Top, Dashed: Bot) - ', test_name]); xlabel(ax3, 'Time (s)');
                add_y_margin(ax3); setup_interactive_legend(ax3);
            end
        end

        % --- MODULE 4: SERVO ANALYSIS ---
        if ismember('servo', active_plots)
            for i = 1:num_tests
                test_name = active_tests{i}.name;
                % Tạo tab riêng cho từng bộ phân bổ/điều khiển
                tabServo = uitab('Parent', tgroup, 'Title', ['4. Servo (', test_name, ')']);
                h_data = histories{i};
                
                alpha_deg = rad2deg(h_data.u_phys_alpha);
                alpha_vel = [zeros(4,1), diff(alpha_deg, 1, 2) ./ sys.sim.dt];
                diff_thrust = h_data.u_phys_thrust(1:4, :) - h_data.u_phys_thrust(5:8, :);
                
                ax1 = axes('Parent', tabServo, 'Position', [0.1 0.7 0.85 0.22]); hold(ax1, 'on');
                plot(ax1, t, alpha_deg, 'LineWidth', 1.5);
                title(ax1, ['Biên độ góc xoay Servo \alpha - ', test_name], 'FontWeight', 'bold');
                ylabel(ax1, 'Angle (deg)'); grid(ax1, 'on');
                add_y_margin(ax1); setup_interactive_legend(ax1);
                
                ax2 = axes('Parent', tabServo, 'Position', [0.1 0.4 0.85 0.22]); hold(ax2, 'on');
                plot(ax2, t, alpha_vel, 'LineWidth', 1.5);
                title(ax2, ['Vận tốc xoay Servo d\alpha/dt - ', test_name], 'FontWeight', 'bold');
                ylabel(ax2, 'Velocity (deg/s)'); grid(ax2, 'on');
                add_y_margin(ax2); setup_interactive_legend(ax2);
                
                ax3 = axes('Parent', tabServo, 'Position', [0.1 0.1 0.85 0.22]); hold(ax3, 'on');
                plot(ax3, t, diff_thrust, 'LineWidth', 1.5);
                title(ax3, ['Chênh lệch lực đẩy Trên-Dưới (\Delta Thrust) - ', test_name], 'FontWeight', 'bold');
                ylabel(ax3, '\Delta Thrust (N)'); xlabel(ax3, 'Time (s)'); grid(ax3, 'on');
                add_y_margin(ax3); setup_interactive_legend(ax3);
            end
        end

        % --- MODULE 5: 3D VISUALIZATION ---
        if ismember('3d', active_plots) && ~is_multi
            visualize_3d(histories{1}, sys, t);
        end
        
        out = []; return;
    end
end

%% ================= HÀM HỖ TRỢ (HELPER FUNCTIONS) =================

function setup_interactive_legend(ax)
    % Cấu hình Legend thông minh: Click vào nhãn để ẩn/hiện nét vẽ tương ứng
    hL = legend(ax, 'Location', 'bestoutside', 'Interpreter', 'none');
    set(hL, 'ItemHitFcn', @cb_toggle_line);
end

function cb_toggle_line(~, evnt)
    % Xử lý ẩn/hiện nét vẽ và TỰ ĐỘNG SCALE lại trục Y để nhìn rõ dữ liệu còn lại
    if strcmp(evnt.Peer.Visible, 'on')
        evnt.Peer.Visible = 'off';
    else
        evnt.Peer.Visible = 'on';
    end
    
    % Tự động Scale lại trục Y dựa trên các nét vẽ còn hiển thị
    ax = evnt.Peer.Parent;
    lines = findobj(ax, 'Type', 'line', 'Visible', 'on');
    if ~isempty(lines)
        all_data = [];
        for j = 1:length(lines)
            all_data = [all_data, lines(j).YData];
        end
        if ~isempty(all_data)
            y_min = min(all_data); y_max = max(all_data);
            span = y_max - y_min;
            if span < 1e-6, span = 1.0; end
            ylim(ax, [y_min - 0.15*span, y_max + 0.15*span]);
        end
    end
end

function add_y_margin(ax)
    yl = ylim(ax);
    span = yl(2) - yl(1);
    if span < 1e-6, span = 1.0; end
    ylim(ax, [yl(1) - 0.15*span, yl(2) + 0.15*span]);
end

function val = if_else(condition, true_val, false_val)
    if condition, val = true_val; else, val = false_val; end
end
function euler_stitched = stitch_euler_history(euler_history)
    % euler_history: Kích thước [3 x N_steps] (Roll, Pitch, Yaw theo radian)
    N = size(euler_history, 2);
    euler_stitched = euler_history;
    is_flipped = false;

    for i = 2:N
        % [BẢN VÁ TỐI THƯỢNG]: Tính "Khoảng cách góc ngắn nhất" bằng atan2(sin, cos)
        % Điều này triệt tiêu hoàn toàn các bước nhảy +-360 độ ảo do nhiễu ở vùng biên.
        delta_roll = euler_history(1, i) - euler_history(1, i-1);
        delta_yaw  = euler_history(3, i) - euler_history(3, i-1);
        
        d_roll_raw = atan2(sin(delta_roll), cos(delta_roll));
        d_yaw_raw  = atan2(sin(delta_yaw), cos(delta_yaw));

        % Bước nhảy của Lật góc Pitch (Gimbal Flip) luôn tạo ra sai số thực sự là +-180 độ (pi rad).
        % Nếu dao động Roll/Yaw là nhiễu, d_roll_raw lúc này chỉ còn khoảng 2 độ (0.03 rad) -> Bỏ qua.
        if abs(d_roll_raw) > 1.5 && abs(d_yaw_raw) > 1.5
            is_flipped = ~is_flipped;
        end

        % Khâu đồ thị
        if is_flipped
            euler_stitched(2, i) = sign(euler_history(2, i)) * pi - euler_history(2, i);
            euler_stitched(1, i) = euler_history(1, i) - sign(euler_history(1, i)) * pi;
            euler_stitched(3, i) = euler_history(3, i) - sign(euler_history(3, i)) * pi;
        end
    end

    % Unwrap chuẩn của MATLAB để làm mượt các vòng xoay nhào lộn
    euler_stitched(1, :) = unwrap(euler_stitched(1, :));
    euler_stitched(2, :) = unwrap(euler_stitched(2, :));
    euler_stitched(3, :) = unwrap(euler_stitched(3, :));
end