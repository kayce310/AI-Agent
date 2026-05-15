% Script trích xuất TOÀN BỘ hình học từ visualize_3d.m ra file STL
clc; clear;

disp('Đang tạo và xuất các khối 3D...');

% ================= 1. THÂN MÁY BAY + MŨI ĐỎ =================
R_fuse = 0.055; L_cyl = 0.40;
[v_fuse, f_fuse] = create_aero_fuselage(R_fuse, L_cyl);

R_nose = 0.02; L_nose = 0.05;
[v_nose, f_nose] = create_cylinder(R_nose, L_nose, 1, 16);
is_front = v_nose(:,1) > 0;
v_nose(is_front, 2:3) = 0; % Vót nhọn
nose_offset = L_cyl/2 + R_fuse*2.0;
v_nose(:,1) = v_nose(:,1) + nose_offset;

% Gộp Thân và Mũi thành 1 khối nguyên khối
v_body_full = [v_fuse; v_nose];
f_body_full = [f_fuse; f_nose + size(v_fuse, 1)];
stlwrite(triangulation(f_body_full, v_body_full), 'ovap_1_fuselage_with_nose.stl');

% ================= 2. NGÀM CHỮ U (ĐÃ MỞ RỘNG GIỐNG AERIX) =================
% Cánh quạt đường kính 0.18m. Ta mở ngàm ra 0.22m để mỗi bên dư 2cm khe hở an toàn.
u_len = 0.24;   % Cũ: 0.16 -> Mới: 0.22
u_wid = 0.14;   % Cũ: 0.09 -> Mới: 0.14 (Làm vòng cung sâu hơn, vuốt dài ra sau)
r_tube = 0.018; % Cũ: 0.015 -> Mới: 0.018 (Ống ngàm to ra một chút nhìn sẽ cứng cáp hơn)

% Ngàm Bên Phải (Nhánh 1, 4)
[v_u_R, f_u_R] = create_outward_u(u_len, u_wid, r_tube, 1);
stlwrite(triangulation(f_u_R, v_u_R), 'ovap_2_ubracket_Right.stl');

% Ngàm Bên Trái (Nhánh 2, 3)
[v_u_L, f_u_L] = create_outward_u(u_len, u_wid, r_tube, -1);
stlwrite(triangulation(f_u_L, v_u_L), 'ovap_3_ubracket_Left.stl');

% ================= 3. CỤM ĐỘNG CƠ ĐỒNG TRỤC (KÈM CHÓP NHỌN) =================
% ---------- Thông số hình học ----------
h_top = 0.01;          % dịch motor trên
h_bot = 0.01;          % dịch motor dưới
R_mot = 0.02;           % bán kính motor
L_mot = 0.018;           % chiều cao motor
shaft_R = 0.012;        % bán kính trục
shaft_L = 0.006;         % chiều dài trục
cone_R = 0.012;         % bán kính đáy cone
cone_H = 0.01;         % chiều cao cone

% ---------- Motor trên ----------
[v_mot_top, f_mot_top] = create_cylinder(R_mot, L_mot, 3, 24);
v_mot_top(:,3) = v_mot_top(:,3) - h_top;

% ---------- Motor dưới ----------
[v_mot_bot, f_mot_bot] = create_cylinder(R_mot, L_mot, 3, 24);
v_mot_bot(:,3) = v_mot_bot(:,3) + h_bot;

% ---------- Trục giữa ----------
[v_mot_mid, f_mot_mid] = create_cylinder(shaft_R, shaft_L, 3, 20);

% ---------- Cone motor trên (Mũi nhọn hướng LÊN trên, chiều âm Z) ----------
[v_cone_top, f_cone_top] = create_cone(cone_R, cone_H, 24);
v_cone_top(:,3) = -v_cone_top(:,3); % Đảo mũi chóp lên trên
v_cone_top(:,3) = v_cone_top(:,3) - h_top - L_mot/2; % Đặt lên nóc motor trên
f_cone_top = [f_cone_top(:,1), f_cone_top(:,3), f_cone_top(:,2)]; % Sửa lại mặt (Normals)

% ---------- Cone motor dưới (Mũi nhọn hướng XUỐNG dưới, chiều dương Z) ----------
[v_cone_bot, f_cone_bot] = create_cone(cone_R, cone_H, 24);
v_cone_bot(:,3) = v_cone_bot(:,3) + h_bot + L_mot/2; % Đặt xuống đáy motor dưới

% ---------- Ghép mesh ----------
v_coax = [
    v_mot_top
    v_mot_bot
    v_mot_mid
    v_cone_top
    v_cone_bot
];

f_coax = [
    f_mot_top
    f_mot_bot + size(v_mot_top,1)
    f_mot_mid + size(v_mot_top,1) + size(v_mot_bot,1)
    f_cone_top + size(v_mot_top,1) + size(v_mot_bot,1) + size(v_mot_mid,1)
    f_cone_bot + size(v_mot_top,1) + size(v_mot_bot,1) + size(v_mot_mid,1) + size(v_cone_top,1)
];

% ---------- Xuất STL ----------
stlwrite(triangulation(f_coax, v_coax),'ovap_4_coaxial_motor.stl');
disp('STL created successfully');

% ================= 4. ĐĨA CÁNH QUẠT =================
[v_prop, f_prop] = create_disk(0.09, 24);
stlwrite(triangulation(f_prop, v_prop), 'ovap_5_propeller.stl');

disp('HOÀN TẤT! Đã xuất 5 file .STL vào thư mục hiện tại.');

%% ================= CÁC HÀM TẠO HÌNH (LOCAL FUNCTIONS) =================
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
function [V,F] = create_cone(radius, height, n)

theta = linspace(0,2*pi,n+1)';
theta(end) = [];

x = radius*cos(theta);
y = radius*sin(theta);
z = zeros(size(theta));

base = [x y z];
tip = [0 0 height];

V = [base; tip];

F = [];

for i = 1:n-1
    F = [F; i i+1 n+1];
end

F = [F; n 1 n+1];

end